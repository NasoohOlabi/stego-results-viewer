"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export const OURS_COLOR = "#22d3ee";
export const ZLG_COLOR = "#fb923c";
export const CHANCE_COLOR = "#64748b";

export type MetricCardData = {
	label: string;
	caveat?: string;
	ours: number | null;
	zlg: number | null;
	unit?: string;
	lowerIsBetter?: boolean;
	winner: "ours" | "zlg" | "tie" | "n/a";
	pValue: number | null;
	winnerCount?: string;
};

function fmtP(value: number | null): string {
	if (value === null || Number.isNaN(value)) return "n/a";
	if (value < 0.0001) return value.toExponential(2);
	return value.toFixed(4);
}

function MetricCard({ metric }: { metric: MetricCardData }) {
	const data = [
		{ name: "Ours", value: metric.ours ?? 0 },
		{ name: "ZLG", value: metric.zlg ?? 0 },
	];
	const winnerLabel =
		metric.winner === "ours"
			? "Our Method"
			: metric.winner === "zlg"
				? "ZLG Baseline"
				: metric.winner === "tie"
					? "Tie"
					: "n/a";
	const winnerColor =
		metric.winner === "ours"
			? OURS_COLOR
			: metric.winner === "zlg"
				? ZLG_COLOR
				: "#94a3b8";

	const directionHint =
		metric.lowerIsBetter === undefined
			? null
			: metric.lowerIsBetter
				? "↓ lower is better"
				: "↑ higher is better";

	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
			<div className="flex items-start justify-between gap-2">
				<p className="font-medium text-slate-200 text-sm leading-tight">
					{metric.label}
				</p>
				{directionHint ? (
					<span className="shrink-0 whitespace-nowrap rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
						{directionHint}
					</span>
				) : null}
			</div>
			{metric.caveat ? (
				<p className="mt-2 text-amber-200/75 text-xs leading-relaxed">
					{metric.caveat}
				</p>
			) : null}
			<div className="mt-2 h-28">
				<ResponsiveContainer height="100%" width="100%">
					<BarChart
						data={data}
						layout="vertical"
						margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
					>
						<CartesianGrid horizontal={false} stroke="#ffffff14" />
						<XAxis hide type="number" />
						<YAxis
							dataKey="name"
							stroke="#94a3b8"
							tick={{ fill: "#94a3b8", fontSize: 12 }}
							type="category"
							width={40}
						/>
						<Tooltip
							contentStyle={{
								background: "#0f172a",
								border: "1px solid #334155",
								borderRadius: "0.5rem",
								fontSize: "12px",
							}}
							formatter={(value: number) => [
								`${value.toLocaleString(undefined, { maximumFractionDigits: 3 })}${metric.unit ? ` ${metric.unit}` : ""}`,
								"",
							]}
							labelStyle={{ display: "none" }}
						/>
						<Bar dataKey="value" radius={[0, 6, 6, 0]}>
							<Cell fill={OURS_COLOR} />
							<Cell fill={ZLG_COLOR} />
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-1 flex items-center justify-between text-xs">
				<span className="text-slate-400">
					<span style={{ color: OURS_COLOR }}>●</span>{" "}
					<span
						className={
							metric.winner === "ours" ? "font-bold text-slate-100" : undefined
						}
					>
						{metric.ours?.toFixed(2) ?? "n/a"}
					</span>
					{"  "}
					<span style={{ color: ZLG_COLOR }}>●</span>{" "}
					<span
						className={
							metric.winner === "zlg" ? "font-bold text-slate-100" : undefined
						}
					>
						{metric.zlg?.toFixed(2) ?? "n/a"}
					</span>
				</span>
			</div>
			<div className="mt-2 flex items-center justify-between border-white/10 border-t pt-2 text-xs">
				<span style={{ color: winnerColor }}>
					Winner: <span className="font-semibold">{winnerLabel}</span>
					{metric.winnerCount ? (
						<span className="text-slate-500"> ({metric.winnerCount})</span>
					) : null}
				</span>
				<span className="text-slate-500">p={fmtP(metric.pValue)}</span>
			</div>
		</div>
	);
}

export function MetricsGrid({ metrics }: { metrics: MetricCardData[] }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
			{metrics.map((metric) => (
				<MetricCard key={metric.label} metric={metric} />
			))}
		</div>
	);
}
