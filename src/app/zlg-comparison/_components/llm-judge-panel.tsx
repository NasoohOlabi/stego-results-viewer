"use client";

import { useState } from "react";
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

export function LlmJudgePanel({ summary, judgments, progress, audit }: Props) {
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
	return (
		<section className="space-y-4 rounded-xl border border-violet-400/30 bg-violet-400/[0.05] p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="font-semibold text-lg">LLM Judge</p>
					<p className="text-slate-400 text-xs">
						Full-run cache: {completed} valid rows loaded ({completedTasks}/
						{totalTasks || "?"} tasks complete).
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
			{audit ? (
				<p
					className={
						audit.healthy
							? "text-emerald-300 text-xs"
							: "text-amber-300 text-xs"
					}
				>
					Pilot audit: {audit.healthy ? "passed" : "needs review"}
				</p>
			) : null}
			<FullResults rows={judgments} />
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
				<Summary
					audit={audit}
					judgments={judgments}
					progress={progress}
					summary={summary}
				/>
			) : (
				<Judgments rows={judgments} />
			)}
		</section>
	);
}

function FullResults({ rows }: { rows: Judgment[] }) {
	const standoutOurs = rate(rows, "our_method", "inserted_index");
	const standoutZlg = rate(rows, "zlg", "inserted_index");
	const attributionOurs = rate(rows, "our_method", "thread_index");
	const attributionZlg = rate(rows, "zlg", "thread_index");
	const registerOurs = meanScore(rows, "our_method", "overall");
	const registerZlg = meanScore(rows, "zlg", "overall");
	const weakLinkOurs = pickedRate(rows, "our_method");
	const weakLinkZlg = pickedRate(rows, "zlg");
	return (
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
							{value(standoutOurs === null ? null : standoutOurs * 100)}%
						</td>
						<td
							className={`py-2 pr-3 ${winnerClass(standoutZlg, standoutOurs, true, "zlg")}`}
						>
							{value(standoutZlg === null ? null : standoutZlg * 100)}%
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
							{value(weakLinkOurs === null ? null : weakLinkOurs * 100)}%
						</td>
						<td
							className={`py-2 pr-3 ${winnerClass(weakLinkZlg, weakLinkOurs, true, "zlg")}`}
						>
							{value(weakLinkZlg === null ? null : weakLinkZlg * 100)}%
						</td>
						<td className="py-2 pr-3 text-slate-400">
							Lower is better; chance is 33%.
						</td>
					</tr>
					<tr className="border-white/5 border-b">
						<td className="py-2 pr-3 font-medium text-violet-200">
							J3 suspicion
						</td>
						<td className="py-2 pr-3">See scored summary</td>
						<td className="py-2 pr-3">See scored summary</td>
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
							{value(attributionOurs === null ? null : attributionOurs * 100)}%
						</td>
						<td
							className={`py-2 pr-3 ${winnerClass(attributionZlg, attributionOurs, false, "zlg")}`}
						>
							{value(attributionZlg === null ? null : attributionZlg * 100)}%
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
	);
}

function Summary({ summary, judgments }: Props) {
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
