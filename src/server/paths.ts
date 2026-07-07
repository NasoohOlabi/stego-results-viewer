import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

const SIDE_WING_REPO_PATH = resolve(process.cwd(), "..", "stego-side-wing");
const SIDE_WING_PATH = join(SIDE_WING_REPO_PATH, "output-results");
const LOCAL_PATH = join(process.cwd(), "output-results");
const E2E_RUNS_PATH = join(SIDE_WING_REPO_PATH, "metrics", "e2e_runs");
const SINGLE_POST_TWICE_RUNS_PATH = join(
	SIDE_WING_REPO_PATH,
	"metrics",
	"single_post_twice_no_cache_runs",
);

const BUILT_IN_MAP: Record<string, string> = {
	"side-wing": SIDE_WING_PATH,
	local: LOCAL_PATH,
	"single-post-twice-no-cache": SINGLE_POST_TWICE_RUNS_PATH,
} as const;

export interface ResultSource {
	id: string;
	label: string;
	path: string;
	isBuiltIn: boolean;
	kind: "default" | "generated";
	mtimeMs: number;
	fileCount: number;
}

function encodeGeneratedPath(path: string) {
	return `generated:${Buffer.from(path).toString("base64url")}`;
}

function decodeGeneratedPath(id: string) {
	if (!id.startsWith("generated:")) return null;
	try {
		return Buffer.from(id.slice("generated:".length), "base64url").toString(
			"utf-8",
		);
	} catch {
		return null;
	}
}

function assertGeneratedPath(path: string) {
	const resolved = resolve(path);
	const rel = relative(SIDE_WING_REPO_PATH, resolved);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		throw new Error(`Generated path is outside side-wing repo: ${path}`);
	}
	if (basename(resolved) !== "output-results") {
		throw new Error(`Generated path must point to output-results: ${path}`);
	}
	return resolved;
}

async function getJsonFileCount(path: string) {
	try {
		const entries = await readdir(path, { withFileTypes: true });
		return entries.filter(
			(entry) => entry.isFile() && entry.name.endsWith(".json"),
		).length;
	} catch {
		return 0;
	}
}

async function readOutputDirectorySource(
	path: string,
): Promise<ResultSource | null> {
	try {
		const resolved = assertGeneratedPath(path);
		const stats = await stat(resolved);
		const rel = relative(E2E_RUNS_PATH, resolved);
		const parts = rel.split(/[\\/]/).filter(Boolean);
		const runName = parts[0] ?? basename(resolved);
		const profileName = parts.length > 2 ? parts.at(-2) : null;
		const label = profileName
			? `${runName} / ${profileName} output-results`
			: `Latest run: ${runName}`;

		return {
			id: encodeGeneratedPath(resolved),
			label,
			path: resolved,
			isBuiltIn: false,
			kind: "generated",
			mtimeMs: stats.mtimeMs,
			fileCount: await getJsonFileCount(resolved),
		};
	} catch {
		return null;
	}
}

async function findGeneratedOutputDirs(root: string, maxDepth: number) {
	const found: string[] = [];

	async function walk(current: string, depth: number) {
		if (depth > maxDepth) return;
		let entries: Dirent[];
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const child = join(current, entry.name);
			if (entry.name === "output-results") {
				found.push(child);
				continue;
			}
			await walk(child, depth + 1);
		}
	}

	await walk(root, 0);
	return found;
}

export async function getResultSources(): Promise<ResultSource[]> {
	const defaults = await Promise.all(
		Object.entries(BUILT_IN_MAP).map(async ([id, path]) => {
			const stats = await stat(path).catch(() => null);
			return {
				id,
				label: id === "side-wing" ? "Side Wing default" : "Local",
				path,
				isBuiltIn: true,
				kind: "default" as const,
				mtimeMs: stats?.mtimeMs ?? 0,
				fileCount: await getJsonFileCount(path),
			};
		}),
	);

	const generatedPaths = await findGeneratedOutputDirs(E2E_RUNS_PATH, 3);
	const generated = (
		await Promise.all(
			generatedPaths.map((path) => readOutputDirectorySource(path)),
		)
	)
		.filter((source): source is ResultSource => source !== null)
		.sort((a, b) => b.mtimeMs - a.mtimeMs);

	return [...defaults, ...generated];
}

export function getResolvedPath(idOrPath: string): string {
	const builtIn = BUILT_IN_MAP[idOrPath];
	if (builtIn) return builtIn;

	const generatedPath = decodeGeneratedPath(idOrPath);
	if (generatedPath) {
		return assertGeneratedPath(generatedPath);
	}

	if (!isAbsolute(idOrPath)) {
		throw new Error(`Path must be absolute: ${idOrPath}`);
	}
	return resolve(idOrPath);
}
