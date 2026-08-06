"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { api } from "~/trpc/react";

interface DistributionChartsProps {
	pathId: string;
	isValidPath: boolean;
}

export function DistributionCharts({
	pathId,
	isValidPath,
}: DistributionChartsProps) {
	const { data, isLoading } = api.stats.getDistributions.useQuery(
		{ pathId },
		{ enabled: isValidPath },
	);

	if (isLoading) {
		return (
			<div className="mt-8 flex h-64 items-center justify-center">
				<p className="text-white/50">Loading distribution charts...</p>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="mt-12 space-y-8">
			<h2 className="font-bold text-2xl text-white">Distributions</h2>
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<ChartCard
					data={data.bits}
					title="Bits Embedded Distribution"
					xKey="label"
					yKey="count"
				/>
				<ChartCard
					data={data.ratio}
					title="Compression Ratio Distribution"
					xKey="label"
					yKey="count"
				/>
				<ChartCard
					data={data.angles}
					title="Angles per Post Distribution"
					xKey="label"
					yKey="count"
				/>
				<ChartCard
					data={data.commentChain}
					title="Comment Chain Length Distribution"
					xKey="label"
					yKey="count"
				/>
			</div>
		</div>
	);
}

function ChartCard({
	title,
	data,
	xKey,
	yKey,
}: {
	title: string;
	data: any[];
	xKey: string;
	yKey: string;
}) {
	return (
		<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
			<h3 className="font-medium text-lg text-white/80">{title}</h3>
			<div className="h-64">
				<ResponsiveContainer height="100%" width="100%">
					<BarChart data={data}>
						<CartesianGrid
							stroke="#ffffff20"
							strokeDasharray="3 3"
							vertical={false}
						/>
						<XAxis
							dataKey={xKey}
							stroke="#ffffff50"
							tick={{ fill: "#ffffff50" }}
						/>
						<YAxis stroke="#ffffff50" tick={{ fill: "#ffffff50" }} />
						<Tooltip
							contentStyle={{
								backgroundColor: "#1f2937",
								border: "1px solid #374151",
								borderRadius: "0.5rem",
							}}
							itemStyle={{ color: "#fff" }}
						/>
						<Bar dataKey={yKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
