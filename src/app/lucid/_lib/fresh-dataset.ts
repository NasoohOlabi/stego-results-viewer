import { open, readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
	deriveFromDirectories,
	mapWithConcurrency,
} from "~/server/artifact-cache";

/** Open file handles to keep in flight while scanning the corpus. */
const SCAN_CONCURRENCY = 32;

/** Newest angle artifacts rendered as sample cards. */
const SAMPLE_COUNT = 12;

const FRESH_ROOT = join(
	process.cwd(),
	"..",
	"stego-side-wing",
	"datasets",
	"prep_runs",
	"LUCID",
	"tangents_db_v1_fresh",
);

const EVALUATION_ROOT = join(
	process.cwd(),
	"..",
	"stego-side-wing",
	"metrics",
	"evaluation_campaigns",
	"lucid_fresh_6x_20260815",
);

const STAGES = ["data_load", "research", "angles"] as const;

type Stage = (typeof STAGES)[number];

interface CampaignStateFile {
	status?: string;
	pid?: number;
	started_at_utc?: string;
	deadline_utc?: string;
	updated_at_utc?: string;
	attempts?: Record<string, number>;
	last_batch?: {
		attempted?: number;
		succeeded?: number;
		failed?: number;
		finished_at_utc?: string;
	};
}

interface AngleValue {
	category?: unknown;
	tangent?: unknown;
	source_quote?: unknown;
}

interface AngleArtifact {
	angles_target_reached?: unknown;
	tangent_count?: unknown;
}

interface SampleFile {
	id?: unknown;
	title?: unknown;
	url?: unknown;
	search_results?: unknown;
	angles?: unknown;
	angle_artifact?: AngleArtifact;
}

export interface FreshWorker {
	stage: Stage;
	status: string;
	pid: number | null;
	alive: boolean;
	startedAt: string | null;
	deadline: string | null;
	updatedAt: string | null;
	attempts: number;
	lastSucceeded: number;
	lastFailed: number;
}

export interface FreshSample {
	postId: string;
	fileName: string;
	title: string;
	url: string | null;
	updatedAt: string;
	sourceCount: number;
	angleCount: number;
	targetReached: boolean;
	sourcePreview: string | null;
	angles: Array<{
		category: string;
		tangent: string;
		sourceQuote: string | null;
	}>;
}

export interface FreshDataset {
	root: string;
	counts: {
		fetched: number;
		researched: number;
		angles: number;
		outputs: number;
	};
	validation: {
		nonEmptyResearch: number;
		emptyResearch: number;
		fullAngleArtifacts: number;
		shortAngleArtifacts: number;
		invalidAngleJson: number;
		angleDistribution: Record<string, number>;
	};
	workers: FreshWorker[];
	samples: FreshSample[];
	evaluation: {
		eligiblePosts: number;
		plannedEmbeddings: number;
		repeatsPerPost: number;
		pilotPosts: number;
		succeeded: number;
		failed: number;
		completedBatches: number;
		active: boolean;
	} | null;
}

interface EvaluationManifest {
	eligible_posts?: number;
	planned_embeddings?: number;
	repeats_per_post?: number;
	pilot_posts?: number;
}

interface CombinedEvaluationSummary {
	requested?: number;
	succeeded?: number;
	failed?: number;
	batch_dirs?: string[];
}

async function loadEvaluation(): Promise<FreshDataset["evaluation"]> {
	const [manifest, combined] = await Promise.all([
		readJson<EvaluationManifest>(join(EVALUATION_ROOT, "manifest.json")),
		readJson<CombinedEvaluationSummary>(
			join(EVALUATION_ROOT, "combined_summary.json"),
		),
	]);
	if (!manifest) return null;
	const runRoot = join(EVALUATION_ROOT, "runs");
	let batchNames: string[] = [];
	try {
		batchNames = await readdir(runRoot);
	} catch {
		/* campaign has not created a batch yet */
	}
	let succeeded = 0;
	let failed = 0;
	let completedBatches = 0;
	for (const batch of batchNames.filter((name) => name.startsWith("batch_"))) {
		const profile = join(runRoot, batch, "balanced");
		succeeded += (await jsonNames(join(profile, "output-results"))).length;
		failed += (await jsonNames(join(profile, "failures"))).length;
		try {
			await stat(join(runRoot, batch, "summary.json"));
			completedBatches += 1;
		} catch {
			/* incomplete batch */
		}
	}
	let active = false;
	try {
		const info = await stat(join(EVALUATION_ROOT, "progress.jsonl"));
		active = Date.now() - info.mtimeMs < 5 * 60 * 1000;
	} catch {
		/* no progress yet */
	}
	return {
		eligiblePosts: manifest.eligible_posts ?? 0,
		plannedEmbeddings: manifest.planned_embeddings ?? 0,
		repeatsPerPost: manifest.repeats_per_post ?? 0,
		pilotPosts: manifest.pilot_posts ?? 0,
		// The combined summary excludes deliberately preserved interrupted batches.
		succeeded: combined?.succeeded ?? succeeded,
		failed: combined?.failed ?? failed,
		completedBatches: combined?.batch_dirs?.length ?? completedBatches,
		active,
	};
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function preview(value: unknown, limit = 360): string | null {
	const text = asString(value).replace(/\s+/g, " ").trim();
	if (!text) return null;
	return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

async function readJson<T>(path: string): Promise<T | null> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return null;
	}
}

async function jsonNames(path: string): Promise<string[]> {
	try {
		return (await readdir(path)).filter((name) => name.endsWith(".json"));
	} catch {
		return [];
	}
}

async function readTail(
	path: string,
	maxBytes: number,
): Promise<string | null> {
	let handle: Awaited<ReturnType<typeof open>> | null = null;
	try {
		handle = await open(path, "r");
		const info = await handle.stat();
		const length = Math.min(maxBytes, info.size);
		const buffer = Buffer.alloc(length);
		await handle.read(buffer, 0, length, Math.max(0, info.size - length));
		return buffer.toString("utf8");
	} catch {
		return null;
	} finally {
		await handle?.close();
	}
}

async function hasEmptyTrailingSearchResults(path: string): Promise<boolean> {
	const tail = await readTail(path, 4096);
	return tail ? /"search_results"\s*:\s*\[\s*\]\s*\}\s*$/.test(tail) : false;
}

async function readAngleCount(path: string): Promise<number | null> {
	const tail = await readTail(path, 256 * 1024);
	const match = tail?.match(/"tangent_count"\s*:\s*(\d+)/);
	if (match?.[1]) return Number(match[1]);
	const data = await readJson<SampleFile>(path);
	return data ? asArray(data.angles).length : null;
}

async function loadWorker(stage: Stage): Promise<FreshWorker> {
	const state = await readJson<CampaignStateFile>(
		join(FRESH_ROOT, "service", `campaign_${stage}_state.json`),
	);
	const pid = typeof state?.pid === "number" ? state.pid : null;
	let alive = false;
	if (pid !== null) {
		try {
			process.kill(pid, 0);
			alive = true;
		} catch {
			alive = false;
		}
	}
	return {
		stage,
		status: state?.status ?? "not started",
		pid,
		alive,
		startedAt: state?.started_at_utc ?? null,
		deadline: state?.deadline_utc ?? null,
		updatedAt: state?.updated_at_utc ?? null,
		attempts: state?.attempts?.[stage] ?? 0,
		lastSucceeded: state?.last_batch?.succeeded ?? 0,
		lastFailed: state?.last_batch?.failed ?? 0,
	};
}

function compactSample(
	fileName: string,
	updatedAt: string,
	data: SampleFile,
): FreshSample {
	const sources = asArray(data.search_results);
	const angles = asArray(data.angles);
	const sourceTexts = sources
		.map(asString)
		.map((value) => value.trim())
		.filter(Boolean)
		.sort((a, b) => b.length - a.length);
	return {
		postId: asString(data.id) || fileName.replace(/\.json$/i, ""),
		fileName,
		title: asString(data.title) || "Untitled post",
		url: asString(data.url) || null,
		updatedAt,
		sourceCount: sourceTexts.length,
		angleCount: angles.length,
		targetReached:
			data.angle_artifact?.angles_target_reached === true ||
			data.angle_artifact?.tangent_count === 32,
		sourcePreview: preview(sourceTexts[0]),
		angles: angles.slice(0, 4).map((value) => {
			const angle = (value ?? {}) as AngleValue;
			return {
				category: asString(angle.category) || "Uncategorized",
				tangent: asString(angle.tangent) || "No tangent text",
				sourceQuote: preview(angle.source_quote, 180),
			};
		}),
	};
}

async function scanFreshDataset(): Promise<FreshDataset | null> {
	const fetchedDir = join(FRESH_ROOT, "news_url_fetched");
	const researchedDir = join(FRESH_ROOT, "news_researched");
	const anglesDir = join(FRESH_ROOT, "news_angles");
	const outputsDir = join(FRESH_ROOT, "output-results");
	const [
		fetchedNames,
		researchedNames,
		angleNames,
		outputNames,
		workers,
		evaluation,
	] = await Promise.all([
		jsonNames(fetchedDir),
		jsonNames(researchedDir),
		jsonNames(anglesDir),
		jsonNames(outputsDir),
		Promise.all(STAGES.map(loadWorker)),
		loadEvaluation(),
	]);

	if (
		fetchedNames.length === 0 &&
		researchedNames.length === 0 &&
		angleNames.length === 0
	) {
		return null;
	}

	// One await per file in series over ~950 files was the page's dominant
	// cost; a bounded pool keeps the same tail reads but overlaps them.
	const researchFlags = await mapWithConcurrency(
		researchedNames,
		SCAN_CONCURRENCY,
		(name) => hasEmptyTrailingSearchResults(join(researchedDir, name)),
	);
	const emptyResearch = researchFlags.filter(Boolean).length;

	const angleFiles = (
		await mapWithConcurrency(angleNames, SCAN_CONCURRENCY, async (name) => ({
			name,
			path: join(anglesDir, name),
			info: await stat(join(anglesDir, name)).catch(() => null),
		}))
	).sort((a, b) => (b.info?.mtimeMs ?? 0) - (a.info?.mtimeMs ?? 0));
	const angleCounts = await mapWithConcurrency(
		angleFiles,
		SCAN_CONCURRENCY,
		(file) => readAngleCount(file.path),
	);
	const angleDistribution: Record<string, number> = {};
	let invalidAngleJson = 0;
	for (const angleCount of angleCounts) {
		if (angleCount === null) {
			invalidAngleJson += 1;
			continue;
		}
		angleDistribution[String(angleCount)] =
			(angleDistribution[String(angleCount)] ?? 0) + 1;
	}

	const compactSamples = (
		await Promise.all(
			angleFiles.slice(0, SAMPLE_COUNT).map(async (file) => {
				const data = await readJson<SampleFile>(file.path);
				return data
					? compactSample(file.name, file.info?.mtime.toISOString() ?? "", data)
					: null;
			}),
		)
	).filter((sample): sample is FreshSample => sample !== null);
	const fullAngleArtifacts = angleDistribution["32"] ?? 0;

	return {
		root: FRESH_ROOT,
		counts: {
			fetched: fetchedNames.length,
			researched: researchedNames.length,
			angles: angleNames.length,
			outputs: outputNames.length,
		},
		validation: {
			nonEmptyResearch: researchedNames.length - emptyResearch,
			emptyResearch,
			fullAngleArtifacts,
			shortAngleArtifacts:
				angleNames.length - fullAngleArtifacts - invalidAngleJson,
			invalidAngleJson,
			angleDistribution,
		},
		workers,
		samples: compactSamples,
		evaluation,
	};
}

/**
 * Cached entry point. The corpus grows by whole files as the prep campaign
 * runs, so a directory stamp is enough to notice new work while a page reload
 * between batches costs nothing.
 */
export function loadFreshDataset(): Promise<FreshDataset | null> {
	return deriveFromDirectories({
		as: "lucid-fresh-dataset",
		dirs: [
			join(FRESH_ROOT, "news_url_fetched"),
			join(FRESH_ROOT, "news_researched"),
			join(FRESH_ROOT, "news_angles"),
			join(FRESH_ROOT, "output-results"),
			join(FRESH_ROOT, "service"),
		],
		derive: scanFreshDataset,
	});
}
