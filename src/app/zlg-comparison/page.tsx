import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { OvernightFindingsShell } from "../overnight-findings/overnight-findings-shell";
import {
	type MetricCardData,
	MetricsGrid,
	OURS_COLOR,
	ZLG_COLOR,
} from "./_components/metric-bar-chart";
import {
	type HistogramBin,
	PerplexityHistogram,
} from "./_components/perplexity-histogram";
import { SampleBrowser, type SampleCard } from "./_components/sample-browser";
import {
	SummaryTable,
	type SummaryTableRow,
} from "./_components/summary-table";

/** Mirrors FailureStage in services/zlg_comparison_service.py. */
type FailureStage =
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
	rouge1_mean?: number;
	rouge2_mean?: number;
	rougeL_mean?: number;
	bertscore_precision_mean?: number;
	bertscore_f1_mean?: number;
	self_consistency_mean?: number;
};

type PairedStat = {
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

type MetricsSummary = {
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
};

/**
 * Point at a different benchmark run without editing source. Re-runs land in a
 * new directory, so hardcoding one meant the dashboard silently kept rendering
 * the stale run after every rebuild.
 */
const RUN_DIR =
	process.env.ZLG_RUN_DIR ??
	"D:\\Master\\code\\stego\\stego-side-wing\\metrics\\zlg_comparison_runs\\zlg_batch_scale300";
const RESULTS_JSONL = path.join(RUN_DIR, "results.jsonl");
const PROGRESS_JSON = path.join(RUN_DIR, "progress.json");
const SUMMARY_JSON = path.join(RUN_DIR, "summary.json");
const COMPARISON_DIR = path.join(RUN_DIR, "comparison_dataset");
const METRICS_SUMMARY_JSON = path.join(COMPARISON_DIR, "summary.json");
const PAIRED_ROWS_JSONL = path.join(COMPARISON_DIR, "paired_rows.jsonl");

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

function firstLine(value?: string): string {
	if (!value) return "";
	return value.split("\n")[0] ?? value;
}

function fmtNum(value: number | undefined | null, digits = 2): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	return value.toFixed(digits);
}

function fmtP(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	if (value < 0.0001) return value.toExponential(2);
	return value.toFixed(4);
}

function fmtPct(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	return `${(value * 100).toFixed(1)}%`;
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
 * Two-sided exact sign test, same closed form as
 * stego-side-wing/scripts/build_zlg_method_comparison_dataset.py:_sign_test_p_value.
 * Used only for the bits-per-word row below, which isn't part of the
 * Python-side Holm-adjusted family — kept methodologically consistent with
 * it, but reported as a raw, non-adjusted descriptive statistic.
 */
function binomialCoefficient(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	let result = 1;
	for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
	return result;
}

function signTestP(positive: number, negative: number): number | null {
	const total = positive + negative;
	if (total === 0) return null;
	const observed = Math.min(positive, negative);
	let tail = 0;
	for (let k = 0; k <= observed; k++) tail += binomialCoefficient(total, k);
	return Math.min(1, (2 * tail) / 2 ** total);
}

/**
 * Collapse a raw failure `reason` string down to a stable bucket. Several
 * reasons (notably `hide_request_failed`) carry a unique JSON error blob
 * after the first colon, so grouping by the raw string produces one bucket
 * per row instead of one per failure mode.
 */
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

const FAILURE_STAGE_LABELS: Record<FailureStage, string> = {
	none: "accepted",
	harness_extract: "harness — no request sent",
	hide_request: "hide request failed",
	quality_gate: "quality gate rejected",
	capacity: "insufficient capacity",
	leakage_check: "prompt leakage",
	reveal: "reveal / decode failed",
	unknown: "unclassified",
};

function buildHistogram(
	oursValues: number[],
	zlgValues: number[],
	bucketCount = 8,
): HistogramBin[] {
	const all = [...oursValues, ...zlgValues].filter((v) => Number.isFinite(v));
	if (all.length === 0) return [];
	const min = Math.min(...all);
	const max = Math.max(...all);
	if (min === max)
		return [
			{ bin: min.toFixed(0), ours: oursValues.length, zlg: zlgValues.length },
		];
	const width = (max - min) / bucketCount;
	const bins: HistogramBin[] = Array.from({ length: bucketCount }, (_, i) => {
		const lo = min + i * width;
		const hi = min + (i + 1) * width;
		return { bin: `${lo.toFixed(0)}-${hi.toFixed(0)}`, ours: 0, zlg: 0 };
	});
	const bucketIndex = (v: number) =>
		Math.min(bucketCount - 1, Math.floor((v - min) / width));
	for (const v of oursValues) {
		const bin = bins[bucketIndex(v)];
		if (Number.isFinite(v) && bin) bin.ours += 1;
	}
	for (const v of zlgValues) {
		const bin = bins[bucketIndex(v)];
		if (Number.isFinite(v) && bin) bin.zlg += 1;
	}
	return bins;
}

export default async function ZlgComparisonPage() {
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
	const ourBlock =
		metricsSummary?.methods_clustered_by_post?.our_method ??
		metricsSummary?.methods?.our_method;
	const zlgBlock =
		metricsSummary?.methods_clustered_by_post?.zlg ??
		metricsSummary?.methods?.zlg;
	const paired = (metricsSummary?.paired_statistics ?? {}) as Record<
		string,
		PairedStat
	> & {
		paired_n?: number;
		inference_unit?: string;
	};
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
	const lqiMeta = metricsSummary?.lexical_quality_index;

	const pairedRows = readJsonl<PairedRow>(PAIRED_ROWS_JSONL);

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
	const bpwOursMeans: number[] = [];
	const bpwZlgMeans: number[] = [];
	let bpwOursBetter = 0;
	let bpwZlgBetter = 0;
	for (const { our_method, zlg } of bitsPerWordByPost.values()) {
		if (our_method.length === 0 || zlg.length === 0) continue;
		const ourMean = our_method.reduce((a, b) => a + b, 0) / our_method.length;
		const zlgMean = zlg.reduce((a, b) => a + b, 0) / zlg.length;
		bpwOursMeans.push(ourMean);
		bpwZlgMeans.push(zlgMean);
		if (ourMean > zlgMean) bpwOursBetter += 1;
		else if (zlgMean > ourMean) bpwZlgBetter += 1;
	}
	const bpwOursMean = bpwOursMeans.length
		? bpwOursMeans.reduce((a, b) => a + b, 0) / bpwOursMeans.length
		: null;
	const bpwZlgMean = bpwZlgMeans.length
		? bpwZlgMeans.reduce((a, b) => a + b, 0) / bpwZlgMeans.length
		: null;
	const bpwP = signTestP(bpwOursBetter, bpwZlgBetter);
	const bpwWinner: MetricCardData["winner"] =
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
	const repetitionWin = winnerInfo(paired.repetition_ratio, true);
	const lexicalQualityWin = winnerInfo(paired.lexical_quality_index);

	const metricCards: MetricCardData[] = metricsSummary
		? [
				{
					label: "Efficiency: bits per word",
					caveat:
						"The efficiency metric the baseline paper itself reports. Computed directly from per-post word counts and encoded bits; this is a plain sign test, not part of the Holm-adjusted family below.",
					ours: bpwOursMean,
					zlg: bpwZlgMean,
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
						"Measures word-distribution overlap with the thread, not reader-facing naturalness or human authorship. This estimator's gap between the matched post and a random unrelated post is small relative to the gap shown here — treat this row as directional, not decisive.",
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
						"Measures word-distribution overlap with the thread, not reader-facing naturalness or human authorship. This estimator's gap between the matched post and a random unrelated post is small relative to the gap shown here — treat this row as directional, not decisive.",
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
						"Measures word-distribution overlap with the corpus, not reader-facing naturalness or human authorship. This estimator's gap between the matched sample and a different corpus sample is small relative to the gap shown here — treat this row as directional, not decisive.",
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
						"Measures word-distribution overlap with the corpus, not reader-facing naturalness or human authorship. This estimator's gap between the matched sample and a different corpus sample is small relative to the gap shown here — treat this row as directional, not decisive.",
					ours: ourBlock?.jsd_global_corpus_mean ?? null,
					zlg: zlgBlock?.jsd_global_corpus_mean ?? null,
					lowerIsBetter: true,
					winner: jsdGlobalWin.winner,
					pValue: pairedInferenceP(paired.jsd_global_corpus),
					winnerCount: jsdGlobalWin.count,
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
					label: `Lexical quality index (${lqiMeta?.status ?? "handcrafted"} composite, 0-100)`,
					caveat:
						"Diversity + repetition + length-sanity composite; higher is better. On this run it reduces almost entirely to lexical diversity (MATTR) — the repetition and length terms are near-constant across both methods. ~70% of our-method rows and ~45% of ZLG rows sit at the 100.0 ceiling.",
					ours: ourBlock?.lexical_quality_index_mean ?? null,
					zlg: zlgBlock?.lexical_quality_index_mean ?? null,
					winner: lexicalQualityWin.winner,
					pValue: pairedInferenceP(paired.lexical_quality_index),
					winnerCount: lexicalQualityWin.count,
				},
				{
					label: "Reference overlap: BLEU",
					caveat:
						"Literal n-gram overlap with the same matched human comment; higher is better. Single-reference n-gram overlap on short, open-ended comments is low-power by construction; near-zero scores are expected for both methods.",
					ours: ourBlock?.bleu_mean ?? null,
					zlg: zlgBlock?.bleu_mean ?? null,
					winner: bleuWin.winner,
					pValue: pairedInferenceP(paired.bleu),
					winnerCount: bleuWin.count,
				},
				{
					label: "Reference overlap: ROUGE-L",
					caveat:
						"Longest-subsequence overlap with the same matched human comment; higher is better. Single-reference n-gram overlap on short, open-ended comments is low-power by construction; near-zero scores are expected for both methods.",
					ours: ourBlock?.rougeL_mean ?? null,
					zlg: zlgBlock?.rougeL_mean ?? null,
					winner: rougeLWin.winner,
					pValue: pairedInferenceP(paired.rougeL),
					winnerCount: rougeLWin.count,
				},
				{
					label: "Semantic reference precision: BERTScore P",
					caveat:
						"Contextual precision against the matched human comment. Higher is better; this is an open-ended-reference proxy. Unrescaled BERTScore sits near 0.83–0.84 even for unrelated sentence pairs; treat differences under ~0.02 as weak evidence.",
					ours: ourBlock?.bertscore_precision_mean ?? null,
					zlg: zlgBlock?.bertscore_precision_mean ?? null,
					winner: bertscorePrecisionWin.winner,
					pValue: pairedInferenceP(paired.bertscore_precision),
					winnerCount: bertscorePrecisionWin.count,
				},
				{
					label: "Semantic reference similarity: BERTScore F1",
					caveat:
						"Contextual semantic similarity to the same matched human comment; higher is better. Unrescaled BERTScore sits near 0.83–0.84 even for unrelated sentence pairs; treat differences under ~0.02 as weak evidence.",
					ours: ourBlock?.bertscore_f1_mean ?? null,
					zlg: zlgBlock?.bertscore_f1_mean ?? null,
					winner: bertscoreWin.winner,
					pValue: pairedInferenceP(paired.bertscore_f1),
					winnerCount: bertscoreWin.count,
				},
			]
		: [];

	// ---- top-of-page summary table (all metrics, ours vs zlg) ----
	const summaryRows: SummaryTableRow[] = [
		...metricCards.map(
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
			}),
		),
		{
			label: "Reference overlap: ROUGE-1",
			ours: fmtNum(ourBlock?.rouge1_mean),
			zlg: fmtNum(zlgBlock?.rouge1_mean),
			winner: winnerInfo(paired.rouge1).winner,
			direction: "higher",
			detail: `Holm p=${fmtP(pairedInferenceP(paired.rouge1))}`,
		},
		{
			label: "Reference overlap: ROUGE-2",
			ours: fmtNum(ourBlock?.rouge2_mean),
			zlg: fmtNum(zlgBlock?.rouge2_mean),
			winner: winnerInfo(paired.rouge2).winner,
			direction: "higher",
			detail: `Holm p=${fmtP(pairedInferenceP(paired.rouge2))}`,
		},
		{
			label: "Word count",
			ours: fmtNum(ourBlock?.word_count_mean, 1),
			zlg: fmtNum(zlgBlock?.word_count_mean, 1),
			winner: "n/a",
			detail:
				"descriptive only — see 'Efficiency: bits per word' above for the comparison this drives",
		},
	];

	// ---- perplexity histogram ----
	const ourPpl = pairedRows
		.filter((r) => r.method === "our_method")
		.map((r) => r.perplexity_gpt2)
		.filter((v): v is number => typeof v === "number");
	const zlgPpl = pairedRows
		.filter((r) => r.method === "zlg")
		.map((r) => r.perplexity_gpt2)
		.filter((v): v is number => typeof v === "number");
	const histogramBins = buildHistogram(ourPpl, zlgPpl);

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

	return (
		<OvernightFindingsShell>
			<main className="min-h-screen bg-[#0d1117] px-6 py-8 text-slate-100">
				<div className="mx-auto max-w-7xl space-y-8">
					<header className="space-y-2">
						<p className="font-medium text-cyan-300 text-sm uppercase tracking-wider">
							ZLG Comparison Dashboard
						</p>
						<h1 className="font-bold text-3xl">Our Method vs ZLG Baseline</h1>
						<p className="font-mono text-slate-500 text-xs">{RUN_DIR}</p>
					</header>

					<section className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-5">
						<div>
							<h2 className="font-semibold text-lg">Capacity</h2>
							<p className="mt-1 text-slate-400 text-xs">
								Shown as two separate figures, not a head-to-head comparison —
								the two sides use incompatible definitions and neither was
								verified the same way.
							</p>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<Stat
								label="ZLG requested payload"
								sub="Harness-set constant — sized to our own budget, rounded up to whole bytes. Not a measured ZLG capacity."
								value={`${fmtNum(zlgBlock?.total_embedded_bits_mean, 2)} bits`}
							/>
							<Stat
								label="Our selection-channel budget"
								sub="Theoretical upper bound (sum of floor(log2(choices))); not blind-decoded in this run — recovery used the sender's own payload as an oracle."
								value={`${fmtNum(ourBlock?.total_embedded_bits_mean, 2)} bits`}
							/>
						</div>
						{metricsSummary?.capacity_fields_note ? (
							<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100 text-xs leading-relaxed">
								<span className="font-semibold uppercase tracking-wide">
									Note:{" "}
								</span>
								{metricsSummary.capacity_fields_note}
							</div>
						) : null}
					</section>

					<section className="space-y-3">
						<div>
							<h2 className="font-semibold text-lg">
								All metrics at a glance ({paired.paired_n ?? "n/a"} paired post
								clusters, {paired.inference_unit ?? "unique_post_id"})
							</h2>
							<p className="mt-1 text-slate-400 text-xs">
								Every capacity, distributional-proxy, and reference-overlap
								metric this run computed, side by side. Paired p-values are
								Holm-adjusted across the displayed family and computed after
								clustering repeated trials by post (see reuse note below).
							</p>
						</div>
						<SummaryTable rows={summaryRows} />
					</section>

					{metricsSummary ? (
						<section className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 via-transparent to-orange-400/5 p-5">
							<p className="font-semibold text-cyan-200 text-sm uppercase tracking-wide">
								The tradeoff, in one paragraph
							</p>
							<p className="mt-2 text-slate-200 text-sm leading-relaxed">
								Capacity figures for the two methods aren't directly comparable
								(see the note above), so the more meaningful efficiency read is{" "}
								<span className="font-semibold text-orange-300">
									bits per word
								</span>
								: ZLG packs more payload per word of generated text (
								{fmtNum(bpwZlgMean, 3)} vs {fmtNum(bpwOursMean, 3)} bits/word) ,
								which is the efficiency metric the baseline paper itself
								reports. Counting ZLG's own failures as zero gives{" "}
								{fmtNum(reliability?.effective_payload_bits_per_attempt, 1)}{" "}
								payload bits per attempt across {shownAttempts} trials that
								reached the server ({fmtPct(shownAcceptance)} acceptance rate
								{shownSkipped > 0
									? `; a further ${shownSkipped} rows never reached it and are excluded`
									: ""}
								). ZLG scores{" "}
								<span className="font-semibold text-orange-300">
									lower on GPT-2 perplexity
								</span>
								, a fluency proxy that does not measure reader-facing
								naturalness or human authorship; KL/JSD topical-fit proxies show
								no statistically clear difference (see below). Our method
								produces{" "}
								<span className="font-semibold text-cyan-300">longer text</span>{" "}
								({fmtNum(ourBlock?.word_count_mean, 1)} vs{" "}
								{fmtNum(zlgBlock?.word_count_mean, 1)} words) with a slightly
								higher lexical-quality index — largely the same
								lexical-diversity signal as the repetition-ratio row below, not
								an independent finding.
							</p>
						</section>
					) : null}

					<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
						<Stat label="Rows Parsed" value={String(rows.length)} />
						<Stat
							label="ZLG Attempts"
							sub={
								skippedRows.length > 0
									? `${skippedRows.length} skipped before any request`
									: undefined
							}
							value={String(attemptedRows.length)}
						/>
						<Stat label="Accepted" value={String(acceptedRows.length)} />
						<Stat
							label="Failed (of attempts)"
							value={String(failedRows.length - skippedRows.length)}
						/>
						<Stat
							label="Paired Samples"
							value={String(paired.paired_n ?? "n/a")}
						/>
						<Stat
							label="Last Updated"
							value={String(
								summary?.updated_at_utc ?? progress?.updated_at_utc ?? "n/a",
							).slice(0, 19)}
						/>
					</section>

					{metricCards.length > 0 ? (
						<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h2 className="font-semibold text-lg">
									Efficiency &amp; distributional proxies (
									{paired.paired_n ?? "n/a"} paired samples)
								</h2>
								<div className="flex items-center gap-3 text-xs">
									<span className="flex items-center gap-1 text-slate-400">
										<span style={{ color: OURS_COLOR }}>●</span> Our Method
									</span>
									<span className="flex items-center gap-1 text-slate-400">
										<span style={{ color: ZLG_COLOR }}>●</span> ZLG Baseline
									</span>
								</div>
							</div>
							<p className="text-amber-200/75 text-xs leading-relaxed">
								Perplexity is a model-predictability/fluency proxy; KL and JSD
								are word-distribution topical-fit proxies. None is a
								reader-facing measure of naturalness or human authorship.
							</p>

							<MetricsGrid metrics={metricCards} />

							{histogramBins.length > 0 ? (
								<PerplexityHistogram bins={histogramBins} />
							) : null}
						</section>
					) : null}

					{diversityGuard ? (
						<section className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-5">
							<div>
								<h2 className="font-semibold text-lg">
									Post reuse &amp; sample independence
								</h2>
								<p className="mt-1 text-slate-400 text-xs">
									The researched-post pool ran short of what {"~"}
									{reliability?.attempted ?? "500+"} generation attempts needed
									(a live search API quota was exhausted mid-run), so many posts
									were sampled multiple times with{" "}
									<code className="rounded bg-black/30 px-1">
										--allow-post-reuse
									</code>
									. Reported statistics above are computed post-clustered (each
									unique post weighted once) specifically to stay valid under
									this reuse; treat row-level numbers as descriptive only.
								</p>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<Stat
									label="Unique posts in dataset"
									value={String(totalPostsInDataset)}
								/>
								<Stat
									label="Independent clusters"
									value={String(independence?.independent_clusters ?? "n/a")}
								/>
								<Stat
									label="Unique our-method texts"
									value={String(independence?.unique_our_method_texts ?? "n/a")}
								/>
								<Stat
									label="Posts with duplicate text"
									value={`${postsWithDuplicateText} / ${totalPostsInDataset}`}
								/>
							</div>
							{reuseRows.length > 0 ? (
								<div className="overflow-x-auto">
									<table className="w-full text-left text-sm">
										<thead className="text-slate-400">
											<tr className="border-white/10 border-b">
												<th className="py-2 pr-3">Samples per post</th>
												<th className="py-2 pr-3"># of posts</th>
											</tr>
										</thead>
										<tbody>
											{reuseRows.map(([samplesPerPost, count]) => (
												<tr
													className="border-white/5 border-b"
													key={samplesPerPost}
												>
													<td className="py-2 pr-3">{samplesPerPost}</td>
													<td className="py-2 pr-3">{count}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : null}
						</section>
					) : null}

					{metricsSummary?.shared_naturalness_gate ? (
						<section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-1 font-semibold text-lg">
								Shared Naturalness Gate
							</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Both methods scored by the same gate, calibrated to reject
								&lt;5% of human comments. Previously ZLG carried the server's
								own verdict while our method's was hardcoded to pass, so the two
								columns were not comparable. Thresholds:{" "}
								<span className="font-mono">
									{Object.entries(
										metricsSummary.shared_naturalness_gate.thresholds ?? {},
									)
										.map(([k, v]) => `${k}=${v}`)
										.join(", ")}
								</span>
							</p>
							<div className="overflow-x-auto">
								<table className="w-full text-left text-sm">
									<thead className="text-slate-400">
										<tr className="border-white/10 border-b">
											<th className="py-2 pr-3">Method</th>
											<th className="py-2 pr-3">Passed</th>
											<th className="py-2 pr-3">Pass rate</th>
											<th className="py-2 pr-3">Top failed rules</th>
										</tr>
									</thead>
									<tbody>
										{(
											[
												["our_method", OURS_COLOR],
												["zlg", ZLG_COLOR],
											] as const
										).map(([method, color]) => {
											const block =
												metricsSummary.shared_naturalness_gate?.[method];
											return (
												<tr className="border-white/5 border-b" key={method}>
													<td className="py-2 pr-3" style={{ color }}>
														{method}
													</td>
													<td className="py-2 pr-3">
														{block?.passed ?? "n/a"} / {block?.n ?? "n/a"}
													</td>
													<td className="py-2 pr-3">
														{fmtPct(block?.pass_rate)}
													</td>
													<td className="py-2 pr-3 font-mono text-xs">
														{Object.entries(block?.failed_rules ?? {})
															.slice(0, 3)
															.map(([rule, count]) => `${rule}:${count}`)
															.join(", ") || "—"}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</section>
					) : null}

					<section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
						<h2 className="mb-1 font-semibold text-lg">
							Failure Stages ({failedRows.length} total, fully accounted)
						</h2>
						<p className="mb-3 text-slate-400 text-xs">
							Rows at the <span className="font-mono">harness_extract</span>{" "}
							stage never reached the ZLG server — our own cover-sentence
							extraction gave up first — so they are excluded from the
							acceptance rate above.
						</p>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="text-slate-400">
									<tr className="border-white/10 border-b">
										<th className="py-2 pr-3">Count</th>
										<th className="py-2 pr-3">Stage</th>
										<th className="py-2 pr-3">Charged to ZLG?</th>
									</tr>
								</thead>
								<tbody>
									{topStages.map(([stage, count]) => (
										<tr className="border-white/5 border-b" key={stage}>
											<td className="py-2 pr-3">{count}</td>
											<td className="py-2 pr-3 font-mono text-xs">
												{stage}
												<span className="ml-2 text-slate-500">
													{FAILURE_STAGE_LABELS[stage]}
												</span>
											</td>
											<td className="py-2 pr-3 text-xs">
												{stage === "harness_extract" ? (
													<span className="text-amber-300">no</span>
												) : (
													"yes"
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					<section className="space-y-3">
						<h2 className="font-semibold text-lg">
							Side-by-Side Examples ({samples.length})
						</h2>
						<SampleBrowser samples={samples} />
					</section>
				</div>
			</main>
		</OvernightFindingsShell>
	);
}

function Stat({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<div className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
			<p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-2 font-bold text-2xl">{value}</p>
			{sub ? <p className="mt-1 text-slate-500 text-xs">{sub}</p> : null}
		</div>
	);
}
