import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { SampleCard } from "../_components/sample-browser";
import type { SummaryTableRow } from "../_components/summary-table";
import { firstLine, fmtNum, fmtP, signTestP } from "./format";
import type { JudgeProgress } from "./llm-judge";

/**
 * All data loading/derivation for the ZLG comparison dashboard, shared
 * between the interactive page (page.tsx) and the agent-facing `.md` export
 * (../../zlg-comparison.md/route.ts). Keeping this in one place means both
 * surfaces report identical numbers from identical logic.
 */

/** Mirrors FailureStage in services/zlg_comparison_service.py. */
export type FailureStage =
	| "none"
	| "harness_extract"
	| "hide_request"
	| "quality_gate"
	| "capacity"
	| "leakage_check"
	| "reveal"
	| "unknown";

type ResultRow = {
	post_id?: string;
	sample_index?: number;
	stegotext?: string | null;
	accepted?: boolean;
	reason?: string | null;
	failure_stage?: FailureStage;
	source_output_file?: string;
};

type GatePassRate = {
	n?: number;
	passed?: number;
	pass_rate?: number | null;
	failed_rules?: Record<string, number>;
};

type MethodMetricBlock = {
	n?: number;
	total_embedded_bits_mean?: number;
	total_embedded_bits_min?: number;
	total_embedded_bits_max?: number;
	payload_bytes_encoded_mean?: number;
	perplexity_gpt2_mean?: number;
	perplexity_gpt2_median?: number;
	kl_matched_post_mean?: number;
	jsd_matched_post_mean?: number;
	kl_global_corpus_mean?: number;
	jsd_global_corpus_mean?: number;
	word_count_mean?: number;
	repetition_ratio_mean?: number;
	lexical_quality_index_mean?: number;
	bleu_mean?: number;
	bleu_median?: number;
	rouge1_mean?: number;
	rouge2_mean?: number;
	rougeL_mean?: number;
	bertscore_precision_mean?: number;
	bertscore_recall_mean?: number;
	bertscore_f1_mean?: number;
	self_consistency_mean?: number;
};

export type MetricTableData = {
	label: string;
	caveat?: string;
	ours: number | null;
	zlg: number | null;
	unit?: string;
	lowerIsBetter?: boolean;
	winner: "ours" | "zlg" | "tie" | "n/a";
	pValue: number | null;
	winnerCount?: string;
	coverage?: number;
	secondary?: { label: string; ours: number | null; zlg: number | null };
};

export type PairedStat = {
	n: number;
	mean_delta_zlg_minus_our: number;
	zlg_greater_count: number;
	our_greater_count: number;
	ties: number;
	two_sided_sign_test_p: number | null;
	holm_adjusted_p?: number | null;
};

type DiversityGuard = {
	minimum_unique_ratio?: number;
	posts?: Array<{ post_id: string; samples: number; unique_ratio: number }>;
	failing_post_ids?: string[];
	passed?: boolean;
};

export type MetricsSummary = {
	rows?: number;
	paired_posts?: number;
	methods?: { our_method?: MethodMetricBlock; zlg?: MethodMetricBlock };
	methods_clustered_by_post?: {
		our_method?: MethodMetricBlock;
		zlg?: MethodMetricBlock;
	};
	zlg_attempt_reliability?: {
		rows_in_run?: number;
		harness_skipped?: number;
		attempted?: number;
		accepted?: number;
		decode_verified?: number;
		acceptance_rate?: number | null;
		effective_payload_bits_per_attempt?: number | null;
		failure_stage_counts?: Record<string, number>;
	};
	shared_naturalness_gate?: {
		thresholds?: Record<string, number>;
		our_method?: GatePassRate;
		zlg?: GatePassRate;
	};
	paired_statistics?:
		| ({ paired_n?: number; inference_unit?: string } & Record<
				string,
				PairedStat
		  >)
		| Record<string, never>;
	row_level_descriptive_statistics?:
		| ({ paired_n?: number } & Record<string, PairedStat>)
		| Record<string, never>;
	independence_diagnostics?: {
		row_pairs?: number;
		independent_clusters?: number;
		unique_our_method_texts?: number;
	};
	diversity_guard?: DiversityGuard;
	capacity_fields_note?: string;
	lexical_quality_index?: {
		version?: string;
		status?: string;
		range?: [number, number];
	};
};

type PairedRow = {
	pair_id?: number;
	post_id?: string;
	sample_index?: number;
	method?: string;
	stegotext?: string;
	thread_context?: string;
	reference_text?: string;
	word_count?: number;
	total_embedded_bits?: number;
	perplexity_gpt2?: number;
	bleu?: number;
	rougeL?: number;
	bertscore_f1?: number;
	self_consistency?: number;
};

/**
 * Point at a different benchmark run without editing source. Re-runs land in a
 * new directory, so hardcoding one meant the dashboard silently kept rendering
 * the stale run after every rebuild.
 *
 * Contaminated default `zlg_batch_scale300` was deleted (synthetic-anchor
 * incident: stock "keep coming back" carriers in paired_rows). Recalibrated
 * has results/summary but no paired_rows — sample browser stays empty until a
 * clean comparison rebuild. Override with ZLG_RUN_DIR.
 */
export const RUN_DIR =
	process.env.ZLG_RUN_DIR ??
	"D:\\Master\\code\\stego\\stego-side-wing\\metrics\\zlg_comparison_runs\\zlg_lucid_fresh_6x_20260815";
const RESULTS_JSONL = path.join(RUN_DIR, "results.jsonl");
const PROGRESS_JSON = path.join(RUN_DIR, "progress.json");
const SUMMARY_JSON = path.join(RUN_DIR, "summary.json");
const COMPARISON_DIR = path.join(RUN_DIR, "comparison_dataset");
const METRICS_SUMMARY_JSON = path.join(COMPARISON_DIR, "summary.json");
const PAIRED_ROWS_JSONL = path.join(COMPARISON_DIR, "paired_rows.jsonl");
// Some judge passes preserve the source dataset under this name while they
// write their per-sample results separately. Keep the comparison browsable
// during that intermediate state instead of silently showing zero examples.
const PAIRED_ROWS_BACKUP_JSONL = `${PAIRED_ROWS_JSONL}.bak_pre_codex_judge`;
const CODEX_JUDGE_SUMMARY_JSON = path.join(
	COMPARISON_DIR,
	"codex_judge_summary.json",
);
const CODEX_JUDGMENTS_DIR = path.join(COMPARISON_DIR, "codex_judgments");
const CODEX_PILOT_AUDIT_JSON = path.join(
	CODEX_JUDGMENTS_DIR,
	"pilot_audit.json",
);

function readJson(pathname: string): Record<string, unknown> | null {
	if (!existsSync(pathname)) return null;
	try {
		return JSON.parse(readFileSync(pathname, "utf-8")) as Record<
			string,
			unknown
		>;
	} catch {
		return null;
	}
}

function readJsonl<T>(pathname: string): T[] {
	if (!existsSync(pathname)) return [];
	return readFileSync(pathname, "utf-8")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line) as T;
			} catch {
				return {} as T;
			}
		});
}

/**
 * Decide the paired winner *and* the count label together, accounting for
 * metric direction. `our_greater_count` / `zlg_greater_count` are raw
 * value-magnitude counts, so for lower-is-better metrics (perplexity, KL, JSD)
 * the method that is "greater" more often is actually the loser.
 */
function winnerInfo(
	stat: PairedStat | undefined,
	lowerIsBetter = false,
): { winner: "ours" | "zlg" | "tie" | "n/a"; count?: string } {
	if (!stat) return { winner: "n/a" };
	const inferenceP = stat.holm_adjusted_p ?? stat.two_sided_sign_test_p;
	if (inferenceP === null || inferenceP === undefined || inferenceP >= 0.05) {
		return { winner: "n/a", count: "no clear difference" };
	}
	const oursBetterCount = lowerIsBetter
		? stat.zlg_greater_count
		: stat.our_greater_count;
	const zlgBetterCount = lowerIsBetter
		? stat.our_greater_count
		: stat.zlg_greater_count;
	if (oursBetterCount === zlgBetterCount) return { winner: "tie" };
	if (oursBetterCount > zlgBetterCount) {
		return {
			winner: "ours",
			count: `${oursBetterCount}/${stat.n} ours better`,
		};
	}
	return { winner: "zlg", count: `${zlgBetterCount}/${stat.n} zlg better` };
}

function pairedInferenceP(stat: PairedStat | undefined): number | null {
	return stat?.holm_adjusted_p ?? stat?.two_sided_sign_test_p ?? null;
}

/**
 * Derive a stage for rows written before `failure_stage` existed.
 * Mirrors classify_failure_stage in services/zlg_comparison_service.py; new
 * runs carry the field and never reach the fallback.
 */
function deriveFailureStage(row: ResultRow): FailureStage {
	if (row.failure_stage) return row.failure_stage;
	if (row.accepted) return "none";
	const reason = (row.reason ?? "").trim();
	if (!reason) return "unknown";
	if (reason.startsWith("sample_extract_failed")) return "harness_extract";
	if (reason.startsWith("capacity_probe_")) return "hide_request";
	if (reason.startsWith("reveal_")) return "reveal";
	if (reason.startsWith("hide_truncated")) return "capacity";
	if (reason.startsWith("payload_size_mismatch")) return "capacity";
	if (reason.startsWith("missing_stegotext")) return "hide_request";
	if (reason.startsWith("prompt_leakage_detected")) return "leakage_check";
	if (reason.startsWith("hide_request_failed")) {
		return reason.includes("quality_gate_failed") ||
			reason.includes("quality_or_capacity_failure")
			? "quality_gate"
			: "hide_request";
	}
	return "unknown";
}

/** Whether a failed row ever reached the ZLG server at all. */
function reachedServer(row: ResultRow): boolean {
	return deriveFailureStage(row) !== "harness_extract";
}

export const FAILURE_STAGE_LABELS: Record<FailureStage, string> = {
	none: "accepted",
	harness_extract: "harness — no request sent",
	hide_request: "hide request failed",
	quality_gate: "quality gate rejected",
	capacity: "insufficient capacity",
	leakage_check: "prompt leakage",
	reveal: "reveal / decode failed",
	unknown: "unclassified",
};

export async function loadZlgComparisonData() {
	const progress = readJson(PROGRESS_JSON);
	const summary = readJson(SUMMARY_JSON);
	const rows = readJsonl<ResultRow>(RESULTS_JSONL);
	const acceptedRows = rows.filter((r) => Boolean(r.accepted));
	const failedRows = rows.filter((r) => !r.accepted);
	// Rows where our own cover-sentence extraction gave up never reached the
	// server, so they are not ZLG failures and must not share its denominator.
	const skippedRows = failedRows.filter((r) => !reachedServer(r));
	const attemptedRows = rows.filter(reachedServer);

	const stageCounts = new Map<FailureStage, number>();
	for (const row of failedRows) {
		const key = deriveFailureStage(row);
		stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1);
	}
	const topStages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]);
	const localAcceptanceRate =
		attemptedRows.length > 0
			? acceptedRows.length / attemptedRows.length
			: null;

	const metricsSummary = readJson(
		METRICS_SUMMARY_JSON,
	) as MetricsSummary | null;
	// Descriptive values use every complete pair. Inference remains clustered by
	// post below because repeated outputs from one post are not independent.
	const ourBlock = metricsSummary?.methods?.our_method;
	const zlgBlock = metricsSummary?.methods?.zlg;
	const paired = (metricsSummary?.paired_statistics ?? {}) as Record<
		string,
		PairedStat
	> & {
		paired_n?: number;
		inference_unit?: string;
	};
	const rowLevel = (metricsSummary?.row_level_descriptive_statistics ??
		{}) as Record<string, PairedStat> & { paired_n?: number };
	const diversityGuard = metricsSummary?.diversity_guard;
	const independence = metricsSummary?.independence_diagnostics;
	const reliability = metricsSummary?.zlg_attempt_reliability;
	// A summary without `harness_skipped` predates the denominator fix: its
	// `attempted` still counts rows that never reached the server. Fall back to
	// the values derived from results.jsonl rather than render a stale rate.
	const summaryHasSplitDenominator = reliability?.harness_skipped !== undefined;
	const shownAttempts = summaryHasSplitDenominator
		? (reliability?.attempted ?? attemptedRows.length)
		: attemptedRows.length;
	const shownAcceptance = summaryHasSplitDenominator
		? (reliability?.acceptance_rate ?? localAcceptanceRate)
		: localAcceptanceRate;
	const shownSkipped = summaryHasSplitDenominator
		? (reliability?.harness_skipped ?? skippedRows.length)
		: skippedRows.length;

	const usingPairedRowsBackup =
		!existsSync(PAIRED_ROWS_JSONL) && existsSync(PAIRED_ROWS_BACKUP_JSONL);
	const pairedRowsPath = existsSync(PAIRED_ROWS_JSONL)
		? PAIRED_ROWS_JSONL
		: usingPairedRowsBackup
			? PAIRED_ROWS_BACKUP_JSONL
			: null;
	if (usingPairedRowsBackup) {
		console.warn(
			`[zlg-comparison] paired_rows.jsonl missing; falling back to ${path.basename(PAIRED_ROWS_BACKUP_JSONL)}. A later judge pass that writes a different paired_rows.jsonl will not be picked up until that file exists.`,
		);
	}
	const pairedRows = pairedRowsPath ? readJsonl<PairedRow>(pairedRowsPath) : [];
	const pairedRowsSource = existsSync(PAIRED_ROWS_JSONL)
		? ("paired_rows.jsonl" as const)
		: usingPairedRowsBackup
			? ("paired_rows.jsonl.bak_pre_codex_judge" as const)
			: ("missing" as const);
	const codexJudgeSummary = readJson(CODEX_JUDGE_SUMMARY_JSON);
	const codexPilotAudit = readJson(CODEX_PILOT_AUDIT_JSON);
	const codexJudgments = [
		"standout",
		"weak_link",
		"suspicion",
		"attribution",
		"register",
	].flatMap((metric) =>
		readJsonl<Record<string, unknown>>(
			path.join(CODEX_JUDGMENTS_DIR, `${metric}_judgments.jsonl`),
		),
	);
	const codexJudgeProgress: JudgeProgress[] = [
		"standout",
		"weak_link",
		"suspicion",
		"attribution",
		"register",
	].flatMap((metric) => {
		const item = readJson(
			path.join(CODEX_JUDGMENTS_DIR, `${metric}_progress.json`),
		) as JudgeProgress | null;
		return item ? [item] : [];
	});

	// ---- bits-per-word: the efficiency metric the baseline paper reports.
	// Computed directly from paired_rows.jsonl (post-clustered mean of the
	// per-row ratio), with a plain sign test — not part of the Python-side
	// Holm-adjusted family, so kept separate from `paired`.
	const bitsPerWordByPost = new Map<
		string,
		{ our_method: number[]; zlg: number[] }
	>();
	for (const r of pairedRows) {
		if (
			!r.post_id ||
			!r.method ||
			typeof r.total_embedded_bits !== "number" ||
			typeof r.word_count !== "number" ||
			r.word_count === 0
		)
			continue;
		const entry = bitsPerWordByPost.get(r.post_id) ?? {
			our_method: [],
			zlg: [],
		};
		if (r.method === "our_method" || r.method === "zlg") {
			entry[r.method].push(r.total_embedded_bits / r.word_count);
		}
		bitsPerWordByPost.set(r.post_id, entry);
	}
	let bpwOursBetter = 0;
	let bpwZlgBetter = 0;
	for (const { our_method, zlg } of bitsPerWordByPost.values()) {
		if (our_method.length === 0 || zlg.length === 0) continue;
		const ourMean = our_method.reduce((a, b) => a + b, 0) / our_method.length;
		const zlgMean = zlg.reduce((a, b) => a + b, 0) / zlg.length;
		if (ourMean > zlgMean) bpwOursBetter += 1;
		else if (zlgMean > ourMean) bpwZlgBetter += 1;
	}
	const bpwAll = (method: "our_method" | "zlg") => {
		const values = pairedRows.flatMap((row) => {
			if (
				row.method !== method ||
				typeof row.total_embedded_bits !== "number" ||
				typeof row.word_count !== "number" ||
				row.word_count <= 0
			)
				return [];
			return [row.total_embedded_bits / row.word_count];
		});
		return values.length
			? values.reduce((total, value) => total + value, 0) / values.length
			: null;
	};
	const bpwOursAllMean = bpwAll("our_method");
	const bpwZlgAllMean = bpwAll("zlg");
	const bpwP = signTestP(bpwOursBetter, bpwZlgBetter);
	const bpwWinner: MetricTableData["winner"] =
		bpwP === null || bpwP >= 0.05
			? "n/a"
			: bpwOursBetter > bpwZlgBetter
				? "ours"
				: "zlg";
	const bpwWinnerCount =
		bpwWinner === "ours"
			? `${bpwOursBetter}/${bpwOursBetter + bpwZlgBetter} ours better`
			: bpwWinner === "zlg"
				? `${bpwZlgBetter}/${bpwOursBetter + bpwZlgBetter} zlg better`
				: undefined;

	// ---- metric comparison cards (only metrics this pipeline actually computes) ----
	const perplexityWin = winnerInfo(paired.perplexity_gpt2, true);
	const klMatchedWin = winnerInfo(paired.kl_matched_post, true);
	const jsdMatchedWin = winnerInfo(paired.jsd_matched_post, true);
	const klGlobalWin = winnerInfo(paired.kl_global_corpus, true);
	const jsdGlobalWin = winnerInfo(paired.jsd_global_corpus, true);
	const bleuWin = winnerInfo(paired.bleu);
	const rougeLWin = winnerInfo(paired.rougeL);
	const bertscoreWin = winnerInfo(paired.bertscore_f1);
	const bertscorePrecisionWin = winnerInfo(paired.bertscore_precision);
	const bertscoreRecallWin = winnerInfo(paired.bertscore_recall);
	const repetitionWin = winnerInfo(paired.repetition_ratio, true);
	const lexicalQualityWin = winnerInfo(paired.lexical_quality_index);
	const selfConsistencyWin = winnerInfo(paired.self_consistency, true);
	const commentLengthWin = winnerInfo(paired.word_count);

	const metricRows: MetricTableData[] = metricsSummary
		? [
				{
					label: "Efficiency: bits per word",
					caveat:
						"The efficiency metric the baseline paper itself reports. Computed directly from per-post word counts and encoded bits; this is a plain sign test, not part of the Holm-adjusted family below.",
					ours: bpwOursAllMean,
					zlg: bpwZlgAllMean,
					unit: "bits/word",
					winner: bpwWinner,
					pValue: bpwP,
					winnerCount: bpwWinnerCount,
				},
				{
					label: "Fluency proxy: GPT-2 perplexity",
					caveat:
						"Model predictability, not reader-facing naturalness or human authorship; unusually low perplexity can also characterize AI text. Shown as the mean, though this pipeline's own metrics service flags the median as more representative because of a long right tail (see median below).",
					ours: ourBlock?.perplexity_gpt2_mean ?? null,
					zlg: zlgBlock?.perplexity_gpt2_mean ?? null,
					lowerIsBetter: true,
					winner: perplexityWin.winner,
					pValue: pairedInferenceP(paired.perplexity_gpt2),
					winnerCount: perplexityWin.count,
					secondary: {
						label: "clustered median",
						ours: ourBlock?.perplexity_gpt2_median ?? null,
						zlg: zlgBlock?.perplexity_gpt2_median ?? null,
					},
				},
				{
					label: "Topical-fit proxy: KL vs matched post",
					caveat:
						"Word-distribution overlap with the thread including nested replies (baselines rebuilt to match BLEU/ROUGE reference walk). Not reader-facing naturalness; treat as directional.",
					ours: ourBlock?.kl_matched_post_mean ?? null,
					zlg: zlgBlock?.kl_matched_post_mean ?? null,
					lowerIsBetter: true,
					winner: klMatchedWin.winner,
					pValue: pairedInferenceP(paired.kl_matched_post),
					winnerCount: klMatchedWin.count,
				},
				{
					label: "Topical-fit proxy: JSD vs matched post",
					caveat:
						"Symmetric word-distribution overlap with the thread including nested replies (baselines rebuilt). Same caveats as KL.",
					ours: ourBlock?.jsd_matched_post_mean ?? null,
					zlg: zlgBlock?.jsd_matched_post_mean ?? null,
					lowerIsBetter: true,
					winner: jsdMatchedWin.winner,
					pValue: pairedInferenceP(paired.jsd_matched_post),
					winnerCount: jsdMatchedWin.count,
				},
				{
					label: "Distributional proxy: KL vs global corpus",
					caveat:
						"Word-distribution overlap with the corpus baseline including nested replies (baselines rebuilt). Treat as directional.",
					ours: ourBlock?.kl_global_corpus_mean ?? null,
					zlg: zlgBlock?.kl_global_corpus_mean ?? null,
					lowerIsBetter: true,
					winner: klGlobalWin.winner,
					pValue: pairedInferenceP(paired.kl_global_corpus),
					winnerCount: klGlobalWin.count,
				},
				{
					label: "Distributional proxy: JSD vs global corpus",
					caveat:
						"Symmetric word-distribution overlap with the corpus baseline including nested replies (baselines rebuilt). Treat as directional.",
					ours: ourBlock?.jsd_global_corpus_mean ?? null,
					zlg: zlgBlock?.jsd_global_corpus_mean ?? null,
					lowerIsBetter: true,
					winner: jsdGlobalWin.winner,
					pValue: pairedInferenceP(paired.jsd_global_corpus),
					winnerCount: jsdGlobalWin.count,
				},
				{
					label: "Average comment length",
					caveat:
						"Mean whitespace-delimited word count per generated comment. Longer text can affect distributional and lexical metrics, so interpret those comparisons alongside this length difference.",
					ours: ourBlock?.word_count_mean ?? null,
					zlg: zlgBlock?.word_count_mean ?? null,
					unit: "words",
					winner: commentLengthWin.winner,
					pValue: pairedInferenceP(paired.word_count),
					winnerCount: commentLengthWin.count,
				},
				{
					label: "Lexical repetition ratio",
					caveat:
						"Repeated word-type share (1 - unique-token ratio). Lower is better; output length remains a confound.",
					ours: ourBlock?.repetition_ratio_mean ?? null,
					zlg: zlgBlock?.repetition_ratio_mean ?? null,
					lowerIsBetter: true,
					winner: repetitionWin.winner,
					pValue: pairedInferenceP(paired.repetition_ratio),
					winnerCount: repetitionWin.count,
				},
				{
					label: "MATTR (rescaled 0–100)",
					caveat:
						"Relabeled: on this run LQI reduces exactly to 55·MATTR + 45 (max_bigram_repeat is constantly 1 and length-sanity is flat). Same signal as lexical diversity — not an independent quality finding.",
					ours: ourBlock?.lexical_quality_index_mean ?? null,
					zlg: zlgBlock?.lexical_quality_index_mean ?? null,
					winner: lexicalQualityWin.winner,
					pValue: pairedInferenceP(paired.lexical_quality_index),
					winnerCount: lexicalQualityWin.count,
				},
				{
					label: "Reference overlap: BLEU",
					caveat:
						"Literal n-gram overlap with the matched human comment. ZLG's cover sentence is drawn from the thread, so it can regurgitate the BLEU reference (5.9% of ZLG rows share a 5-gram with the reference vs 0.3% for ours; 12 ZLG rows have BLEU>10). Mean gaps are outlier-driven — see median.",
					ours: ourBlock?.bleu_mean ?? null,
					zlg: zlgBlock?.bleu_mean ?? null,
					winner: bleuWin.winner,
					pValue: pairedInferenceP(paired.bleu),
					winnerCount: bleuWin.count,
					secondary: {
						label: "median",
						ours: ourBlock?.bleu_median ?? null,
						zlg: zlgBlock?.bleu_median ?? null,
					},
				},
				{
					label: "Reference overlap: ROUGE-L",
					caveat:
						"Longest-subsequence overlap with the matched human comment. Same thread-copy bias as BLEU: ZLG can regurgitate the cover/reference sentence from the thread, inflating overlap relative to open generation.",
					ours: ourBlock?.rougeL_mean ?? null,
					zlg: zlgBlock?.rougeL_mean ?? null,
					winner: rougeLWin.winner,
					pValue: pairedInferenceP(paired.rougeL),
					winnerCount: rougeLWin.count,
				},
				{
					label: "Semantic reference precision: BERTScore P",
					caveat:
						"Contextual precision against the matched human comment (baseline-rescaled). Thread-copy bias still applies — ZLG can regurgitate cover/reference text from the thread. Higher is better; treat small gaps as weak evidence.",
					ours: ourBlock?.bertscore_precision_mean ?? null,
					zlg: zlgBlock?.bertscore_precision_mean ?? null,
					winner: bertscorePrecisionWin.winner,
					pValue: pairedInferenceP(paired.bertscore_precision),
					winnerCount: bertscorePrecisionWin.count,
				},
				{
					label: "Semantic reference recall: BERTScore R",
					caveat:
						"Baseline-rescaled recall against the matched human comment. Same thread-copy caveats as BERTScore P.",
					ours: ourBlock?.bertscore_recall_mean ?? null,
					zlg: zlgBlock?.bertscore_recall_mean ?? null,
					winner: bertscoreRecallWin.winner,
					pValue: pairedInferenceP(paired.bertscore_recall),
					winnerCount: bertscoreRecallWin.count,
				},
				{
					label: "Semantic reference similarity: BERTScore F1",
					caveat:
						"Baseline-rescaled contextual similarity to the matched human comment (roberta-large). Thread-copy bias applies. Scores are no longer compressed near the old ~0.83 raw-cosine floor.",
					ours: ourBlock?.bertscore_f1_mean ?? null,
					zlg: zlgBlock?.bertscore_f1_mean ?? null,
					winner: bertscoreWin.winner,
					pValue: pairedInferenceP(paired.bertscore_f1),
					winnerCount: bertscoreWin.count,
				},
				{
					label: "Within-post self-consistency",
					ours: ourBlock?.self_consistency_mean ?? null,
					zlg: zlgBlock?.self_consistency_mean ?? null,
					lowerIsBetter: true,
					winner: selfConsistencyWin.winner,
					pValue: pairedInferenceP(paired.self_consistency),
					winnerCount: [
						`${rowLevel.self_consistency?.n ?? 0}/${rowLevel.paired_n ?? 0} eligible`,
						selfConsistencyWin.count,
					]
						.filter(Boolean)
						.join(" · "),
				},
			]
		: [];

	// ---- top-of-page summary table (all metrics, ours vs zlg) ----
	const summaryRows: SummaryTableRow[] = [
		...metricRows.map(
			(m): SummaryTableRow => ({
				label: m.label,
				ours:
					m.ours === null
						? "n/a"
						: `${fmtNum(m.ours)}${m.unit ? ` ${m.unit}` : ""}`,
				zlg:
					m.zlg === null
						? "n/a"
						: `${fmtNum(m.zlg)}${m.unit ? ` ${m.unit}` : ""}`,
				winner: m.winner,
				direction:
					m.lowerIsBetter === undefined
						? undefined
						: m.lowerIsBetter
							? "lower"
							: "higher",
				detail: [
					m.winnerCount,
					m.pValue !== null ? `p=${fmtP(m.pValue)}` : null,
				]
					.filter(Boolean)
					.join(" · "),
				caveat: m.caveat,
				secondary: m.secondary
					? `${m.secondary.label}: ${fmtNum(m.secondary.ours)} vs ${fmtNum(m.secondary.zlg)}`
					: undefined,
			}),
		),
		{
			label: "Reference overlap: ROUGE-1",
			ours: fmtNum(ourBlock?.rouge1_mean),
			zlg: fmtNum(zlgBlock?.rouge1_mean),
			winner: winnerInfo(paired.rouge1).winner,
			direction: "higher",
			detail: `Holm p=${fmtP(pairedInferenceP(paired.rouge1))}`,
			caveat:
				"Same single-reference / thread-copy caveats as ROUGE-L; ZLG cover text can overlap the matched comment.",
		},
		{
			label: "Reference overlap: ROUGE-2",
			ours: fmtNum(ourBlock?.rouge2_mean),
			zlg: fmtNum(zlgBlock?.rouge2_mean),
			winner: winnerInfo(paired.rouge2).winner,
			direction: "higher",
			detail: `Holm p=${fmtP(pairedInferenceP(paired.rouge2))}`,
			caveat:
				"Same single-reference / thread-copy caveats as ROUGE-L; ZLG cover text can overlap the matched comment.",
		},
	];

	// ---- sample browser ----
	const pairedByPairId = new Map<
		number,
		{ our_method?: PairedRow; zlg?: PairedRow }
	>();
	for (const r of pairedRows) {
		if (r.pair_id === undefined || !r.method) continue;
		const entry = pairedByPairId.get(r.pair_id) ?? {};
		if (r.method === "our_method") entry.our_method = r;
		if (r.method === "zlg") entry.zlg = r;
		pairedByPairId.set(r.pair_id, entry);
	}
	const samples: SampleCard[] = [...pairedByPairId.entries()]
		.filter(([, entry]) => entry.our_method && entry.zlg)
		.map(([pairId, entry]) => {
			const zlgRow = entry.zlg;
			return {
				key: String(pairId),
				postId: zlgRow?.post_id ?? "n/a",
				sampleIndex: zlgRow?.sample_index,
				ourBits: entry.our_method?.total_embedded_bits,
				zlgBits: zlgRow?.total_embedded_bits,
				coverPreview:
					firstLine(
						zlgRow?.thread_context ?? entry.our_method?.thread_context,
					) || undefined,
				ourText: entry.our_method?.stegotext ?? "n/a",
				zlgText: zlgRow?.stegotext ?? "n/a",
				ourQuality: entry.our_method
					? {
							bleu: entry.our_method.bleu,
							rougeL: entry.our_method.rougeL,
							bertscore_f1: entry.our_method.bertscore_f1,
						}
					: undefined,
				zlgQuality: entry.zlg
					? {
							bleu: entry.zlg.bleu,
							rougeL: entry.zlg.rougeL,
							bertscore_f1: entry.zlg.bertscore_f1,
						}
					: undefined,
			};
		})
		.sort((a, b) => Number(a.key) - Number(b.key));

	// ---- reuse diagnostics (post reuse was required to reach the sample target) ----
	const reuseBuckets = new Map<number, number>();
	let postsWithDuplicateText = 0;
	for (const p of diversityGuard?.posts ?? []) {
		reuseBuckets.set(p.samples, (reuseBuckets.get(p.samples) ?? 0) + 1);
		if (p.unique_ratio < 1) postsWithDuplicateText += 1;
	}
	const reuseRows = [...reuseBuckets.entries()].sort((a, b) => a[0] - b[0]);
	const totalPostsInDataset = diversityGuard?.posts?.length ?? 0;

	return {
		progress,
		summary,
		rows,
		acceptedRows,
		failedRows,
		skippedRows,
		attemptedRows,
		topStages,
		metricsSummary,
		ourBlock,
		zlgBlock,
		paired,
		rowLevel,
		diversityGuard,
		independence,
		reliability,
		shownAttempts,
		shownAcceptance,
		shownSkipped,
		pairedRows,
		pairedRowsSource,
		codexJudgeSummary,
		codexPilotAudit,
		codexJudgments,
		codexJudgeProgress,
		bpwOursAllMean,
		bpwZlgAllMean,
		metricRows,
		summaryRows,
		samples,
		reuseRows,
		totalPostsInDataset,
		postsWithDuplicateText,
	};
}
