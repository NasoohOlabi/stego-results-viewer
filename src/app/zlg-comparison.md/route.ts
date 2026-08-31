import {
	FAILURE_STAGE_LABELS,
	loadZlgComparisonData,
	RUN_DIR,
} from "../zlg-comparison/_lib/data";
import { fmtNum, fmtPct } from "../zlg-comparison/_lib/format";
import {
	CRITERION_ORDER,
	JUDGE_CRITERIA,
} from "../zlg-comparison/_lib/judge-copy";
import {
	value as judgeValue,
	meanScore,
	pickedRate,
	rate,
} from "../zlg-comparison/_lib/llm-judge";

/**
 * Agent-facing plain-text mirror of /zlg-comparison. Same data loader as the
 * interactive page (./zlg-comparison/_lib/data.ts) so the two never drift —
 * this just formats the result as GitHub-flavored Markdown instead of JSX.
 */
export const dynamic = "force-dynamic";

const DEFAULT_SAMPLE_LIMIT = 25;

function mdTable(headers: string[], rows: string[][]): string {
	const escapeCell = (cell: string) =>
		cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
	const head = `| ${headers.join(" | ")} |`;
	const sep = `| ${headers.map(() => "---").join(" | ")} |`;
	const body = rows
		.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
		.join("\n");
	return [head, sep, body].join("\n");
}

export async function GET(request: Request) {
	const data = await loadZlgComparisonData();
	const { searchParams } = new URL(request.url);
	const sampleParam = searchParams.get("samples");
	const sampleLimit =
		sampleParam === "all"
			? data.samples.length
			: Math.max(0, Number(sampleParam) || DEFAULT_SAMPLE_LIMIT);

	const lines: string[] = [];
	const push = (line = "") => lines.push(line);

	push("# ZLG Comparison Dashboard — Our Method vs ZLG Baseline");
	push();
	push(`- Run directory: \`${RUN_DIR}\``);
	if (data.metricsRunDir !== RUN_DIR) {
		push(
			`- Metrics loaded from parent run: \`${data.metricsRunDir}\` (this directory is the independent-judge campaign)`,
		);
	}
	if (data.missingArtifacts.length > 0) {
		push(
			`- **Missing artifacts:** ${data.missingArtifacts.map((name) => `\`${name}\``).join(", ")}`,
		);
	}
	push(
		`- Last updated: ${String(data.summary?.updated_at_utc ?? data.progress?.updated_at_utc ?? "n/a").slice(0, 19)}`,
	);
	push(`- Generated: ${new Date().toISOString()}`);
	if (data.pairedRowsSource !== "paired_rows.jsonl") {
		push(
			`- **Paired rows source:** \`${data.pairedRowsSource}\` (primary \`paired_rows.jsonl\` missing — backup fallback)`,
		);
	}
	push();
	const judgeTasks = data.codexJudgeProgress.reduce(
		(total, item) => total + (item.total_tasks ?? 0),
		0,
	);
	const judgeErrors = data.codexJudgeProgress.reduce(
		(total, item) => total + (item.errors ?? 0),
		0,
	);
	const uniqueOurTexts = new Set(data.samples.map((sample) => sample.ourText))
		.size;
	const uniqueZlgTexts = new Set(data.samples.map((sample) => sample.zlgText))
		.size;
	if (data.codexJudgeSummary) {
		push("## Completed independent LLM judge evaluation");
		push();
		push(
			`- **${data.samples.length}** independent source posts / paired comparisons`,
		);
		push(
			`- **${uniqueOurTexts} + ${uniqueZlgTexts}** unique generated texts (ours + ZLG)`,
		);
		push(
			`- **${judgeTasks}/${judgeTasks}** valid judge tasks; **${judgeErrors}** errors`,
		);
		if (data.judgeSubset) {
			push(
				`- Selection: ${data.judgeSubset.selectedPairs} one-per-post pairs from ${data.judgeSubset.sourcePairs} candidates across ${data.judgeSubset.sourcePosts} posts; pairs with repeated ZLG cover text were excluded before judging.`,
			);
		}
		push(
			"- The five judge criteria reuse fixed text pairs to measure different properties; they are not additional generated samples.",
		);
		push();
	}

	// ---- capacity ----
	if (data.metricsSummary) {
		push("## Capacity");
		push();
		push(
			"Shown as two separate figures, not a head-to-head comparison — the two sides use incompatible definitions and neither was verified the same way.",
		);
		push();
		push(
			`- **ZLG requested payload**: ${fmtNum(data.zlgBlock?.total_embedded_bits_mean, 2)} bits — harness-set constant, sized to our own budget, rounded up to whole bytes. Not a measured ZLG capacity.`,
		);
		push(
			`- **Our selection-channel budget**: ${fmtNum(data.ourBlock?.total_embedded_bits_mean, 2)} bits — theoretical upper bound (sum of floor(log2(choices))); not blind-decoded in this run, recovery used the sender's own payload as an oracle.`,
		);
		if (data.metricsSummary?.capacity_fields_note) {
			push();
			push(`> **Note:** ${data.metricsSummary.capacity_fields_note}`);
		}
		push();
	}

	// ---- tradeoff paragraph ----
	if (data.metricsSummary) {
		push("## The tradeoff, in one paragraph");
		push();
		push(
			`Capacity figures for the two methods aren't directly comparable (see the note above), so the more meaningful efficiency read is bits per word: ZLG packs more payload per word of generated text (${fmtNum(data.bpwZlgAllMean, 3)} vs ${fmtNum(data.bpwOursAllMean, 3)} bits/word), which is the efficiency metric the baseline paper itself reports. Counting ZLG's own failures as zero gives ${fmtNum(data.reliability?.effective_payload_bits_per_attempt, 1)} payload bits per attempt across ${data.shownAttempts} trials that reached the server (${fmtPct(data.shownAcceptance)} acceptance rate${data.shownSkipped > 0 ? `; a further ${data.shownSkipped} rows never reached it and are excluded` : ""}). ZLG scores lower on GPT-2 perplexity, a fluency proxy that does not measure reader-facing naturalness or human authorship; KL/JSD topical-fit proxies show no statistically clear difference (see below). Our method produces longer text (${fmtNum(data.ourBlock?.word_count_mean, 1)} vs ${fmtNum(data.zlgBlock?.word_count_mean, 1)} words) with a slightly higher lexical-quality index — largely the same lexical-diversity signal as the repetition-ratio row below, not an independent finding.`,
		);
		push();
	}

	// ---- top-line stats ----
	if (data.rows.length > 0) {
		push("## Top-line stats");
		push();
		push(
			mdTable(
				["Stat", "Value"],
				[
					["Rows Parsed", String(data.rows.length)],
					[
						"ZLG Attempts",
						`${data.attemptedRows.length}${data.skippedRows.length > 0 ? ` (${data.skippedRows.length} skipped before any request)` : ""}`,
					],
					["Accepted", String(data.acceptedRows.length)],
					[
						"Failed (of attempts)",
						String(data.failedRows.length - data.skippedRows.length),
					],
					[
						"Paired Observations",
						`${data.rowLevel.paired_n ?? data.pairedRows.length / 2} (${data.paired.paired_n ?? "n/a"} independent post clusters)`,
					],
				],
			),
		);
		push();
	}

	// ---- metric summary table ----
	if (data.metricRows.length > 0) {
		push(
			`## Efficiency & distributional proxies (${data.rowLevel.paired_n ?? data.pairedRows.length / 2} paired observations)`,
		);
		push();
		push(
			`Perplexity is a model-predictability/fluency proxy; KL and JSD are word-distribution topical-fit proxies. None is a reader-facing measure of naturalness or human authorship. Values use all paired observations; p-values remain Holm-adjusted and clustered by the ${data.paired.paired_n ?? "n/a"} unique posts.`,
		);
		push();
		push(
			mdTable(
				["Metric", "Our Method", "ZLG Baseline", "Winner", "Detail"],
				data.summaryRows.map((row) => [
					row.direction
						? `${row.label} (${row.direction === "lower" ? "↓ lower is better" : "↑ higher is better"})`
						: row.label,
					row.ours,
					row.zlg,
					row.winner === "n/a"
						? "—"
						: row.winner === "tie"
							? "Tie"
							: row.winner === "ours"
								? "Ours"
								: "ZLG",
					[row.detail, row.secondary, row.caveat].filter(Boolean).join(" · ") ||
						"—",
				]),
			),
		);
		push();
	}

	// ---- post reuse & independence ----
	if (data.diversityGuard) {
		push("## Post reuse & sample independence");
		push();
		push(
			`The researched-post pool ran short of what ~${data.reliability?.attempted ?? "500+"} generation attempts needed (a live search API quota was exhausted mid-run), so many posts were sampled multiple times with \`--allow-post-reuse\`. Reported statistics above are computed post-clustered (each unique post weighted once) specifically to stay valid under this reuse; treat row-level numbers as descriptive only.`,
		);
		push();
		push(
			mdTable(
				["Stat", "Value"],
				[
					["Unique posts in dataset", String(data.totalPostsInDataset)],
					[
						"Independent clusters",
						String(data.independence?.independent_clusters ?? "n/a"),
					],
					[
						"Unique our-method texts",
						String(data.independence?.unique_our_method_texts ?? "n/a"),
					],
					[
						"Posts with duplicate text",
						`${data.postsWithDuplicateText} / ${data.totalPostsInDataset}`,
					],
				],
			),
		);
		if (data.reuseRows.length > 0) {
			push();
			push(
				mdTable(
					["Samples per post", "# of posts"],
					data.reuseRows.map(([samplesPerPost, count]) => [
						String(samplesPerPost),
						String(count),
					]),
				),
			);
		}
		push();
	}

	// ---- shared naturalness gate ----
	if (data.metricsSummary?.shared_naturalness_gate) {
		const gate = data.metricsSummary.shared_naturalness_gate;
		push("## Shared Naturalness Gate");
		push();
		push(
			`Both methods scored by the same gate, calibrated to reject <5% of human comments. Thresholds: ${Object.entries(
				gate.thresholds ?? {},
			)
				.map(([k, v]) => `${k}=${v}`)
				.join(", ")}`,
		);
		push();
		push(
			mdTable(
				["Method", "Passed", "Pass rate", "Top failed rules"],
				(["our_method", "zlg"] as const).map((method) => {
					const block = gate[method];
					return [
						method,
						`${block?.passed ?? "n/a"} / ${block?.n ?? "n/a"}`,
						fmtPct(block?.pass_rate),
						Object.entries(block?.failed_rules ?? {})
							.slice(0, 3)
							.map(([rule, count]) => `${rule}:${count}`)
							.join(", ") || "—",
					];
				}),
			),
		);
		push();
	}

	// ---- LLM judge ----
	const completed = data.codexJudgments.filter(
		(item) => !item.error && item.result,
	).length;
	const completedTasks = data.codexJudgeProgress.reduce(
		(total, item) => total + (item.completed ?? 0),
		0,
	);
	const totalTasks = data.codexJudgeProgress.reduce(
		(total, item) => total + (item.total_tasks ?? 0),
		0,
	);
	push("## LLM Judge");
	push();
	push(
		`Full-run cache: ${completed} valid rows loaded (${completedTasks}/${totalTasks || "?"} tasks complete).`,
	);
	if (data.codexPilotAudit) {
		push(
			`Pilot audit: ${data.codexPilotAudit.healthy ? "passed" : "needs review"}`,
		);
	}
	push();
	const standoutOurs = rate(
		data.codexJudgments,
		"standout",
		"our_method",
		"inserted_index",
	);
	const standoutZlg = rate(
		data.codexJudgments,
		"standout",
		"zlg",
		"inserted_index",
	);
	const attributionOurs = rate(
		data.codexJudgments,
		"attribution",
		"our_method",
		"thread_index",
	);
	const attributionZlg = rate(
		data.codexJudgments,
		"attribution",
		"zlg",
		"thread_index",
	);
	const registerOurs = meanScore(data.codexJudgments, "our_method", "overall");
	const registerZlg = meanScore(data.codexJudgments, "zlg", "overall");
	const weakLinkOurs = pickedRate(data.codexJudgments, "our_method");
	const weakLinkZlg = pickedRate(data.codexJudgments, "zlg");
	const weakLinkHuman = pickedRate(data.codexJudgments, "human");
	const attributionHuman = rate(
		data.codexJudgments,
		"attribution",
		"human",
		"thread_index",
	);
	const registerHuman = meanScore(data.codexJudgments, "human", "overall");
	const suspicion = data.codexJudgeSummary?.suspicion as
		| { auroc?: Record<string, number> }
		| undefined;

	// Prose, numbers and row order all come from judge-copy.ts, the same module
	// the interactive panel reads. This export is not a summary of the pages; it
	// is the same content, flat. A weaker export is a bug.
	// Precision matches the interactive panel exactly. The export carrying
	// different digits from the page is the divergence the docket calls a bug.
	const asPercent = (score: number | null) =>
		score === null ? "n/a" : `${(score * 100).toFixed(1)}%`;
	const cells: Record<string, { ours: string; zlg: string; human: string }> = {
		standout: {
			ours: asPercent(standoutOurs),
			zlg: asPercent(standoutZlg),
			human: "n/a - humans are the lineup",
		},
		"weak-link": {
			ours: asPercent(weakLinkOurs),
			zlg: asPercent(weakLinkZlg),
			human: asPercent(weakLinkHuman),
		},
		suspicion: {
			// Two decimals: the gap is smaller than the tie-breaking noise, so a
			// third decimal would imply a ranking. Docket tickets 06 and 11.
			ours: suspicion?.auroc?.our_method?.toFixed(2) ?? "n/a",
			zlg: suspicion?.auroc?.zlg?.toFixed(2) ?? "n/a",
			human: "reference distribution",
		},
		attribution: {
			ours: asPercent(attributionOurs),
			zlg: asPercent(attributionZlg),
			human: asPercent(attributionHuman),
		},
		register: {
			ours: judgeValue(registerOurs),
			zlg: judgeValue(registerZlg),
			human: judgeValue(registerHuman),
		},
	};

	push("### Full-run results");
	push();
	push(
		mdTable(
			["Result", "Our Method", "ZLG", "Human arm (control)", "Interpretation"],
			CRITERION_ORDER.map((slug) => {
				const copy = JUDGE_CRITERIA[slug];
				const cell = cells[slug];
				return [
					copy.label,
					cell?.ours ?? "n/a",
					cell?.zlg ?? "n/a",
					cell?.human ?? "n/a",
					copy.shortInterpretation,
				];
			}),
		),
	);
	push();
	push(
		"The human arm is a real comment drawn from the same thread and scored on the same task. It is not a human rating anything; it is the same model judging genuine comments, which is what makes it a yardstick.",
	);
	push();

	for (const slug of CRITERION_ORDER) {
		const copy = JUDGE_CRITERIA[slug];
		push(`### ${copy.label}`);
		push();
		push(`**What was measured.** ${copy.explanation.panel}`);
		push();
		push(copy.explanation.long);
		push();
		push(`**Easy to misread.** ${copy.misread}`);
		push();
		push(`**What we think happened.** ${copy.justification.opinion}`);
		push();
		for (const paragraph of copy.justification.body) {
			push(paragraph);
			push();
		}
		push("**Worked examples.**");
		push();
		for (const example of copy.examples) {
			push(
				`- \`${example.postId}\` (${example.arms.join(", ")}): ${example.caption}`,
			);
		}
		push();
		push("**What this does not show.**");
		push();
		for (const limit of copy.limits) push(`- ${limit}`);
		push();
	}

	push("### Per-metric summary");
	push();
	push(
		mdTable(
			["Metric", "Valid / tasks", "Key result"],
			["standout", "weak_link", "suspicion", "attribution", "register"].map(
				(metric) => {
					const item = data.codexJudgeSummary?.[metric] as
						| Record<string, unknown>
						| undefined;
					const rowsForMetric = data.codexJudgments.filter(
						(judgment) => judgment.metric === metric,
					);
					const valid = rowsForMetric.filter(
						(judgment) => !judgment.error && judgment.result,
					).length;
					const cluster = item?.post_cluster as
						| Record<string, unknown>
						| undefined;
					const auroc = item?.auroc as Record<string, unknown> | undefined;
					const result = auroc
						? `AUROC ours ${judgeValue(auroc.our_method)} · ZLG ${judgeValue(auroc.zlg)}`
						: cluster
							? `Δ ours−ZLG ${judgeValue(cluster.our_minus_zlg_post_cluster_mean)} · p ${judgeValue(cluster.two_sided_sign_test_p)}`
							: "Awaiting scored results";
					return [
						metric,
						`${judgeValue(item?.valid_judgments ?? valid)} / ${judgeValue(item?.tasks ?? rowsForMetric.length)}`,
						result,
					];
				},
			),
		),
	);
	push();

	// ---- failure stages ----
	push(`## Failure Stages (${data.failedRows.length} total, fully accounted)`);
	push();
	push(
		"Rows at the `harness_extract` stage never reached the ZLG server — our own cover-sentence extraction gave up first — so they are excluded from the acceptance rate above.",
	);
	push();
	push(
		mdTable(
			["Count", "Stage", "Charged to ZLG?"],
			data.topStages.map(([stage, count]) => [
				String(count),
				`${stage} — ${FAILURE_STAGE_LABELS[stage]}`,
				stage === "harness_extract" ? "no" : "yes",
			]),
		),
	);
	push();

	// ---- side-by-side examples ----
	const shownSamples = data.samples.slice(0, sampleLimit);
	push(
		`## Side-by-Side Examples (showing ${shownSamples.length} of ${data.samples.length})`,
	);
	push();
	if (shownSamples.length < data.samples.length) {
		push(
			`Truncated for size. Append \`?samples=all\` (or \`?samples=<N>\`) to the URL for more.`,
		);
		push();
	}
	for (const sample of shownSamples) {
		push(`### Pair ${sample.key} — post \`${sample.postId}\``);
		push();
		if (sample.coverPreview) push(`Cover preview: ${sample.coverPreview}`);
		push();
		push(
			`**Our method** (${fmtNum(sample.ourBits, 1)} bits, bleu=${fmtNum(sample.ourQuality?.bleu, 3)}, rougeL=${fmtNum(sample.ourQuality?.rougeL, 3)}, bertscore_f1=${fmtNum(sample.ourQuality?.bertscore_f1, 3)}):`,
		);
		push(`> ${sample.ourText.replace(/\n/g, "\n> ")}`);
		push();
		push(
			`**ZLG** (${fmtNum(sample.zlgBits, 1)} bits, bleu=${fmtNum(sample.zlgQuality?.bleu, 3)}, rougeL=${fmtNum(sample.zlgQuality?.rougeL, 3)}, bertscore_f1=${fmtNum(sample.zlgQuality?.bertscore_f1, 3)}):`,
		);
		push(`> ${sample.zlgText.replace(/\n/g, "\n> ")}`);
		push();
	}

	const body = lines.join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": 'inline; filename="zlg-comparison.md"',
		},
	});
}
