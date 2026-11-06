import { OvernightFindingsShell } from "../overnight-findings/overnight-findings-shell";
import { LlmJudgePanel } from "./_components/llm-judge-panel";
import { SampleBrowser } from "./_components/sample-browser";
import {
	OURS_COLOR,
	SummaryTable,
	ZLG_COLOR,
} from "./_components/summary-table";
import {
	FAILURE_STAGE_LABELS,
	loadZlgComparisonData,
	RUN_DIR,
} from "./_lib/data";
import { fmtNum, fmtPct } from "./_lib/format";

export const dynamic = "force-dynamic";

export default async function ZlgComparisonPage() {
	const {
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
		localAcceptanceRate,
		pairedRows,
		codexJudgeSummary,
		codexPilotAudit,
		judgeSubset,
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
		pairedRowsSource,
		metricsRunDir,
		missingArtifacts,
		expandedLogProvenance,
	} = await loadZlgComparisonData();
	const expectedJudgeTasks = codexJudgeProgress.reduce(
		(total, item) => total + (item.total_tasks ?? 0),
		0,
	);
	const completedJudgeTasks = codexJudgeProgress.reduce(
		(total, item) => total + (item.valid_completed ?? 0),
		0,
	);
	const failedJudgeTasks = codexJudgeProgress.reduce(
		(total, item) => total + (item.failed_tasks ?? 0),
		0,
	);
	const pendingJudgeTasks = codexJudgeProgress.reduce(
		(total, item) => total + (item.verified_pending ?? 0),
		0,
	);
	const unknownJudgeManifests = codexJudgeProgress.filter(
		(item) => item.total_tasks === undefined,
	).length;
	const uniqueOurTexts = new Set(samples.map((sample) => sample.ourText)).size;
	const uniqueZlgTexts = new Set(samples.map((sample) => sample.zlgText)).size;
	const measuredMetric = (label: string) =>
		metricRows.find(
			(row) =>
				row.label === label &&
				row.ours !== null &&
				row.zlg !== null &&
				row.pValue !== null,
		);
	const hasPerplexityComparison = Boolean(
		measuredMetric("Fluency proxy: GPT-2 perplexity"),
	);
	const hasKlJsdComparison = [
		"Topical-fit proxy: KL vs matched post",
		"Topical-fit proxy: JSD vs matched post",
	].every((label) => measuredMetric(label));

	return (
		<OvernightFindingsShell>
			<main className="min-h-screen bg-[#0d1117] px-6 py-8 text-slate-100">
				<div className="mx-auto max-w-7xl space-y-8">
					<header className="space-y-2">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="font-medium text-cyan-300 text-sm uppercase tracking-wider">
									ZLG Comparison Dashboard
								</p>
								<h1 className="font-bold text-3xl">
									Our Method vs ZLG Baseline
								</h1>
							</div>
							<a
								className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-slate-300 text-xs hover:bg-white/[0.08]"
								href="/zlg-comparison.md"
							>
								View as Markdown ↗
							</a>
						</div>
						<p className="font-mono text-slate-500 text-xs">{RUN_DIR}</p>
						{metricsRunDir !== RUN_DIR ? (
							<p className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-cyan-100 text-xs leading-relaxed">
								This directory is the independent-judge campaign. Generation
								metrics (
								<code className="rounded bg-black/30 px-1">results.jsonl</code>,{" "}
								<code className="rounded bg-black/30 px-1">
									comparison_dataset/summary.json
								</code>
								) are loaded from the parent run{" "}
								<code className="rounded bg-black/30 px-1">
									{metricsRunDir}
								</code>
								.
							</p>
						) : null}
						{missingArtifacts.length > 0 ? (
							<p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100 text-xs leading-relaxed">
								Missing artifacts:{" "}
								{missingArtifacts.map((name) => (
									<code className="mr-1 rounded bg-black/30 px-1" key={name}>
										{name}
									</code>
								))}
								. Tables that depend on those files stay empty instead of
								inventing numbers.
							</p>
						) : null}
						{pairedRowsSource !== "paired_rows.jsonl" ? (
							<p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100 text-xs leading-relaxed">
								Paired rows source:{" "}
								<code className="rounded bg-black/30 px-1">
									{pairedRowsSource}
								</code>
								. Primary{" "}
								<code className="rounded bg-black/30 px-1">
									paired_rows.jsonl
								</code>{" "}
								is missing — the dashboard is on a backup fallback. A future
								judge pass that writes a different primary file would replace
								this silently once that file appears.
							</p>
						) : null}
					</header>

					{codexJudgeSummary ? (
						<section className="space-y-4 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/[0.13] via-cyan-400/[0.06] to-transparent p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="font-medium text-emerald-300 text-xs uppercase tracking-widest">
										Judge evaluation status
									</p>
									<h2 className="mt-1 font-bold text-2xl">
										Independent judge results
									</h2>
								</div>
								<span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 font-medium text-emerald-200 text-xs">
									{completedJudgeTasks} / {expectedJudgeTasks || "?"} valid
									tasks
								</span>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<Stat
									label="Independent posts"
									value={String(samples.length)}
								/>
								<Stat
									label="Unique generated texts"
									sub="Our method + ZLG baseline"
									value={`${uniqueOurTexts} + ${uniqueZlgTexts}`}
								/>
								<Stat
									label="Valid judge tasks"
									value={`${completedJudgeTasks} / ${expectedJudgeTasks || "?"}`}
								/>
								<Stat
									label="Failed judge tasks"
									value={String(failedJudgeTasks)}
								/>
							</div>
							<p className="text-emerald-50/85 text-sm leading-relaxed">
								Task counts use unique expected task IDs and successful,
								non-error results. Failed: {failedJudgeTasks}; pending:{" "}
								{pendingJudgeTasks}; task manifests unavailable:{" "}
								{unknownJudgeManifests}.
							</p>
							<p className="text-emerald-50/85 text-sm leading-relaxed">
								This view reports one paired comparison per source post. Each
								selected ZLG cover text is unique, so repeated baseline outputs
								were removed before judging. The same pair is then assessed
								under five different criteria; those are repeated measurements,
								not additional generated texts.
							</p>
						</section>
					) : null}

					<LlmJudgePanel
						audit={codexPilotAudit}
						judgments={codexJudgments}
						pairCount={samples.length}
						progress={codexJudgeProgress}
						subset={judgeSubset}
						summary={codexJudgeSummary}
					/>

					{metricsSummary ? (
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
					) : null}

					{metricsSummary ? (
						<section className="rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/5 via-transparent to-orange-400/5 p-5">
							<p className="font-semibold text-cyan-200 text-sm uppercase tracking-wide">
								The tradeoff, in one paragraph
							</p>
							<p className="mt-2 text-slate-200 text-sm leading-relaxed">
								The legacy bits-per-word proxy is shown for context (
								{fmtNum(bpwZlgAllMean, 3)} vs {fmtNum(bpwOursAllMean, 3)}{" "}
								bits/word). It does not establish a comparable efficiency
								winner: the payload definitions and recovery evidence differ.
								The frozen comparison summary for{" "}
								{metricsRunDir.split(/[\\/]/).at(-1)} reports{" "}
								{fmtNum(reliability?.accepted, 0)} accepted outputs from{" "}
								{shownAttempts} server attempts ({fmtPct(shownAcceptance)}{" "}
								acceptance rate, with harness skips excluded). Its paired metric
								summaries use {fmtNum((rowLevel.paired_n ?? 0) / 2, 0)} paired
								comparisons drawn from {fmtNum(paired.paired_n, 0)} distinct
								posts. Counting ZLG's own failures as zero gives{" "}
								{fmtNum(reliability?.effective_payload_bits_per_attempt, 1)}{" "}
								payload bits per attempt in that frozen summary. GPT-2
								perplexity{" "}
								{hasPerplexityComparison
									? "was measured; see the paired comparison below"
									: "was not scored in this dataset"}{" "}
								and KL/JSD topical-fit proxies{" "}
								{hasKlJsdComparison
									? "were measured; see their paired comparisons below"
									: "were not scored in this dataset"}
								. Perplexity is a model predictability proxy, not reader-facing
								naturalness or human authorship. Our method produces{" "}
								<span className="font-semibold text-cyan-300">longer text</span>{" "}
								({fmtNum(ourBlock?.word_count_mean, 1)} vs{" "}
								{fmtNum(zlgBlock?.word_count_mean, 1)} words). The former
								&quot;lexical quality index&quot; row is relabeled MATTR
								(rescaled) because on this run it is exactly{" "}
								<code className="rounded bg-black/30 px-1">55·MATTR + 45</code>—
								not an independent finding beyond lexical diversity /
								repetition.
							</p>
						</section>
					) : null}

					{rows.length > 0 ? (
						<p className="text-slate-400 text-xs">
							Expanded generation log, {metricsRunDir.split(/[\\/]/).at(-1)}{" "}
							results.jsonl: {rows.length} rows, {acceptedRows.length} accepted,
							and {attemptedRows.length} requests that reached ZLG (
							{fmtPct(localAcceptanceRate)} accepted per request).{" "}
							{skippedRows.length} harness skips are excluded from that
							denominator. These counts are separate from the frozen summary
							above.{" "}
							{expandedLogProvenance?.status === "matches"
								? `Immutable content identity ${expandedLogProvenance.recordedSha256?.slice(0, 12)} matches this file (${expandedLogProvenance.objectLineCount ?? "n/a"} object lines). It does not relabel historical recovery.`
								: expandedLogProvenance?.status === "mismatch"
									? "The expanded-log manifest does not match the current results.jsonl."
									: "No immutable manifest is recorded for this expanded log."}
						</p>
					) : null}

					{rows.length > 0 ? (
						<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
							<Stat label="Expanded Log Rows" value={String(rows.length)} />
							<Stat
								label="ZLG Attempts"
								sub={
									skippedRows.length > 0
										? `${skippedRows.length} skipped before any request`
										: undefined
								}
								value={String(attemptedRows.length)}
							/>
							<Stat
								label="Expanded Log Accepted"
								value={String(acceptedRows.length)}
							/>
							<Stat
								label="Failed (of attempts)"
								value={String(failedRows.length - skippedRows.length)}
							/>
							<Stat
								label="Paired Observations"
								sub={`${paired.paired_n ?? "n/a"} distinct posts`}
								value={String((rowLevel.paired_n ?? pairedRows.length) / 2)}
							/>
							<Stat
								label="Last Updated"
								value={String(
									summary?.updated_at_utc ?? progress?.updated_at_utc ?? "n/a",
								).slice(0, 19)}
							/>
						</section>
					) : null}

					{metricRows.length > 0 ? (
						<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h2 className="font-semibold text-lg">
									Efficiency &amp; distributional proxies (
									{fmtNum((rowLevel.paired_n ?? pairedRows.length) / 2, 0)}{" "}
									pairs)
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
								This frozen summary's paired metrics cover{" "}
								{fmtNum((rowLevel.paired_n ?? 0) / 2, 0)} pairs from{" "}
								{fmtNum(paired.paired_n, 0)} distinct posts. Perplexity is a
								model-predictability/fluency proxy; KL and JSD are
								word-distribution topical-fit proxies. None is a reader-facing
								measure of naturalness or human authorship. Values use all
								paired observations; p-values remain Holm-adjusted and clustered
								by those {paired.paired_n ?? "n/a"} distinct posts.
							</p>
							<p className="text-slate-400 text-xs leading-relaxed">
								Table values are row means, with each comment weighted equally.
								The self-consistency row also shows post means. Paired p-values
								use post-clustered inference.
							</p>
							<SummaryTable rows={summaryRows} />
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
											const otherMethod =
												method === "our_method" ? "zlg" : "our_method";
											const otherBlock =
												metricsSummary.shared_naturalness_gate?.[otherMethod];
											const isGateWinner =
												block?.pass_rate !== undefined &&
												block.pass_rate !== null &&
												otherBlock?.pass_rate !== undefined &&
												otherBlock.pass_rate !== null &&
												block.pass_rate > otherBlock.pass_rate;
											const winnerClass = isGateWinner
												? method === "our_method"
													? "font-bold text-cyan-300"
													: "font-bold text-orange-300"
												: "";
											return (
												<tr className="border-white/5 border-b" key={method}>
													<td className="py-2 pr-3" style={{ color }}>
														{method}
													</td>
													<td className={`py-2 pr-3 ${winnerClass}`}>
														{block?.passed ?? "n/a"} / {block?.n ?? "n/a"}
													</td>
													<td className={`py-2 pr-3 ${winnerClass}`}>
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

					{rows.length > 0 ? (
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
					) : null}

					<section className="space-y-3">
						<h2 className="font-semibold text-lg">
							Auditable Side-by-Side Examples ({samples.length})
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
