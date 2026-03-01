"use client";

import { api } from "~/trpc/react";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

interface DistributionChartsProps {
	pathId: string;
	isValidPath: boolean;
}

export function DistributionCharts({ pathId, isValidPath }: DistributionChartsProps) {
	const { data, isLoading } = api.stats.getDistributions.useQuery(
		{ pathId },
		{ enabled: isValidPath }
	);

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center mt-8">
				<p className="text-white/50">Loading distribution charts...</p>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="mt-12 space-y-8">
			<h2 className="text-2xl font-bold text-white">Distributions</h2>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<ChartCard title="Bits Embedded Distribution" data={data.bits} xKey="label" yKey="count" />
				<ChartCard title="Compression Ratio Distribution" data={data.ratio} xKey="label" yKey="count" />
				<ChartCard title="Angles per Post Distribution" data={data.angles} xKey="label" yKey="count" />
				<ChartCard title="Comment Chain Length Distribution" data={data.commentChain} xKey="label" yKey="count" />
			</div>
		</div>
	);
}

function ChartCard({ title, data, xKey, yKey }: { title: string; data: any[]; xKey: string; yKey: string }) {
	return (
		<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
			<h3 className="text-lg font-medium text-white/80">{title}</h3>
			<div className="h-64">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data}>
						<CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
						<XAxis dataKey={xKey} stroke="#ffffff50" tick={{ fill: '#ffffff50' }} />
						<YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50' }} />
						<Tooltip
							contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
							itemStyle={{ color: '#fff' }}
						/>
						<Bar dataKey={yKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
					</BarChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
