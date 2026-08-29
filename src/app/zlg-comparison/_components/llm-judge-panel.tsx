"use client";

import { useState } from "react";
import type { JudgeSubset } from "../_lib/data";
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
		(total, item) => total + (item.completed ?? 0),
		0,
	);
	const totalTasks = progress.reduce(
		(total, item) => total + (item.total_tasks ?? 0),
		0,
	);
	const errors = progress.reduce(
		(total, item) => total + (item.errors ?? 0),
		0,
	);
	const complete = totalTasks > 0 && completedTasks === totalTasks;
	return (
		<section className="space-y-5 rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-400/[0.10] via-violet-400/[0.03] to-transparent p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="font-semibold text-lg">Independent LLM Judge</p>
					<p className="text-slate-400 text-xs">
						{complete ? "Completed" : "In progress"}: {completed} valid
						judgments loaded ({completedTasks}/{totalTasks || "?"} tasks).
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
				<JudgeStat label="Judge errors" value={String(errors)} />
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
								{item.completed ?? 0} / {item.total_tasks ?? "?"}
							</p>
							<p className={item.errors ? "text-amber-300" : "text-slate-500"}>
								{item.complete ? "complete" : `${item.pending ?? "?"} pending`}{" "}
								· {item.errors ?? 0} errors
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
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				<ResultCard
					label="Standout detection"
					note="Lower is better; 10% is chance."
					ours={percent(standoutOurs)}
					zlg={percent(standoutZlg)}
				/>
				<ResultCard
					label="Weakest text picked"
					note="Lower is better; a human control was also shown."
					ours={percent(weakLinkOurs)}
					zlg={percent(weakLinkZlg)}
				/>
				<ResultCard
					label="Suspicion separation"
					note={`Lower AUROC is closer to human; p ${value(suspicionP)}.`}
					ours={value(suspicionOurs)}
					zlg={value(suspicionZlg)}
				/>
				<ResultCard
					highlight="ours"
					label="Register fit"
					note={`Higher is better; post-cluster p ${value(registerP)}.`}
					ours={value(registerOurs)}
					zlg={value(registerZlg)}
				/>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-sm">
					<thead className="text-slate-400">
						<tr className="border-white/10 border-b">
							<th className="py-2 pr-3">Full-run result</th>
							<th className="py-2 pr-3">Our method</th>
							<th className="py-2 pr-3">ZLG</th>
							<th className="py-2 pr-3">Interpretation</th>
						</tr>
					</thead>
					<tbody>
						<tr className="border-white/5 border-b">
							<td className="py-2 pr-3 font-medium text-violet-200">
								J1 standout detection
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(standoutOurs, standoutZlg, true, "ours")}`}
							>
								{percent(standoutOurs)}
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(standoutZlg, standoutOurs, true, "zlg")}`}
							>
								{percent(standoutZlg)}
							</td>
							<td className="py-2 pr-3 text-slate-400">
								Lower is better; chance is 10%.
							</td>
						</tr>
						<tr className="border-white/5 border-b">
							<td className="py-2 pr-3 font-medium text-violet-200">
								J2 weak-link picked
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(weakLinkOurs, weakLinkZlg, true, "ours")}`}
							>
								{percent(weakLinkOurs)}
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(weakLinkZlg, weakLinkOurs, true, "zlg")}`}
							>
								{percent(weakLinkZlg)}
							</td>
							<td className="py-2 pr-3 text-slate-400">
								Lower is better; chance is 33%.
							</td>
						</tr>
						<tr className="border-white/5 border-b">
							<td className="py-2 pr-3 font-medium text-violet-200">
								J3 suspicion
							</td>
							<td className="py-2 pr-3">{value(suspicionOurs)}</td>
							<td className="py-2 pr-3">{value(suspicionZlg)}</td>
							<td className="py-2 pr-3 text-slate-400">
								AUROC against held-out human; lower is better.
							</td>
						</tr>
						<tr className="border-white/5 border-b">
							<td className="py-2 pr-3 font-medium text-violet-200">
								J4 thread attribution
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(attributionOurs, attributionZlg, false, "ours")}`}
							>
								{percent(attributionOurs)}
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(attributionZlg, attributionOurs, false, "zlg")}`}
							>
								{percent(attributionZlg)}
							</td>
							<td className="py-2 pr-3 text-slate-400">
								Higher is better; chance is 25%.
							</td>
						</tr>
						<tr>
							<td className="py-2 pr-3 font-medium text-violet-200">
								J5 register overall
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(registerOurs, registerZlg, false, "ours")}`}
							>
								{value(registerOurs)}
							</td>
							<td
								className={`py-2 pr-3 ${winnerClass(registerZlg, registerOurs, false, "zlg")}`}
							>
								{value(registerZlg)}
							</td>
							<td className="py-2 pr-3 text-slate-400">
								1–5 score; human-anchor comparison follows below.
							</td>
						</tr>
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
	return (
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
					{rows.map((row, index) => (
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
				<p className="p-3 text-slate-400 text-sm">No judgments written yet.</p>
			) : null}
		</div>
	);
}
