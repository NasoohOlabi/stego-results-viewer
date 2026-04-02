"use client";

import type { DivergenceMetrics } from "~/schemas/divergence-metrics";

export function DivergenceMetricsRenderer({
	data,
	filename: _filename,
}: {
	data: DivergenceMetrics;
	filename?: string | null;
}) {
	return (
		<div className="space-y-8">
			<header>
				<h2 className="font-bold text-2xl">Divergence Metrics</h2>
				<p className="text-white/50">
					Generated at {new Date(data.created_at_utc).toLocaleString()}
				</p>
			</header>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* Dataset Summary */}
				<div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="mb-4 font-semibold text-lg">Dataset Summary</h3>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div>
							<p className="text-white/50 text-xs uppercase">Total Files</p>
							<p className="font-bold text-xl">
								{data.dataset_summary.total_output_files}
							</p>
						</div>
						<div>
							<p className="text-white/50 text-xs uppercase">Unique Posts</p>
							<p className="font-bold text-xl">
								{data.dataset_summary.unique_output_post_ids}
							</p>
						</div>
						<div>
							<p className="text-white/50 text-xs uppercase">Usable Samples</p>
							<p className="font-bold text-xl">
								{data.dataset_summary.usable_stego_samples}
							</p>
						</div>
						<div>
							<p className="text-white/50 text-xs uppercase">
								Global Corpus Size
							</p>
							<p className="font-bold text-xl">
								{data.dataset_summary.global_nonempty_comment_bodies.toLocaleString()}
							</p>
						</div>
					</div>
				</div>

				{/* Primary Baseline */}
				<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Primary Baseline (Matched Post)
					</h3>
					<div className="space-y-4">
						<div>
							<div className="font-bold text-3xl text-blue-400">
								{data.primary_baseline_matched_post.average_kl_stego_vs_matched_post.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">Avg KL Divergence</p>
						</div>
						<div>
							<div className="font-bold text-3xl text-blue-300">
								{data.primary_baseline_matched_post.average_jsd_stego_vs_matched_post.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">
								Avg Jenson-Shannon Divergence
							</p>
						</div>
					</div>
				</div>

				{/* Secondary Baseline */}
				<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Secondary Baseline (Global Corpus)
					</h3>
					<div className="space-y-4">
						<div>
							<div className="font-bold text-3xl text-green-400">
								{data.secondary_baseline_global_corpus.average_kl_stego_vs_global_corpus.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">Avg KL Divergence</p>
						</div>
						<div>
							<div className="font-bold text-3xl text-green-300">
								{data.secondary_baseline_global_corpus.average_jsd_stego_vs_global_corpus.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">
								Avg Jenson-Shannon Divergence
							</p>
						</div>
					</div>
				</div>

				{/* Config info */}
				<div className="rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="mb-4 font-medium text-sm text-white/50 uppercase tracking-wider">
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
