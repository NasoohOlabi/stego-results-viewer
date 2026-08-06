import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

const SIDE_WING_REPO_PATH = resolve(process.cwd(), "..", "stego-side-wing");
const SIDE_WING_PATH = join(SIDE_WING_REPO_PATH, "output-results");
const LOCAL_PATH = join(process.cwd(), "output-results");
const METRICS_PATH = join(SIDE_WING_REPO_PATH, "metrics");
const E2E_RUNS_PATH = join(METRICS_PATH, "e2e_runs");
const SINGLE_POST_TWICE_RUNS_PATH = join(
	METRICS_PATH,
	"single_post_twice_no_cache_runs",
);

/** Every metrics subtree that may contain `output-results` sample dirs. */
const GENERATED_SCAN_ROOTS = [
	E2E_RUNS_PATH,
	join(METRICS_PATH, "model_ablation_runs"),
	join(METRICS_PATH, "feedback_runs"),
	join(METRICS_PATH, "angle_scan_runs"),
] as const;

const BUILT_IN_MAP: Record<string, string> = {
	"side-wing": SIDE_WING_PATH,
	local: LOCAL_PATH,
	"single-post-twice-no-cache": SINGLE_POST_TWICE_RUNS_PATH,
} as const;

const BUILT_IN_LABELS: Record<string, string> = {
	"side-wing": "Side Wing default",
	local: "Local (this repo)",
	"single-post-twice-no-cache": "Single-post-twice runs",
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

export function encodeGeneratedPath(path: string) {
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
		// Label from the path relative to metrics/, minus the trailing
		// "output-results": e.g. "e2e_runs/quality_100x_20260711 / balanced".
		const rel = relative(METRICS_PATH, resolved);
		const parts = rel.split(/[\\/]/).filter(Boolean).slice(0, -1);
		const runName = parts.slice(0, 2).join("/") || basename(resolved);
		const profileName = parts.length > 2 ? parts.slice(2).join(" / ") : null;
		const label = profileName ? `${runName} / ${profileName}` : runName;

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

/** Absolute path of side-wing's `metrics/` dir (for progress scanning). */
export function getMetricsPath(): string {
	return METRICS_PATH;
}

/** All discovered `output-results` dirs across every generated-run root. */
export async function findAllGeneratedOutputDirs(): Promise<string[]> {
	const found = await Promise.all(
		GENERATED_SCAN_ROOTS.map((root) => findGeneratedOutputDirs(root, 4)),
	);
	return found.flat();
}

export async function getResultSources(): Promise<ResultSource[]> {
	const defaults = await Promise.all(
		Object.entries(BUILT_IN_MAP).map(async ([id, path]) => {
			const stats = await stat(path).catch(() => null);
			return {
				id,
				label: BUILT_IN_LABELS[id] ?? id,
				path,
				isBuiltIn: true,
				kind: "default" as const,
				mtimeMs: stats?.mtimeMs ?? 0,
				fileCount: await getJsonFileCount(path),
			};
		}),
	);

	const generatedPaths = await findAllGeneratedOutputDirs();
	const generated = (
		await Promise.all(
			generatedPaths.map((path) => readOutputDirectorySource(path)),
		)
	)
		.filter((source): source is ResultSource => source !== null)
		// Sources with samples first (newest run first); empty dirs last.
		.sort(
			(a, b) =>
				Number(b.fileCount > 0) - Number(a.fileCount > 0) ||
				b.mtimeMs - a.mtimeMs,
		);

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
