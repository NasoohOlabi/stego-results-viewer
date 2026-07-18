"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { OURS_COLOR, ZLG_COLOR } from "./metric-bar-chart";

export type HistogramBin = { bin: string; ours: number; zlg: number };

export function PerplexityHistogram({ bins }: { bins: HistogramBin[] }) {
	if (bins.length === 0) return null;
	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
			<p className="font-medium text-slate-200 text-sm">
				GPT-2 Perplexity Distribution (lower = more predictable / natural to the judge model)
			</p>
			<div className="mt-3 h-64">
				<ResponsiveContainer height="100%" width="100%">
					<BarChart data={bins} margin={{ top: 4, right: 8, bottom: 4, left: -12 }}>
						<CartesianGrid stroke="#ffffff14" vertical={false} />
						<XAxis dataKey="bin" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
						<YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
						<Tooltip
							contentStyle={{
								background: "#0f172a",
								border: "1px solid #334155",
								borderRadius: "0.5rem",
								fontSize: "12px",
							}}
						/>
						<Legend wrapperStyle={{ fontSize: "12px" }} />
						<Bar dataKey="ours" fill={OURS_COLOR} name="Our Method" radius={[4, 4, 0, 0]} />
						<Bar dataKey="zlg" fill={ZLG_COLOR} name="ZLG Baseline" radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
