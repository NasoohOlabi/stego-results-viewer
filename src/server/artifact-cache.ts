import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";

/**
 * Read-through cache for benchmark artifacts on local disk.
 *
 * Every comparison page is `force-dynamic` and derives its numbers from run
 * artifacts that are large (tens of MB) and rewritten only when a benchmark
 * finishes. Re-reading and re-parsing them per request is the single largest
 * cost in this app.
 *
 * The cache is keyed on the file's size and mtime rather than a TTL, so a
 * benchmark that rewrites an artifact invalidates it on the very next request
 * and a file that hasn't changed is never re-read. That makes it correct to
 * cache indefinitely — there is no staleness window to tune.
 *
 * Entries hold *derived* values, not raw text, so a caller that projects 40 MB
 * of JSONL down to the fields it renders keeps only the projection alive.
 */

type CacheEntry = {
	/** Identity of the file contents this value was derived from. */
	stamp: string;
	value: unknown;
};

const cache = new Map<string, CacheEntry>();

/**
 * Identity of a file's current contents, or null when it does not exist.
 * Size plus mtime is enough here: these artifacts are written by batch jobs,
 * never mutated in place within a millisecond.
 */
async function fileStamp(path: string): Promise<string | null> {
	try {
		const info = await stat(path);
		return `${info.size}:${info.mtimeMs}`;
	} catch {
		return null;
	}
}

/**
 * Derive a value from a file, reusing the previous result while the file is
 * unchanged. `derive` receives the file's text and runs only on a miss.
 *
 * Returns `fallback` without caching when the file is absent, so a missing
 * artifact stays cheap and a later benchmark run picks it up immediately.
 */
export async function deriveFromFile<T>(options: {
	path: string;
	/** Distinguishes two derivations over the same file. */
	as: string;
	derive: (text: string) => T;
	fallback: T;
}): Promise<T> {
	const { path, as, derive, fallback } = options;
	const stamp = await fileStamp(path);
	if (stamp === null) return fallback;

	const key = `${as}::${path}`;
	const hit = cache.get(key);
	if (hit?.stamp === stamp) {
		// Earned: each (`as`, path) pair is written with one T and only read as that T.
		return hit.value as T;
	}

	const value = derive(await readFile(path, "utf-8"));
	cache.set(key, { stamp, value });
	return value;
}

/** SHA-256 of the file bytes, cached until size or mtime changes. */
export async function readSha256Cached(
	filePath: string,
): Promise<string | null> {
	const stamp = await fileStamp(filePath);
	if (stamp === null) return null;
	const key = `sha256::${filePath}`;
	const hit = cache.get(key);
	if (hit?.stamp === stamp) {
		return hit.value as string;
	}
	const value = createHash("sha256")
		.update(await readFile(filePath))
		.digest("hex");
	cache.set(key, { stamp, value });
	return value;
}

/** Parse a JSON object file, cached on its contents. */
export function readJsonCached(
	path: string,
): Promise<Record<string, unknown> | null> {
	return deriveFromFile<Record<string, unknown> | null>({
		path,
		as: "json",
		fallback: null,
		derive: (text) => {
			try {
				const parsed: unknown = JSON.parse(text);
				return typeof parsed === "object" &&
					parsed !== null &&
					!Array.isArray(parsed)
					? (parsed as Record<string, unknown>)
					: null;
			} catch {
				return null;
			}
		},
	});
}

/**
 * Parse a JSONL file and project each row, caching only the projection.
 *
 * `project` returning null drops the row. Projecting at read time is what keeps
 * a 40 MB judgment file from becoming a 40 MB React payload: the fields a page
 * never renders are discarded before anything holds a reference to them.
 */
export function readJsonlCached<T>(
	path: string,
	as: string,
	project: (row: Record<string, unknown>) => T | null,
): Promise<T[]> {
	return deriveFromFile<T[]>({
		path,
		as: `jsonl:${as}`,
		fallback: [],
		derive: (text) => {
			const rows: T[] = [];
			for (const line of text.split("\n")) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				let parsed: unknown;
				try {
					parsed = JSON.parse(trimmed);
				} catch {
					continue;
				}
				if (typeof parsed !== "object" || parsed === null) continue;
				const projected = project(parsed as Record<string, unknown>);
				if (projected !== null) rows.push(projected);
			}
			return rows;
		},
	});
}

/**
 * Derive a value from a set of directories, reusing the previous result while
 * every directory's mtime and entry count are unchanged.
 *
 * Directory mtime moves when entries are added or removed, which is how these
 * prep and metrics trees actually change — a batch writes new post JSONs. It
 * does *not* move when an existing file is edited in place, so this is the
 * right key for append-style corpora and the wrong one for mutable files; use
 * `deriveFromFile` for those.
 */
export async function deriveFromDirectories<T>(options: {
	dirs: readonly string[];
	as: string;
	derive: () => Promise<T>;
}): Promise<T> {
	const { dirs, as, derive } = options;
	const stamps = await Promise.all(
		dirs.map(async (dir) => {
			try {
				const [info, entries] = await Promise.all([stat(dir), readdir(dir)]);
				return `${dir}@${info.mtimeMs}#${entries.length}`;
			} catch {
				return `${dir}@missing`;
			}
		}),
	);
	const stamp = stamps.join("|");
	const key = `dirs:${as}`;
	const hit = cache.get(key);
	if (hit?.stamp === stamp) {
		// Earned: each `as` key is written with one T and only read as that T.
		return hit.value as T;
	}

	const value = await derive();
	cache.set(key, { stamp, value });
	return value;
}

/**
 * Map with bounded concurrency.
 *
 * `Promise.all` over a directory listing opens every file at once; across ~950
 * entries that thrashes the filesystem and finishes slower than a small pool,
 * while a sequential `for await` wastes the parallelism entirely.
 */
export async function mapWithConcurrency<In, Out>(
	items: readonly In[],
	limit: number,
	map: (item: In, index: number) => Promise<Out>,
): Promise<Out[]> {
	const results = new Array<Out>(items.length);
	let cursor = 0;
	const workers = Array.from(
		{ length: Math.min(limit, items.length) },
		async () => {
			while (cursor < items.length) {
				const index = cursor++;
				const item = items[index];
				if (item === undefined) continue;
				results[index] = await map(item, index);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

/** Drop every cached entry. Exposed for the admin refresh endpoint. */
export function clearArtifactCache(): number {
	const size = cache.size;
	cache.clear();
	return size;
}
