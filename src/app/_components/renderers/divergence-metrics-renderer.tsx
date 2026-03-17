"use client";

import type { DivergenceMetrics } from "~/schemas/divergence-metrics";

export function DivergenceMetricsRenderer({ data }: { data: DivergenceMetrics }) {
	return (
		<div className="space-y-8">
			<header>
				<h2 className="text-2xl font-bold">Divergence Metrics</h2>
				<p className="text-white/50">
					Generated at {new Date(data.created_at_utc).toLocaleString()}
				</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{/* Dataset Summary */}
				<div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="text-lg font-semibold mb-4">Dataset Summary</h3>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div>
							<p className="text-xs text-white/50 uppercase">Total Files</p>
							<p className="text-xl font-bold">{data.dataset_summary.total_output_files}</p>
						</div>
						<div>
							<p className="text-xs text-white/50 uppercase">Unique Posts</p>
							<p className="text-xl font-bold">{data.dataset_summary.unique_output_post_ids}</p>
						</div>
						<div>
							<p className="text-xs text-white/50 uppercase">Usable Samples</p>
							<p className="text-xl font-bold">{data.dataset_summary.usable_stego_samples}</p>
						</div>
						<div>
							<p className="text-xs text-white/50 uppercase">Global Corpus Size</p>
							<p className="text-xl font-bold">{data.dataset_summary.global_nonempty_comment_bodies.toLocaleString()}</p>
						</div>
					</div>
				</div>

				{/* Primary Baseline */}
				<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
					<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
						Primary Baseline (Matched Post)
					</h3>
					<div className="space-y-4">
						<div>
							<div className="text-3xl font-bold text-blue-400">
								{data.primary_baseline_matched_post.average_kl_stego_vs_matched_post.toFixed(4)}
							</div>
							<p className="text-xs text-white/30">Avg KL Divergence</p>
						</div>
						<div>
							<div className="text-3xl font-bold text-blue-300">
								{data.primary_baseline_matched_post.average_jsd_stego_vs_matched_post.toFixed(4)}
							</div>
							<p className="text-xs text-white/30">Avg Jenson-Shannon Divergence</p>
						</div>
					</div>
				</div>

				{/* Secondary Baseline */}
				<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
					<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
						Secondary Baseline (Global Corpus)
					</h3>
					<div className="space-y-4">
						<div>
							<div className="text-3xl font-bold text-green-400">
								{data.secondary_baseline_global_corpus.average_kl_stego_vs_global_corpus.toFixed(4)}
							</div>
							<p className="text-xs text-white/30">Avg KL Divergence</p>
						</div>
						<div>
							<div className="text-3xl font-bold text-green-300">
								{data.secondary_baseline_global_corpus.average_jsd_stego_vs_global_corpus.toFixed(4)}
							</div>
							<p className="text-xs text-white/30">Avg Jenson-Shannon Divergence</p>
						</div>
					</div>
				</div>

				{/* Config info */}
				<div className="rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4">
						Configuration
					</h3>
					<dl className="grid grid-cols-2 gap-y-2 text-xs">
						<dt className="text-white/50">Tokenization</dt>
						<dd>{data.config.tokenization}</dd>
						<dt className="text-white/50">Smoothing Alpha</dt>
						<dd>{data.config.smoothing_alpha}</dd>
						<dt className="text-white/50">KL Direction</dt>
						<dd>{data.config.kl_direction}</dd>
					</dl>
				</div>
			</div>
		</div>
	);
}
