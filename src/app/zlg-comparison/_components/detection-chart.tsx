"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHANCE_COLOR, OURS_COLOR, ZLG_COLOR } from "./metric-bar-chart";

export function DetectionRateChart({
	ourRate,
	zlgRate,
	chanceRate,
}: {
	ourRate: number | null;
	zlgRate: number | null;
	chanceRate: number;
}) {
	const data = [
		{ name: "Our Method", value: (ourRate ?? 0) * 100, fill: OURS_COLOR },
		{ name: "ZLG Baseline", value: (zlgRate ?? 0) * 100, fill: ZLG_COLOR },
		{ name: "Random chance", value: chanceRate * 100, fill: CHANCE_COLOR },
	];
	return (
		<div className="h-48">
			<ResponsiveContainer height="100%" width="100%">
				<BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
					<XAxis hide type="number" />
					<YAxis
						dataKey="name"
						stroke="#94a3b8"
						tick={{ fill: "#e2e8f0", fontSize: 13 }}
						type="category"
						width={100}
					/>
					<Bar dataKey="value" radius={[0, 8, 8, 0]}>
						{data.map((d) => (
							<Cell fill={d.fill} key={d.name} />
						))}
						<LabelList
							dataKey="value"
							fill="#e2e8f0"
							formatter={(v: number) => `${v.toFixed(1)}%`}
							position="right"
						/>
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
