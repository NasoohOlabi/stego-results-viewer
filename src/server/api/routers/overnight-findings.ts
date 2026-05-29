import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const E2E_RUNS_DIR = resolve(process.cwd(), "../stego-side-wing/metrics/e2e_runs");
const SIDE_WING_METRICS_DIR = resolve(process.cwd(), "../stego-side-wing/metrics");
const MODEL_ABLATION_RUNS_DIR = join(SIDE_WING_METRICS_DIR, "model_ablation_runs");
const ANGLE_SCAN_RUNS_DIR = join(SIDE_WING_METRICS_DIR, "angle_scan_runs");
const FEEDBACK_RUNS_DIR = join(SIDE_WING_METRICS_DIR, "feedback_runs");
const NATURALNESS_GATE_RUNS_DIR = join(
	SIDE_WING_METRICS_DIR,
	"experiments",
	"naturalness_gate_v1",
	"runs",
);
const SUPERVISOR_LOG = join(
	E2E_RUNS_DIR,
	"_runner_logs",
	"overnight_sample_supervisor_20260510.jsonl",
);
const FEATURED_RUNS = new Set([
	"fresh_metrics_20260509T195758Z",
	"fresh_metrics_200_20260509T233342Z",
	"pareto_security_retry_rating_cont_20260509T213201Z",
	"overnight_balanced_20260510T041410Z",
	"overnight_balanced_20260510T064418Z",
]);

type JsonRecord = Record<string, unknown>;

type RunOverview = {
	name: string;
	path: string;
	lastWriteTime: string;
	hasSummary: boolean;
	requested: number | null;
	succeeded: number;
	failed: number;
	attempts: number;
	successRate: number | null;
	variants: string[];
};

type FailureExample = {
	runName: string;
	variant: string;
	file: string;
	postId: string;
	error: string;
};

type FailureCluster = {
	code: string;
	count: number;
	postIds: Array<{ postId: string; count: number }>;
	examples: FailureExample[];
};

type VariantMetric = {
	runName: string;
	variant: string;
	requested: number;
	succeeded: number;
	failed: number;
	receiverSuccessRate: number | null;
	avgBitsEmbedded: number | null;
	avgStegoTextChars: number | null;
	perplexity: number | null;
	matchedPostKl: number | null;
	matchedPostJsd: number | null;
	globalKl: number | null;
	globalJsd: number | null;
};

type ProgressTotals = {
	runCount: number;
	totalRequested: number;
	totalSucceeded: number;
	totalFailed: number;
	successRate: number | null;
};

type E2EProgressRow = {
	runName: string;
	runCreatedAtUtc: string;
	variant: string;
	requested: number;
	succeeded: number;
	failed: number;
	successRate: number | null;
	matchedPostKl: number | null;
	matchedPostJsd: number | null;
	perplexity: number | null;
};

type ModelAblationProgressRow = {
	runName: string;
	runCreatedAtUtc: string;
	model: string;
	laneId: string;
	requested: number;
	succeeded: number;
	failed: number;
	failureRate: number | null;
	matchedPostKl: number | null;
	matchedPostJsd: number | null;
	perplexity: number | null;
	rank: number | null;
};

type AngleScanProgressRow = {
	runName: string;
	createdAtUtc: string;
	postId: string;
	totalAngles: number;
	succeeded: number;
	failed: number;
	successRate: number | null;
	jsonFailRate: number | null;
	decodeMismatchRate: number | null;
};

type FeedbackProgressRow = {
	runName: string;
	createdAtUtc: string;
	requested: number;
	succeeded: number;
	failed: number;
	failureRate: number | null;
	baselineFailureRate: number | null;
	deltaVsBaseline: number | null;
	adaptiveActions: number;
	matchedPostKl: number | null;
	matchedPostJsd: number | null;
	perplexity: number | null;
	topFailureCode: string | null;
	topFailureCount: number;
};

type ProgressSnapshot = {
	generatedAtUtc: string;
	e2e: ProgressTotals & { rows: E2EProgressRow[] };
	modelAblation: ProgressTotals & { rows: ModelAblationProgressRow[] };
	angleScan: ProgressTotals & { rows: AngleScanProgressRow[] };
	feedback: ProgressTotals & { rows: FeedbackProgressRow[] };
	naturalnessGate: ProgressTotals & { rows: E2EProgressRow[] };
};

const readJson = async (path: string): Promise<JsonRecord | null> => {
	try {
		return JSON.parse(await readFile(path, "utf-8")) as JsonRecord;
	} catch {
		return null;
	}
};

const getNumber = (record: JsonRecord | null, key: string): number | null => {
	const value = record?.[key];
	return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getString = (record: JsonRecord | null, key: string): string | null => {
	const value = record?.[key];
	return typeof value === "string" ? value : null;
};

const getArray = (record: JsonRecord | null, key: string): unknown[] => {
	const value = record?.[key];
	return Array.isArray(value) ? value : [];
};

const getRecord = (record: JsonRecord | null, key: string): JsonRecord | null => {
	const value = record?.[key];
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: null;
};

const getOutputItem = (json: unknown): JsonRecord | null => {
	if (Array.isArray(json)) {
		const first = json[0];
		return first && typeof first === "object" ? (first as JsonRecord) : null;
	}
	return json && typeof json === "object" ? (json as JsonRecord) : null;
};

const countFiles = async (path: string) => {
	try {
		const entries = await readdir(path, { withFileTypes: true });
		return entries.filter((entry) => entry.isFile()).length;
	} catch {
		return 0;
	}
};

const listVariantDirs = async (runPath: string) => {
	const entries = await readdir(runPath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
		.map((entry) => entry.name)
		.sort();
};

const normalizeFailureCode = (failure: JsonRecord) => {
	const rawCode = String(failure.failure_code ?? "").toLowerCase();
	const error = String(failure.error ?? "").toLowerCase();
	const combined = `${rawCode} ${error}`;

	if (combined.includes("invalid_json") || combined.includes("invalid json")) {
		return "stego_invalid_json";
	}
	if (
		combined.includes("decode validation") ||
		combined.includes("receiver_angle_mismatch")
	) {
		return "receiver_decode_validation_failed";
	}
	if (combined.includes("payload") && combined.includes("mismatch")) {
		return "receiver_payload_mismatch";
	}
	if (combined.includes("no_valid_candidate") || combined.includes("candidate")) {
		return "stego_no_valid_candidate";
	}
	return "infra_or_unknown";
};

const getOutputStats = async (outputPath: string) => {
	let files: string[] = [];
	try {
		files = (await readdir(outputPath, { withFileTypes: true }))
			.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
			.map((entry) => entry.name);
	} catch {
		return { avgBitsEmbedded: null, avgStegoTextChars: null };
	}

	let bitsTotal = 0;
	let bitsCount = 0;
	let stegoCharsTotal = 0;
	let stegoTextCount = 0;

	for (const file of files.sort().slice(0, 25)) {
		let parsed: JsonRecord | null = null;
		try {
			parsed = getOutputItem(
				JSON.parse(await readFile(join(outputPath, file), "utf-8")),
			);
		} catch {
			continue;
		}
		const embedding = getRecord(parsed, "embedding");
		const commentEmbedding = getRecord(embedding, "commentEmbedding");
		const angleEmbedding = getRecord(embedding, "angleEmbedding");
		const totalBits =
			getNumber(embedding, "totalBitsEmbedded") ??
			(getNumber(commentEmbedding, "bitsCount") ?? 0) +
				(getNumber(angleEmbedding, "bitsCount") ?? 0);
		if (totalBits > 0) {
			bitsTotal += totalBits;
			bitsCount += 1;
		}

		const stegoText = parsed?.stegoText;
		if (typeof stegoText === "string" && stegoText.length > 0) {
			stegoCharsTotal += stegoText.length;
			stegoTextCount += 1;
		}
	}

	return {
		avgBitsEmbedded: bitsCount > 0 ? bitsTotal / bitsCount : null,
		avgStegoTextChars:
			stegoTextCount > 0 ? stegoCharsTotal / stegoTextCount : null,
	};
};

const getRunOverview = async (name: string): Promise<RunOverview> => {
	const runPath = join(E2E_RUNS_DIR, name);
	const runStat = await stat(runPath);
	const variants = await listVariantDirs(runPath);
	const runSummary = await readJson(join(runPath, "summary.json"));
	const hasSummary = runSummary !== null;

	let requested = getNumber(runSummary, "samples_per_profile");
	let succeeded = 0;
	let failed = 0;
	let attempts = 0;

	for (const variant of variants) {
		const variantPath = join(runPath, variant);
		const variantSummary = await readJson(join(variantPath, "summary.json"));
		requested ??= getNumber(variantSummary, "requested_samples");
		const variantSucceeded =
			getNumber(variantSummary, "samples_succeeded") ??
			(await countFiles(join(variantPath, "output-results")));
		const variantFailed =
			getNumber(variantSummary, "samples_failed") ??
			(await countFiles(join(variantPath, "failures")));
		succeeded += variantSucceeded;
		failed += variantFailed;
		attempts += variantSucceeded + variantFailed;
	}

	const totalRequested =
		requested === null ? null : variants.length > 1 ? requested * variants.length : requested;

	return {
		name,
		path: runPath,
		lastWriteTime: runStat.mtime.toISOString(),
		hasSummary,
		requested: totalRequested,
		succeeded,
		failed,
		attempts,
		successRate: attempts > 0 ? succeeded / attempts : null,
		variants,
	};
};

const collectFailures = async (runNames: string[]) => {
	const byCode = new Map<
		string,
		{ count: number; posts: Map<string, number>; examples: FailureExample[] }
	>();

	for (const runName of runNames) {
		const runPath = join(E2E_RUNS_DIR, runName);
		for (const variant of await listVariantDirs(runPath)) {
			const failuresPath = join(runPath, variant, "failures");
			let files: string[] = [];
			try {
				files = (await readdir(failuresPath, { withFileTypes: true }))
					.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
					.map((entry) => entry.name);
			} catch {
				continue;
			}

			for (const file of files) {
				const fullPath = join(failuresPath, file);
				const failure = await readJson(fullPath);
				if (!failure) {
					continue;
				}
				const code = normalizeFailureCode(failure);
				const postId = String(failure.post_id ?? "unknown");
				const bucket = byCode.get(code) ?? {
					count: 0,
					posts: new Map<string, number>(),
					examples: [],
				};
				bucket.count += 1;
				bucket.posts.set(postId, (bucket.posts.get(postId) ?? 0) + 1);
				if (bucket.examples.length < 8) {
					bucket.examples.push({
						runName,
						variant,
						file: relative(process.cwd(), fullPath),
						postId,
						error: String(failure.error ?? failure.failure_code ?? "unknown"),
					});
				}
				byCode.set(code, bucket);
			}
		}
	}

	return Array.from(byCode.entries())
		.map(([code, bucket]) => ({
			code,
			count: bucket.count,
			postIds: Array.from(bucket.posts.entries())
				.map(([postId, count]) => ({ postId, count }))
				.sort((a, b) => b.count - a.count || a.postId.localeCompare(b.postId)),
			examples: bucket.examples,
		}))
		.sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
};

const getVariantMetrics = async (runName: string): Promise<VariantMetric[]> => {
	const runPath = join(E2E_RUNS_DIR, runName);
	const metrics: VariantMetric[] = [];

	for (const variant of await listVariantDirs(runPath)) {
		const variantPath = join(runPath, variant);
		const summary = await readJson(join(variantPath, "summary.json"));
		const metricsPath = join(variantPath, "metrics");
		let files: string[] = [];
		try {
			files = (await readdir(metricsPath, { withFileTypes: true }))
				.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
				.map((entry) => entry.name);
		} catch {}

		const perplexityFile = files.find((file) => file.includes("perplexity"));
		const divergenceFile = files.find((file) => file.includes("divergence"));
		const perplexity = perplexityFile
			? await readJson(join(metricsPath, perplexityFile))
			: null;
		const divergence = divergenceFile
			? await readJson(join(metricsPath, divergenceFile))
			: null;
		const matched = getRecord(divergence, "primary_baseline_matched_post");
		const global = getRecord(divergence, "secondary_baseline_global_corpus");
		const outputStats = await getOutputStats(join(variantPath, "output-results"));

		metrics.push({
			runName,
			variant,
			requested:
				getNumber(summary, "requested_samples") ??
				(await countFiles(join(variantPath, "output-results"))) +
					(await countFiles(join(variantPath, "failures"))),
			succeeded:
				getNumber(summary, "samples_succeeded") ??
				(await countFiles(join(variantPath, "output-results"))),
			failed:
				getNumber(summary, "samples_failed") ??
				(await countFiles(join(variantPath, "failures"))),
			receiverSuccessRate:
				getNumber(summary, "receiver_success_rate") ??
				(getNumber(summary, "samples_succeeded") && getNumber(summary, "requested_samples")
					? getNumber(summary, "samples_succeeded")! /
						getNumber(summary, "requested_samples")!
					: null),
			avgBitsEmbedded: outputStats.avgBitsEmbedded,
			avgStegoTextChars: outputStats.avgStegoTextChars,
			perplexity: getNumber(
				getRecord(perplexity, "perplexity_summary"),
				"average_perplexity",
			),
			matchedPostKl: getNumber(matched, "average_kl_stego_vs_matched_post"),
			matchedPostJsd: getNumber(matched, "average_jsd_stego_vs_matched_post"),
			globalKl: getNumber(global, "average_kl_stego_vs_global_corpus"),
			globalJsd: getNumber(global, "average_jsd_stego_vs_global_corpus"),
		});
	}

	return metrics.sort((a, b) => a.variant.localeCompare(b.variant));
};

const summarizeTotals = (
	rows: Array<{ requested: number; succeeded: number; failed: number }>,
): ProgressTotals => {
	const totalRequested = rows.reduce((sum, row) => sum + row.requested, 0);
	const totalSucceeded = rows.reduce((sum, row) => sum + row.succeeded, 0);
	const totalFailed = rows.reduce((sum, row) => sum + row.failed, 0);
	const denom = totalSucceeded + totalFailed;
	return {
		runCount: 0,
		totalRequested,
		totalSucceeded,
		totalFailed,
		successRate: denom > 0 ? totalSucceeded / denom : null,
	};
};

const collectE2EProgress = async (
	baseDir: string,
): Promise<{ rows: E2EProgressRow[]; runCount: number }> => {
	let runDirs: string[] = [];
	try {
		runDirs = (await readdir(baseDir, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
			.map((entry) => entry.name)
			.sort();
	} catch {
		return { rows: [], runCount: 0 };
	}

	const rows: E2EProgressRow[] = [];
	for (const runName of runDirs) {
		const runSummary = await readJson(join(baseDir, runName, "summary.json"));
		if (!runSummary) continue;
		const createdAt = getString(runSummary, "created_at_utc") ?? "";
		const profileSummaries = getArray(runSummary, "profile_summaries");
		for (const item of profileSummaries) {
			const profile = item && typeof item === "object" ? (item as JsonRecord) : null;
			if (!profile) continue;
			const summaryMetrics = getRecord(profile, "summary_metrics");
			const quality = getRecord(summaryMetrics, "quality_metrics");
			const requested = getNumber(profile, "requested_samples") ?? 0;
			const succeeded = getNumber(profile, "samples_succeeded") ?? 0;
			const failed = getNumber(profile, "samples_failed") ?? 0;
			const denom = succeeded + failed;
			rows.push({
				runName,
				runCreatedAtUtc: createdAt,
				variant: getString(profile, "variant") ?? "unknown",
				requested,
				succeeded,
				failed,
				successRate: denom > 0 ? succeeded / denom : null,
				matchedPostKl: getNumber(quality, "matched_post_kl"),
				matchedPostJsd: getNumber(quality, "matched_post_jsd"),
				perplexity: getNumber(quality, "perplexity"),
			});
		}
	}

	return { rows, runCount: runDirs.length };
};

const collectModelAblationProgress = async (): Promise<{
	rows: ModelAblationProgressRow[];
	runCount: number;
}> => {
	let runDirs: string[] = [];
	try {
		runDirs = (await readdir(MODEL_ABLATION_RUNS_DIR, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch {
		return { rows: [], runCount: 0 };
	}

	const rows: ModelAblationProgressRow[] = [];
	for (const runName of runDirs) {
		const summary = await readJson(
			join(MODEL_ABLATION_RUNS_DIR, runName, "summary.json"),
		);
		if (!summary) continue;
		const createdAt = getString(summary, "created_at_utc") ?? "";
		const requested = getNumber(summary, "samples_per_model") ?? 0;
		const leaderboard = getRecord(summary, "leaderboard");
		const leaderboardRows = getArray(leaderboard, "rows");
		for (const item of leaderboardRows) {
			const row = item && typeof item === "object" ? (item as JsonRecord) : null;
			if (!row) continue;
			rows.push({
				runName,
				runCreatedAtUtc: createdAt,
				model: getString(row, "model") ?? "unknown",
				laneId: getString(row, "lane_id") ?? "unknown",
				requested,
				succeeded: getNumber(row, "samples_succeeded") ?? 0,
				failed: getNumber(row, "samples_failed") ?? 0,
				failureRate: getNumber(row, "failure_rate"),
				matchedPostKl: getNumber(row, "matched_post_kl"),
				matchedPostJsd: getNumber(row, "matched_post_jsd"),
				perplexity: getNumber(row, "perplexity"),
				rank: getNumber(row, "rank"),
			});
		}
	}

	return { rows, runCount: runDirs.length };
};

const collectAngleScanProgress = async (): Promise<{
	rows: AngleScanProgressRow[];
	runCount: number;
}> => {
	let runDirs: string[] = [];
	try {
		runDirs = (await readdir(ANGLE_SCAN_RUNS_DIR, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch {
		return { rows: [], runCount: 0 };
	}

	const rows: AngleScanProgressRow[] = [];
	for (const runName of runDirs) {
		const summary = await readJson(
			join(ANGLE_SCAN_RUNS_DIR, runName, "angle_scan_summary.json"),
		);
		if (!summary) continue;
		rows.push({
			runName,
			createdAtUtc: getString(summary, "created_at_utc") ?? "",
			postId: getString(summary, "post_id") ?? "unknown",
			totalAngles: getNumber(summary, "total_angles") ?? 0,
			succeeded: getNumber(summary, "succeeded") ?? 0,
			failed: getNumber(summary, "failed") ?? 0,
			successRate: getNumber(summary, "success_rate"),
			jsonFailRate: getNumber(summary, "json_fail_rate"),
			decodeMismatchRate: getNumber(summary, "decode_mismatch_rate"),
		});
	}

	return { rows, runCount: runDirs.length };
};

const collectFeedbackProgress = async (): Promise<{
	rows: FeedbackProgressRow[];
	runCount: number;
}> => {
	let runDirs: string[] = [];
	try {
		runDirs = (await readdir(FEEDBACK_RUNS_DIR, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
	} catch {
		return { rows: [], runCount: 0 };
	}

	const rows: FeedbackProgressRow[] = [];
	for (const runName of runDirs) {
		const summary = await readJson(join(FEEDBACK_RUNS_DIR, runName, "latest_summary.json"));
		if (!summary) continue;
		const leaderboard = getRecord(summary, "leaderboard");
		const topCluster = getRecord(summary, "top_failure_cluster");
		const lbRows = getArray(leaderboard, "rows");
		const firstRow = lbRows[0] && typeof lbRows[0] === "object" ? (lbRows[0] as JsonRecord) : null;
		rows.push({
			runName,
			createdAtUtc: getString(leaderboard, "created_at_utc") ?? "",
			requested: getNumber(leaderboard, "requested") ?? 0,
			succeeded: getNumber(leaderboard, "succeeded") ?? 0,
			failed: getNumber(leaderboard, "failed") ?? 0,
			failureRate: getNumber(leaderboard, "failure_rate"),
			baselineFailureRate: getNumber(leaderboard, "baseline_failure_rate"),
			deltaVsBaseline: getNumber(leaderboard, "failure_rate_delta_vs_baseline"),
			adaptiveActions: getNumber(leaderboard, "adaptive_actions") ?? 0,
			matchedPostKl: getNumber(firstRow, "matched_post_kl"),
			matchedPostJsd: getNumber(firstRow, "matched_post_jsd"),
			perplexity: getNumber(firstRow, "perplexity"),
			topFailureCode: getString(topCluster, "failure_code"),
			topFailureCount: getNumber(topCluster, "count") ?? 0,
		});
	}

	return { rows, runCount: runDirs.length };
};

const getProgressSnapshot = async (): Promise<ProgressSnapshot> => {
	const [e2e, modelAblation, angleScan, feedback, naturalnessGate] =
		await Promise.all([
			collectE2EProgress(E2E_RUNS_DIR),
			collectModelAblationProgress(),
			collectAngleScanProgress(),
			collectFeedbackProgress(),
			collectE2EProgress(NATURALNESS_GATE_RUNS_DIR),
		]);

	const e2eTotals = summarizeTotals(e2e.rows);
	const modelTotals = summarizeTotals(modelAblation.rows);
	const angleTotals = summarizeTotals(
		angleScan.rows.map((row) => ({
			requested: row.totalAngles,
			succeeded: row.succeeded,
			failed: row.failed,
		})),
	);
	const feedbackTotals = summarizeTotals(feedback.rows);
	const naturalnessTotals = summarizeTotals(naturalnessGate.rows);

	return {
		generatedAtUtc: new Date().toISOString(),
		e2e: { ...e2eTotals, runCount: e2e.runCount, rows: e2e.rows },
		modelAblation: {
			...modelTotals,
			runCount: modelAblation.runCount,
			rows: modelAblation.rows,
		},
		angleScan: { ...angleTotals, runCount: angleScan.runCount, rows: angleScan.rows },
		feedback: { ...feedbackTotals, runCount: feedback.runCount, rows: feedback.rows },
		naturalnessGate: {
			...naturalnessTotals,
			runCount: naturalnessGate.runCount,
			rows: naturalnessGate.rows,
		},
	};
};

export const overnightFindingsRouter = createTRPCRouter({
	listRuns: publicProcedure.query(async () => {
		const entries = await readdir(E2E_RUNS_DIR, { withFileTypes: true });
		const runNames = entries
			.filter((entry) => entry.isDirectory() && FEATURED_RUNS.has(entry.name))
			.map((entry) => entry.name);
		const runs = await Promise.all(runNames.map((name) => getRunOverview(name)));
		return runs.sort((a, b) => a.name.localeCompare(b.name));
	}),

	getRunSummary: publicProcedure
		.input(z.object({ runName: z.string() }))
		.query(async ({ input }) => getRunOverview(basename(input.runName))),

	getFailureClusters: publicProcedure
		.input(z.object({ runName: z.string().optional() }).optional())
		.query(async ({ input }) => {
			const runNames = input?.runName
				? [basename(input.runName)]
				: Array.from(FEATURED_RUNS);
			return collectFailures(runNames);
		}),

	getSecurityVariantMetrics: publicProcedure.query(async () =>
		getVariantMetrics("pareto_security_retry_rating_cont_20260509T213201Z"),
	),

	getSupervisorStatus: publicProcedure.query(async () => {
		try {
			const lines = (await readFile(SUPERVISOR_LOG, "utf-8"))
				.trim()
				.split(/\r?\n/)
				.filter(Boolean);
			const latest = lines.at(-1);
			const event = latest ? (JSON.parse(latest) as JsonRecord) : null;
			return {
				logPath: SUPERVISOR_LOG,
				lastEventTimestamp: String(event?.timestamp ?? ""),
				lastEvent: event,
				isActive: event?.event === "active_run_detected",
			};
		} catch {
			return {
				logPath: SUPERVISOR_LOG,
				lastEventTimestamp: "",
				lastEvent: null,
				isActive: false,
			};
		}
	}),

	getProgressSnapshot: publicProcedure.query(async () => getProgressSnapshot()),
});
