"use client";

import Link from "next/link";
import { useState } from "react";
import type { JudgeSubset } from "../_lib/data";
import {
	type CRITERION_ORDER,
	criterionHref,
	JUDGE_CRITERIA,
} from "../_lib/judge-copy";
import {
	type JudgeProgress,
	type Judgment,
	meanScore,
	pickedRate,
	rate,
	value,
} from "../_lib/llm-judge";

type Progress = JudgeProgress;
type Props = {
	summary: Record<string, unknown> | null;
	judgments: Judgment[];
	progress: Progress[];
	audit: Record<string, unknown> | null;
	pairCount: number;
	subset: JudgeSubset | null;
};

/** Rows rendered per page in the raw-judgments table. */
const PAGE_SIZE = 100;

const METRICS = [
	"standout",
	"weak_link",
	"suspicion",
	"attribution",
	"register",
];

function winnerClass(
	value: number | null,
	otherValue: number | null,
	lowerIsBetter: boolean,
	color: "ours" | "zlg",
): string {
	if (
		value === null ||
		otherValue === null ||
		value === otherValue ||
		(lowerIsBetter ? value > otherValue : value < otherValue)
	)
		return "";
	return color === "ours"
		? "font-bold text-cyan-300"
		: "font-bold text-orange-300";
}

export function LlmJudgePanel({
	summary,
	judgments,
	progress,
	audit,
	pairCount,
	subset,
}: Props) {
	const [tab, setTab] = useState<"summary" | "judgments">("summary");
	const completed = judgments.filter(
		(item) => !item.error && item.result,
	).length;
	const completedTasks = progress.reduce(
		(total, item) => total + (item.valid_completed ?? 0),
		0,
	);
	const totalTasks = progress.reduce(
		(total, item) => total + (item.total_tasks ?? 0),
		0,
	);
	const failedTasks = progress.reduce(
		(total, item) => total + (item.failed_tasks ?? 0),
		0,
	);
	const pendingTasks = progress.reduce(
		(total, item) => total + (item.verified_pending ?? 0),
		0,
	);
	const unknownTaskSets = progress.filter(
		(item) => item.total_tasks === undefined,
	).length;
	const complete =
		progress.length === 5 &&
		unknownTaskSets === 0 &&
		totalTasks > 0 &&
		completedTasks === totalTasks;
	return (
		<section className="space-y-5 rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-400/[0.10] via-violet-400/[0.03] to-transparent p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="font-semibold text-lg">Independent LLM Judge</p>
					<p className="text-slate-400 text-xs">
						{complete ? "Completed" : "Incomplete"}: {completed} valid judgments
						loaded ({completedTasks}/{totalTasks || "?"} unique tasks;{" "}
						{failedTasks} failed, {pendingTasks} pending, {unknownTaskSets} task
						manifests unavailable).
					</p>
				</div>
				<div className="flex rounded-lg border border-white/10 p-1 text-sm">
					{(["summary", "judgments"] as const).map((name) => (
						<button
							className={`rounded px-3 py-1.5 ${tab === name ? "bg-violet-400/20 text-violet-100" : "text-slate-400"}`}
							key={name}
							onClick={() => setTab(name)}
							type="button"
						>
							{name === "summary" ? "Summary" : "Raw judgments"}
						</button>
					))}
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<JudgeStat label="Independent posts" value={String(pairCount)} />
				<JudgeStat label="Valid judgments" value={String(completed)} />
				<JudgeStat label="Failed tasks" value={String(failedTasks)} />
				<JudgeStat
					label="Pilot audit"
					value={audit?.healthy ? "Passed" : audit ? "Review" : "n/a"}
				/>
			</div>
			{subset ? (
				<p className="rounded-lg border border-violet-300/20 bg-black/10 px-3 py-2 text-slate-300 text-xs leading-relaxed">
					Selected one pair per post from {subset.sourcePairs} candidate pairs
					across {subset.sourcePosts} posts. The selected {subset.selectedPairs}
					pairs use unique ZLG cover texts, so repeated baseline outputs were
					excluded before judging.
				</p>
			) : null}
			{progress.length > 0 ? (
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
					{progress.map((item) => (
						<div
							className="rounded border border-white/10 bg-black/10 p-2 text-xs"
							key={item.metric}
						>
							<p className="font-medium text-violet-200">{item.metric}</p>
							<p className="text-slate-300">
								{item.valid_completed ?? 0} / {item.total_tasks ?? "?"} valid
								tasks
							</p>
							<p
								className={
									item.failed_tasks || item.verified_pending
										? "text-amber-300"
										: "text-slate-500"
								}
							>
								{item.verified_pending ?? "?"} pending ·{" "}
								{item.failed_tasks ?? "?"} failed
							</p>
						</div>
					))}
				</div>
			) : null}
			{tab === "summary" ? (
				<>
					<FullResults rows={judgments} summary={summary} />
					<Summary judgments={judgments} summary={summary} />
				</>
			) : (
				<Judgments rows={judgments} />
			)}
		</section>
	);
}

function JudgeStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
			<p className="text-[11px] text-slate-500 uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-1 font-semibold text-slate-100 text-xl">{value}</p>
		</div>
	);
}

function percent(score: number | null): string {
	return score === null ? "n/a" : `${(score * 100).toFixed(1)}%`;
}

/** AUROC to two decimals. See the suspicion row for why not three. */
function auroc(score: number | null): string {
	return score === null ? "n/a" : score.toFixed(2);
}

function nestedNumber(
	source: Record<string, unknown> | null,
	...keys: string[]
): number | null {
	let current: unknown = source;
	for (const key of keys) {
		if (!isRecord(current)) {
			return null;
		}
		current = current[key];
	}
	return typeof current === "number" ? current : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function FullResults({
	rows,
	summary,
}: {
	rows: Judgment[];
	summary: Record<string, unknown> | null;
}) {
	const standoutOurs = rate(rows, "standout", "our_method", "inserted_index");
	const standoutZlg = rate(rows, "standout", "zlg", "inserted_index");
	const attributionOurs = rate(
		rows,
		"attribution",
		"our_method",
		"thread_index",
	);
	const attributionZlg = rate(rows, "attribution", "zlg", "thread_index");
	const registerOurs = meanScore(rows, "our_method", "overall");
	const registerZlg = meanScore(rows, "zlg", "overall");
	const weakLinkOurs = pickedRate(rows, "our_method");
	const weakLinkZlg = pickedRate(rows, "zlg");
	const weakLinkHuman = pickedRate(rows, "human");
	const attributionHuman = rate(rows, "attribution", "human", "thread_index");
	const registerHuman = meanScore(rows, "human", "overall");
	const suspicionOurs = nestedNumber(
		summary,
		"suspicion",
		"auroc",
		"our_method",
	);
	const suspicionZlg = nestedNumber(summary, "suspicion", "auroc", "zlg");
	const suspicionP = nestedNumber(
		summary,
		"suspicion",
		"post_cluster",
		"two_sided_sign_test_p",
	);
	const registerP = nestedNumber(
		summary,
		"register",
		"post_cluster",
		"two_sided_sign_test_p",
	);
	// One entry per criterion. `rank: false` suppresses winner highlighting where
	// ranking the two methods would misrepresent the measurement: J3's published
	// gap is smaller than its own tie-breaking noise (docket ticket 06).
	const tableRows: {
		slug: (typeof CRITERION_ORDER)[number];
		ours: number | null;
		zlg: number | null;
		human: number | null;
		humanNote: string;
		format: (score: number | null) => string;
		rank: boolean;
		pNote?: string;
	}[] = [
		{
			slug: "standout",
			ours: standoutOurs,
			zlg: standoutZlg,
			human: null,
			humanNote: "n/a — humans are the lineup",
			format: percent,
			rank: true,
		},
		{
			slug: "weak-link",
			ours: weakLinkOurs,
			zlg: weakLinkZlg,
			human: weakLinkHuman,
			humanNote: "",
			format: percent,
			rank: true,
		},
		{
			slug: "suspicion",
			ours: suspicionOurs,
			zlg: suspicionZlg,
			human: null,
			humanNote: "reference distribution",
			pNote: `Sign test on raw scores p ${value(suspicionP)}.`,
			// Two decimals, not three. The published gap (0.011) is smaller than
			// this criterion's own tie-breaking noise (0.089), so a third decimal
			// would render a ranking the measurement cannot support. Docket 06/11.
			format: auroc,
			rank: false,
		},
		{
			slug: "attribution",
			ours: attributionOurs,
			zlg: attributionZlg,
			human: attributionHuman,
			humanNote: "",
			format: percent,
			rank: true,
		},
		{
			slug: "register",
			ours: registerOurs,
			zlg: registerZlg,
			human: registerHuman,
			humanNote: "",
			format: value,
			rank: true,
			pNote: `Post-cluster p ${value(registerP)}.`,
		},
	];
	return (
		<div className="space-y-4">
			<div>
				<h3 className="font-semibold text-sm text-violet-100">
					Results at a glance
				</h3>
				<p className="mt-1 text-slate-400 text-xs">
					Colored values are descriptive unless a p-value is shown. The judge is
					an evaluation instrument, not a replacement for human-subject testing.
				</p>
			</div>
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{tableRows.map((row) => {
					const copy = JUDGE_CRITERIA[row.slug];
					const lower = copy.direction === "lower-better";
					const better =
						row.rank &&
						row.ours !== null &&
						row.zlg !== null &&
						(lower ? row.ours < row.zlg : row.ours > row.zlg);
					return (
						<ResultCard
							highlight={better ? "ours" : undefined}
							key={row.slug}
							label={copy.label}
							note={row.pNote ? `${copy.cardNote} ${row.pNote}` : copy.cardNote}
							ours={row.format(row.ours)}
							zlg={row.format(row.zlg)}
						/>
					);
				})}
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<caption className="sr-only">
						Full-run judge results. Each row links to that criterion&apos;s
						justification page.
					</caption>
					<thead className="text-slate-400">
						<tr className="border-white/10 border-b">
							<th className="py-2 pr-3">Full-run result</th>
							<th className="py-2 pr-3">Our method</th>
							<th className="py-2 pr-3">ZLG</th>
							<th className="py-2 pr-3">
								Human arm
								<span className="ml-1 font-normal text-slate-500 text-xs">
									(control)
								</span>
							</th>
							<th className="py-2 pr-3">Interpretation</th>
							<th className="py-2 pr-3">
								<span className="sr-only">Justification</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{tableRows.map((row, index) => {
							const copy = JUDGE_CRITERIA[row.slug];
							const lower = copy.direction === "lower-better";
							return (
								<tr
									className={
										index === tableRows.length - 1
											? undefined
											: "border-white/5 border-b"
									}
									key={row.slug}
								>
									<td className="py-2 pr-3 font-medium text-violet-200">
										{copy.label}
									</td>
									<td
										className={`py-2 pr-3 ${row.rank ? winnerClass(row.ours, row.zlg, lower, "ours") : ""}`}
									>
										{row.format(row.ours)}
									</td>
									<td
										className={`py-2 pr-3 ${row.rank ? winnerClass(row.zlg, row.ours, lower, "zlg") : ""}`}
									>
										{row.format(row.zlg)}
									</td>
									<td className="py-2 pr-3 text-slate-300">
										{row.human === null ? (
											<span className="text-slate-500">{row.humanNote}</span>
										) : (
											row.format(row.human)
										)}
									</td>
									<td className="py-2 pr-3 text-slate-400">
										{copy.shortInterpretation}
									</td>
									<td className="py-2 pr-3">
										<Link
											className="whitespace-nowrap text-violet-300 text-xs hover:text-violet-100 hover:underline"
											href={criterionHref(row.slug)}
										>
											Why? →
										</Link>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function ResultCard({
	label,
	ours,
	zlg,
	note,
	highlight,
}: {
	label: string;
	ours: string;
	zlg: string;
	note: string;
	highlight?: "ours" | "zlg";
}) {
	return (
		<div className="rounded-lg border border-white/10 bg-black/10 p-3">
			<p className="font-medium text-slate-200 text-sm">{label}</p>
			<div className="mt-3 grid grid-cols-2 gap-2">
				<p
					className={
						highlight === "ours" ? "font-bold text-cyan-300" : "text-slate-200"
					}
				>
					<span className="block text-[10px] text-slate-500 uppercase">
						Ours
					</span>
					{ours}
				</p>
				<p
					className={
						highlight === "zlg" ? "font-bold text-orange-300" : "text-slate-200"
					}
				>
					<span className="block text-[10px] text-slate-500 uppercase">
						ZLG
					</span>
					{zlg}
				</p>
			</div>
			<p className="mt-2 text-slate-500 text-xs leading-relaxed">{note}</p>
		</div>
	);
}

function Summary({ summary, judgments }: Pick<Props, "summary" | "judgments">) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="text-slate-400">
					<tr className="border-white/10 border-b">
						<th className="py-2 pr-3">Metric</th>
						<th className="py-2 pr-3">Valid / tasks</th>
						<th className="py-2 pr-3">Key result</th>
					</tr>
				</thead>
				<tbody>
					{METRICS.map((metric) => {
						const item = summary?.[metric] as
							| Record<string, unknown>
							| undefined;
						const rows = judgments.filter(
							(judgment) => judgment.metric === metric,
						);
						const valid = rows.filter(
							(judgment) => !judgment.error && judgment.result,
						).length;
						const cluster = item?.post_cluster as
							| Record<string, unknown>
							| undefined;
						const auroc = item?.auroc as Record<string, unknown> | undefined;
						const result = auroc
							? `AUROC ours ${value(auroc.our_method)} · ZLG ${value(auroc.zlg)}`
							: cluster
								? `Δ ours−ZLG ${value(cluster.our_minus_zlg_post_cluster_mean)} · p ${value(cluster.two_sided_sign_test_p)}`
								: "Awaiting scored results";
						return (
							<tr className="border-white/5 border-b" key={metric}>
								<td className="py-2 pr-3 font-medium text-violet-200">
									{metric}
								</td>
								<td className="py-2 pr-3">
									{value(item?.valid_judgments ?? valid)} /{" "}
									{value(item?.tasks ?? rows.length)}
								</td>
								<td className="py-2 pr-3 text-slate-300">{result}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function Judgments({ rows }: { rows: Judgment[] }) {
	const [shown, setShown] = useState(PAGE_SIZE);
	const page = rows.slice(0, shown);

	return (
		<div className="space-y-2">
			<div className="max-h-[32rem] overflow-auto">
				<table className="w-full text-left text-xs">
					<thead className="sticky top-0 bg-[#171226] text-slate-400">
						<tr>
							<th className="p-2">Metric</th>
							<th className="p-2">Method</th>
							<th className="p-2">Pair</th>
							<th className="p-2">Result</th>
						</tr>
					</thead>
					<tbody>
						{page.map((row, index) => (
							<tr
								className="border-white/5 border-b align-top"
								key={`${row.metric}-${row.method}-${row.pair_id}-${index}`}
							>
								<td className="p-2">{row.metric}</td>
								<td className="p-2">{row.method}</td>
								<td className="p-2">{row.pair_id}</td>
								<td className="max-w-xl whitespace-pre-wrap p-2 font-mono text-slate-300">
									{row.error ?? JSON.stringify(row.result)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{rows.length === 0 ? (
					<p className="p-3 text-slate-400 text-sm">
						No judgments written yet.
					</p>
				) : null}
			</div>
			{shown < rows.length ? (
				<div className="flex items-center gap-3">
					<button
						className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-slate-200 text-xs hover:bg-white/[0.08]"
						onClick={() => setShown((current) => current + PAGE_SIZE)}
						type="button"
					>
						Show {Math.min(PAGE_SIZE, rows.length - shown)} more
					</button>
					<p className="text-slate-500 text-xs">
						Showing {page.length} of {rows.length} judgments.
					</p>
				</div>
			) : null}
		</div>
	);
}
