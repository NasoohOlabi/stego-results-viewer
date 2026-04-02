"use client";

import { Link2 } from "lucide-react";
import Link from "next/link";
import type { PerplexityMetrics } from "~/schemas/perplexity-metrics";

const TOP_OUTLIERS_COUNT = 5;

function outputBasename(filePath: string): string {
	return filePath.replace(/^.*[/\\]/, "");
}

export function PerplexityMetricsRenderer({
	data,
	folderId = "side-wing",
}: {
	data: PerplexityMetrics;
	/** Matches `folder` query on the home file viewer (`/?filename=…&folder=…`). */
	folderId?: string;
}) {
	const topOutliers = [...data.per_file_perplexity]
		.sort((a, b) => b.perplexity - a.perplexity)
		.slice(0, TOP_OUTLIERS_COUNT);

	return (
		<div className="space-y-8">
			<header>
				<h2 className="font-bold text-2xl">Perplexity Metrics</h2>
				<p className="text-white/50">
					Generated at {new Date(data.created_at_utc).toLocaleString()}
				</p>
			</header>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Average Perplexity
					</h3>
					<div className="font-bold text-4xl text-purple-400">
						{data.perplexity_summary.average_perplexity.toFixed(2)}
					</div>
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Minimum Perplexity
					</h3>
					<div className="font-bold text-4xl text-green-400">
						{data.perplexity_summary.min_perplexity.toFixed(2)}
					</div>
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Maximum Perplexity
					</h3>
					<div className="font-bold text-4xl text-red-400">
						{data.perplexity_summary.max_perplexity.toFixed(2)}
					</div>
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Scored Texts
					</h3>
					<div className="font-bold text-4xl text-cyan-400">
						{data.dataset_summary.scored_texts}
					</div>
					<p className="text-white/30 text-xs">
						Out of {data.dataset_summary.total_output_files} output files.
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-white/10 bg-white/5 p-6">
				<h3 className="mb-4 font-semibold text-lg">Top Perplexity Outliers</h3>
				<div className="space-y-3">
					{topOutliers.map((item) => {
						const basename = outputBasename(item.file);
						const href = `/?filename=${encodeURIComponent(basename)}&folder=${encodeURIComponent(folderId)}`;
						return (
							<div
								className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
								key={item.file}
							>
								<Link
									className="group flex min-w-0 flex-1 items-center gap-2 text-cyan-400/90 text-sm hover:text-cyan-300"
									href={href}
									title="Open in file viewer"
								>
									<span className="truncate group-hover:underline">
										{item.file}
									</span>
									<Link2
										aria-hidden
										className="shrink-0 opacity-70 group-hover:opacity-100"
										size={16}
									/>
								</Link>
								<p className="shrink-0 font-semibold text-red-300 text-sm">
									{item.perplexity.toFixed(2)}
								</p>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
