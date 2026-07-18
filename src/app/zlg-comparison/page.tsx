import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { OvernightFindingsShell } from "../overnight-findings/overnight-findings-shell";
import { DetectionRateChart } from "./_components/detection-chart";
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

type ResultRow = {
	post_id?: string;
	sample_index?: number;
	slot?: number;
	payload?: string;
	cover_texts?: string[];
	stegotext?: string | null;
	accepted?: boolean;
	reason?: string | null;
	source_output_file?: string;
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
	lexical_quality_index_mean?: number;
};

type PairedStat = {
	n: number;
	mean_delta_zlg_minus_our: number;
	zlg_greater_count: number;
	our_greater_count: number;
	ties: number;
	two_sided_sign_test_p: number | null;
};

type MetricsSummary = {
	rows?: number;
	paired_posts?: number;
	methods?: { our_method?: MethodMetricBlock; zlg?: MethodMetricBlock };
	paired_statistics?:
		| ({ paired_n?: number } & Record<string, PairedStat>)
		| Record<string, never>;
	capacity_fields_note?: string;
	human_likeness_preference?: HumanLikenessSummary;
	thread_relevance?: ThreadQualitySummary;
	writing_quality?: ThreadQualitySummary;
};

type ThreadQualitySummary = {
	valid_judgments?: number;
	independent_paired_post_clusters?: number;
	method_row_level_means?: { our_method?: number; zlg?: number };
	our_minus_zlg_post_cluster_mean?: number | null;
	our_minus_zlg_bootstrap_95_ci?: { lower: number; upper: number } | null;
	two_sided_sign_test_p?: number | null;
	provenance?: Array<{
		provider?: string;
		judge_model?: string;
		judge_prompt_sha256?: string;
	}>;
};

type HumanLikenessSummary = {
	primary_inference_unit?: string;
	valid_judgments?: number;
	independent_post_clusters?: number;
	our_method_score?: number | null;
	our_method_score_bootstrap_95_ci?: { lower: number; upper: number } | null;
	post_cluster_wins?: number;
	post_cluster_losses?: number;
	post_cluster_ties?: number;
	two_sided_sign_test_p?: number | null;
	provenance?: Array<{
		provider?: string;
		judge_model?: string;
		judge_prompt_sha256?: string;
	}>;
};

type SusMethodStat = {
	n: number;
	n_valid: number;
	n_correct: number;
	detection_rate: number | null;
	chance_rate: number;
};

type SusSummary = {
	judge_model?: string;
	n_decoys?: number;
	chance_detection_rate?: number;
	method_stats?: { our_method?: SusMethodStat; zlg?: SusMethodStat };
	paired_statistics?: {
		paired_n: number;
		our_method_detected_only: number;
		zlg_detected_only: number;
		both_detected: number;
		neither_detected: number;
		mcnemar_two_sided_p: number | null;
	};
};

type SusResultRow = {
	pair_id?: number;
	post_id?: string;
	method?: string;
	target_position?: number;
	predicted_index?: number;
	correct?: boolean;
	reason?: string;
	valid?: boolean;
};

type PairedRow = {
	pair_id?: number;
	post_id?: string;
	sample_index?: number;
	slot?: number;
	method?: string;
	stegotext?: string;
	perplexity_gpt2?: number;
};

const RUN_DIR =
	"D:\\Master\\code\\stego\\stego-side-wing\\metrics\\zlg_comparison_runs\\zlg_demo_20260712_v6_200";
const RESULTS_JSONL = path.join(RUN_DIR, "results.jsonl");
const PROGRESS_JSON = path.join(RUN_DIR, "progress.json");
const SUMMARY_JSON = path.join(RUN_DIR, "summary.json");
const COMPARISON_DIR = path.join(RUN_DIR, "comparison_dataset");
const METRICS_SUMMARY_JSON = path.join(COMPARISON_DIR, "summary.json");
const PAIRED_ROWS_JSONL = path.join(COMPARISON_DIR, "paired_rows.jsonl");
const SUS_SUMMARY_JSON = path.join(
	COMPARISON_DIR,
	"sus_detection_summary.json",
);
const SUS_RESULTS_JSONL = path.join(
	COMPARISON_DIR,
	"sus_detection_results.jsonl",
);
const HUMAN_LIKENESS_SUMMARY_JSON = path.join(
	COMPARISON_DIR,
	"human_likeness_summary.json",
);
const THREAD_RELEVANCE_SUMMARY_JSON = path.join(
	COMPARISON_DIR,
	"thread_relevance_summary.json",
);
const WRITING_QUALITY_SUMMARY_JSON = path.join(
	COMPARISON_DIR,
	"writing_quality_summary.json",
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

function clusteredDetectionRate(
	rows: SusResultRow[],
	method: string,
): { n: number; rate: number | null } {
	const posts = new Map<string, boolean[]>();
	for (const row of rows) {
		if (row.method !== method || !row.valid || row.post_id === undefined)
			continue;
		const values = posts.get(row.post_id) ?? [];
		values.push(Boolean(row.correct));
		posts.set(row.post_id, values);
	}
	const rates = [...posts.values()].map(
		(values) => values.filter(Boolean).length / values.length,
	);
	return {
		n: rates.length,
		rate: rates.length
			? rates.reduce((total, value) => total + value, 0) / rates.length
			: null,
	};
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

	const reasonCounts = new Map<string, number>();
	for (const row of failedRows) {
		const key = row.reason ?? "unknown";
		reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
	}
	const topReasons = [...reasonCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);

	const metricsSummary = readJson(
		METRICS_SUMMARY_JSON,
	) as MetricsSummary | null;
	const ourBlock = metricsSummary?.methods?.our_method;
	const zlgBlock = metricsSummary?.methods?.zlg;
	const paired = (metricsSummary?.paired_statistics ?? {}) as Record<
		string,
		PairedStat
	> & {
		paired_n?: number;
	};

	const susSummary = readJson(SUS_SUMMARY_JSON) as SusSummary | null;
	const susResults = readJsonl<SusResultRow>(SUS_RESULTS_JSONL);
	const humanLikenessFile = readJson(
		HUMAN_LIKENESS_SUMMARY_JSON,
	) as HumanLikenessSummary | null;
	const humanLikeness =
		metricsSummary?.human_likeness_preference ?? humanLikenessFile;
	const threadRelevance =
		metricsSummary?.thread_relevance ??
		(readJson(THREAD_RELEVANCE_SUMMARY_JSON) as ThreadQualitySummary | null);
	const writingQuality =
		metricsSummary?.writing_quality ??
		(readJson(WRITING_QUALITY_SUMMARY_JSON) as ThreadQualitySummary | null);
	const ourClusteredDetection = clusteredDetectionRate(
		susResults,
		"our_method",
	);
	const zlgClusteredDetection = clusteredDetectionRate(susResults, "zlg");
	const ourSusCorrect = susResults.filter(
		(r) => r.method === "our_method" && r.correct,
	);
	const zlgSusCorrect = susResults.filter(
		(r) => r.method === "zlg" && r.correct,
	);

	// ---- metric comparison cards ----
	const capacityWin = winnerInfo(paired.total_embedded_bits);
	const perplexityWin = winnerInfo(paired.perplexity_gpt2, true);
	const klMatchedWin = winnerInfo(paired.kl_matched_post, true);
	const jsdMatchedWin = winnerInfo(paired.jsd_matched_post, true);
	const klGlobalWin = winnerInfo(paired.kl_global_corpus, true);
	const jsdGlobalWin = winnerInfo(paired.jsd_global_corpus, true);
	const metricCards: MetricCardData[] = metricsSummary
		? [
				{
					label: "Capacity: bits / comment (pure channel)",
					ours: ourBlock?.total_embedded_bits_mean ?? null,
					zlg: zlgBlock?.total_embedded_bits_mean ?? null,
					unit: "bits",
					winner: capacityWin.winner,
					pValue: paired.total_embedded_bits?.two_sided_sign_test_p ?? null,
					winnerCount: capacityWin.count,
				},
				{
					label: "Perplexity (GPT-2)",
					ours: ourBlock?.perplexity_gpt2_mean ?? null,
					zlg: zlgBlock?.perplexity_gpt2_mean ?? null,
					lowerIsBetter: true,
					winner: perplexityWin.winner,
					pValue: paired.perplexity_gpt2?.two_sided_sign_test_p ?? null,
					winnerCount: perplexityWin.count,
				},
				{
					label: "KL divergence vs matched post",
					ours: ourBlock?.kl_matched_post_mean ?? null,
					zlg: zlgBlock?.kl_matched_post_mean ?? null,
					lowerIsBetter: true,
					winner: klMatchedWin.winner,
					pValue: paired.kl_matched_post?.two_sided_sign_test_p ?? null,
					winnerCount: klMatchedWin.count,
				},
				{
					label: "JSD vs matched post",
					ours: ourBlock?.jsd_matched_post_mean ?? null,
					zlg: zlgBlock?.jsd_matched_post_mean ?? null,
					lowerIsBetter: true,
					winner: jsdMatchedWin.winner,
					pValue: paired.jsd_matched_post?.two_sided_sign_test_p ?? null,
					winnerCount: jsdMatchedWin.count,
				},
				{
					label: "KL divergence vs global corpus",
					ours: ourBlock?.kl_global_corpus_mean ?? null,
					zlg: zlgBlock?.kl_global_corpus_mean ?? null,
					lowerIsBetter: true,
					winner: klGlobalWin.winner,
					pValue: paired.kl_global_corpus?.two_sided_sign_test_p ?? null,
					winnerCount: klGlobalWin.count,
				},
				{
					label: "JSD vs global corpus",
					ours: ourBlock?.jsd_global_corpus_mean ?? null,
					zlg: zlgBlock?.jsd_global_corpus_mean ?? null,
					lowerIsBetter: true,
					winner: jsdGlobalWin.winner,
					pValue: paired.jsd_global_corpus?.two_sided_sign_test_p ?? null,
					winnerCount: jsdGlobalWin.count,
				},
			]
		: [];

	// ---- perplexity histogram ----
	const pairedRows = readJsonl<PairedRow>(PAIRED_ROWS_JSONL);
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
	const resultsByKey = new Map<string, ResultRow>();
	for (const r of acceptedRows) {
		if (r.post_id !== undefined && r.slot !== undefined) {
			resultsByKey.set(`${r.post_id}:${r.slot}`, r);
		}
	}
	const susByKey = new Map<string, SusResultRow>();
	for (const r of susResults) {
		susByKey.set(`${r.pair_id}:${r.method}`, r);
	}
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
			const sourceResult =
				zlgRow?.post_id !== undefined && zlgRow?.slot !== undefined
					? resultsByKey.get(`${zlgRow.post_id}:${zlgRow.slot}`)
					: undefined;
			const ourSusRaw = susByKey.get(`${pairId}:our_method`);
			const zlgSusRaw = susByKey.get(`${pairId}:zlg`);
			return {
				key: String(pairId),
				postId: zlgRow?.post_id ?? "n/a",
				sampleIndex: zlgRow?.sample_index,
				payload: sourceResult?.payload,
				coverPreview: firstLine(sourceResult?.cover_texts?.[0]) || undefined,
				ourText: entry.our_method?.stegotext ?? "n/a",
				zlgText: zlgRow?.stegotext ?? "n/a",
				ourSus: ourSusRaw?.valid
					? { correct: Boolean(ourSusRaw.correct), reason: ourSusRaw.reason }
					: null,
				zlgSus: zlgSusRaw?.valid
					? { correct: Boolean(zlgSusRaw.correct), reason: zlgSusRaw.reason }
					: null,
			};
		})
		.sort((a, b) => Number(a.key) - Number(b.key));

	// ---- narrative summary ----
	const capacityX =
		ourBlock?.total_embedded_bits_mean && zlgBlock?.total_embedded_bits_mean
			? (
					ourBlock.total_embedded_bits_mean / zlgBlock.total_embedded_bits_mean
				).toFixed(1)
			: null;
	const ourDetection = susSummary?.method_stats?.our_method?.detection_rate;
	const zlgDetection = susSummary?.method_stats?.zlg?.detection_rate;

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

					{metricsSummary && susSummary ? (
						<section className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 via-transparent to-orange-400/5 p-5">
							<p className="font-semibold text-cyan-200 text-sm uppercase tracking-wide">
								The tradeoff, in one paragraph
							</p>
							<p className="mt-2 text-slate-200 text-sm leading-relaxed">
								Our method embeds{" "}
								<span className="font-semibold text-cyan-300">
									{capacityX ? `${capacityX}x` : "far"} more payload
								</span>{" "}
								per comment than the ZLG baseline (
								{fmtNum(ourBlock?.total_embedded_bits_mean, 1)} vs{" "}
								{fmtNum(zlgBlock?.total_embedded_bits_mean, 1)} bits). ZLG's
								shorter, simpler completions score{" "}
								<span className="font-semibold text-orange-300">
									lower (more &ldquo;natural&rdquo;) on GPT-2 perplexity and
									KL/JSD divergence
								</span>
								, a statistical text-distribution proxy. But when an LLM judge
								actually reads each comment embedded in its real thread
								alongside 9 genuine replies, it catches ZLG{" "}
								<span className="font-semibold text-cyan-300">
									{ourDetection && zlgDetection
										? `${(zlgDetection / ourDetection).toFixed(1)}x more often`
										: "more often"}
								</span>{" "}
								than our method ({fmtPct(zlgDetection)} vs{" "}
								{fmtPct(ourDetection)} detection rate, 10% = chance). Two
								different naturalness proxies disagree — worth sitting with
								rather than picking whichever favors one method.
							</p>
						</section>
					) : null}

					<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
						<Stat label="Rows Parsed" value={String(rows.length)} />
						<Stat label="Accepted" value={String(acceptedRows.length)} />
						<Stat label="Failed" value={String(failedRows.length)} />
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

					{humanLikeness || susSummary ? (
						<section className="space-y-4 rounded-xl border border-cyan-400/25 bg-white/[0.04] p-5">
							<div>
								<p className="font-semibold text-cyan-200 text-sm uppercase tracking-wide">
									Reader-facing naturalness (headline)
								</p>
								<p className="mt-1 text-slate-400 text-xs">
									Posts are the independent units; repeated samples are averaged
									within each post.
								</p>
							</div>
							<div className="grid gap-3 lg:grid-cols-2">
								<HeadlineMetric
									detail={
										humanLikeness
											? `Our-method score; 95% CI ${fmtPct(humanLikeness.our_method_score_bootstrap_95_ci?.lower)}–${fmtPct(humanLikeness.our_method_score_bootstrap_95_ci?.upper)} · ${humanLikeness.independent_post_clusters ?? "n/a"} posts · p=${fmtP(humanLikeness.two_sided_sign_test_p)}`
											: "Awaiting cached judge results; no live judge is run by this page."
									}
									label="M1 · Human-likeness A/B"
									value={
										humanLikeness
											? fmtPct(humanLikeness.our_method_score)
											: "Not run"
									}
								/>
								<HeadlineMetric
									detail={`Lower is harder to spot · ${ourClusteredDetection.n || zlgClusteredDetection.n || "n/a"} post clusters · row-level McNemar p=${fmtP(susSummary?.paired_statistics?.mcnemar_two_sided_p)}`}
									label="M2 · Synthetic detection"
									value={`${fmtPct(ourClusteredDetection.rate)} ours · ${fmtPct(zlgClusteredDetection.rate)} ZLG`}
								/>
							</div>
							{humanLikeness?.provenance?.length ? (
								<p className="font-mono text-slate-500 text-xs">
									Judge provenance:{" "}
									{humanLikeness.provenance
										.map(
											(item) =>
												`${item.provider ?? "?"}/${item.judge_model ?? "?"} prompt ${item.judge_prompt_sha256?.slice(0, 12) ?? "?"}`,
										)
										.join("; ")}
								</p>
							) : null}
						</section>
					) : null}

					<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
						<div>
							<h2 className="font-semibold text-lg">
								Naturalness, separated into two axes
							</h2>
							<p className="mt-1 text-slate-400 text-xs">
								M3 measures fit to the thread. M4 and M5 measure writing quality
								independently of topical fit; higher is better.
							</p>
						</div>
						<div className="grid gap-3 lg:grid-cols-3">
							<QualityAxisCard
								label="M3 · Thread relevance"
								summary={threadRelevance}
							/>
							<QualityAxisCard
								label="M4 · Writing quality (judge)"
								summary={writingQuality}
							/>
							<HeadlineMetric
								detail="Deterministic lexical diversity, repetition, bigram, and length-sanity index · 0–100"
								label="M5 · Lexical quality (objective)"
								value={
									ourBlock?.lexical_quality_index_mean === undefined &&
									zlgBlock?.lexical_quality_index_mean === undefined
										? "Not run"
										: `${fmtNum(ourBlock?.lexical_quality_index_mean, 1)} ours · ${fmtNum(zlgBlock?.lexical_quality_index_mean, 1)} ZLG`
								}
							/>
						</div>
					</section>

					{metricCards.length > 0 ? (
						<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h2 className="font-semibold text-lg">
									Capacity, Perplexity &amp; KL/JSD ({paired.paired_n ?? "n/a"}{" "}
									paired samples)
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

							{metricsSummary?.capacity_fields_note ? (
								<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-amber-100 text-xs leading-relaxed">
									<span className="font-semibold uppercase tracking-wide">
										Correction:{" "}
									</span>
									{metricsSummary.capacity_fields_note}
								</div>
							) : null}

							<MetricsGrid metrics={metricCards} />

							{histogramBins.length > 0 ? (
								<PerplexityHistogram bins={histogramBins} />
							) : null}
						</section>
					) : null}

					{susSummary ? (
						<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
							<div>
								<h2 className="font-semibold text-lg">
									Sus-Detection Metric ({susSummary.judge_model ?? "LLM judge"})
								</h2>
								<p className="text-slate-400 text-xs">
									Each generated comment is mixed with{" "}
									{susSummary.n_decoys ?? 9} real comments from the same thread
									(10 total, shuffled); the judge model must pick the ONE that
									seems synthetic. Lower detection rate = more natural / harder
									to spot.
								</p>
							</div>

							<DetectionRateChart
								chanceRate={susSummary.chance_detection_rate ?? 0.1}
								ourRate={
									susSummary.method_stats?.our_method?.detection_rate ?? null
								}
								zlgRate={susSummary.method_stats?.zlg?.detection_rate ?? null}
							/>

							<div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs">
								<p className="text-slate-400 uppercase tracking-wide">
									Paired comparison (McNemar, n=
									{susSummary.paired_statistics?.paired_n ?? "n/a"})
								</p>
								<p className="mt-2 text-slate-200">
									ZLG-only detected:{" "}
									{susSummary.paired_statistics?.zlg_detected_only ?? "n/a"} |
									Our-method-only detected:{" "}
									{susSummary.paired_statistics?.our_method_detected_only ??
										"n/a"}{" "}
									| Both: {susSummary.paired_statistics?.both_detected ?? "n/a"}{" "}
									| Neither:{" "}
									{susSummary.paired_statistics?.neither_detected ?? "n/a"}
								</p>
								<p className="mt-1 text-slate-400">
									two-sided p ={" "}
									{fmtP(susSummary.paired_statistics?.mcnemar_two_sided_p)}
								</p>
							</div>

							<div className="grid gap-3 lg:grid-cols-2">
								<div className="space-y-2">
									<p className="text-slate-400 text-xs uppercase tracking-wide">
										Why our comments got caught
									</p>
									<ul className="space-y-1 text-xs">
										{ourSusCorrect.slice(0, 3).map((r, idx) => (
											<li
												className="rounded border border-white/10 bg-black/20 p-2"
												key={`our-sus-${r.post_id}-${idx}`}
											>
												<span className="text-slate-500">{r.post_id}:</span>{" "}
												{r.reason}
											</li>
										))}
									</ul>
								</div>
								<div className="space-y-2">
									<p className="text-slate-400 text-xs uppercase tracking-wide">
										Why ZLG comments got caught
									</p>
									<ul className="space-y-1 text-xs">
										{zlgSusCorrect.slice(0, 3).map((r, idx) => (
											<li
												className="rounded border border-white/10 bg-black/20 p-2"
												key={`zlg-sus-${r.post_id}-${idx}`}
											>
												<span className="text-slate-500">{r.post_id}:</span>{" "}
												{r.reason}
											</li>
										))}
									</ul>
								</div>
							</div>
						</section>
					) : null}

					<section className="rounded-xl border border-white/10 bg-white/[0.04] p-5">
						<h2 className="mb-3 font-semibold text-lg">Top Failure Reasons</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="text-slate-400">
									<tr className="border-white/10 border-b">
										<th className="py-2 pr-3">Count</th>
										<th className="py-2 pr-3">Reason</th>
									</tr>
								</thead>
								<tbody>
									{topReasons.map(([reason, count]) => (
										<tr
											className="border-white/5 border-b"
											key={`${reason}-${count}`}
										>
											<td className="py-2 pr-3">{count}</td>
											<td className="py-2 pr-3 font-mono text-xs">{reason}</td>
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

function HeadlineMetric({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-lg border border-white/10 bg-black/20 p-4">
			<p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-2 font-bold text-2xl text-slate-100">{value}</p>
			<p className="mt-2 text-slate-400 text-xs">{detail}</p>
		</div>
	);
}

function QualityAxisCard({
	label,
	summary,
}: {
	label: string;
	summary: ThreadQualitySummary | null | undefined;
}) {
	const provenance = summary?.provenance?.[0];
	return (
		<HeadlineMetric
			detail={
				summary
					? `Post-cluster Δ ours−ZLG ${fmtNum(summary.our_minus_zlg_post_cluster_mean)} · 95% CI ${fmtNum(summary.our_minus_zlg_bootstrap_95_ci?.lower)}–${fmtNum(summary.our_minus_zlg_bootstrap_95_ci?.upper)} · ${summary.independent_paired_post_clusters ?? "n/a"} posts · p=${fmtP(summary.two_sided_sign_test_p)} · ${provenance?.provider ?? "?"}/${provenance?.judge_model ?? "?"} prompt ${provenance?.judge_prompt_sha256?.slice(0, 12) ?? "?"}`
					: "Awaiting cached judge results; no live judge is run by this page."
			}
			label={label}
			value={
				summary
					? `${fmtNum(summary.method_row_level_means?.our_method)} ours · ${fmtNum(summary.method_row_level_means?.zlg)} ZLG`
					: "Not run"
			}
		/>
	);
}
