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
				<h2 className="font-bold text-2xl">
					Topical-Fit Proxies: KL &amp; JSD
				</h2>
				<p className="text-white/50">
					Generated at {new Date(data.created_at_utc).toLocaleString()}
				</p>
			</header>
			<p className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100 text-sm">
				KL and JSD measure word-distribution overlap with the matched thread or
				global corpus, not reader-facing naturalness or human authorship. For
				multi-frame embedding, every carrier comment is compared separately and
				then averaged; this is not a single message-level divergence score.
				<strong className="mt-2 block">
					Read the raw values against the human control below, never against
					zero. A real comment held out of its own thread also scores far from
					zero, so only the gap is meaningful.
				</strong>
			</p>

			{data.human_control_matched_post &&
			data.naturalness_gap_vs_human_control ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
						<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
							Human Control (Held-Out Real Comment)
						</h3>
						<div>
							<div className="font-bold text-3xl text-white/70">
								{data.human_control_matched_post.average_kl_human_vs_matched_post.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">
								Avg KL — the floor, not zero
							</p>
						</div>
						<div>
							<div className="font-bold text-3xl text-white/60">
								{data.human_control_matched_post.average_jsd_human_vs_matched_post.toFixed(
									4,
								)}
							</div>
							<p className="text-white/30 text-xs">
								Avg JSD — the floor, not zero
							</p>
						</div>
					</div>
					<div className="space-y-4 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-6">
						<h3 className="font-medium text-emerald-200/70 text-sm uppercase tracking-wider">
							Naturalness Gap (Stego − Human)
						</h3>
						<div>
							<div className="font-bold text-3xl text-emerald-300">
								{data.naturalness_gap_vs_human_control.kl_gap?.toFixed(4) ??
									"—"}
							</div>
							<p className="text-white/30 text-xs">
								KL gap — 0 is indistinguishable
							</p>
						</div>
						<div>
							<div className="font-bold text-3xl text-emerald-200">
								{data.naturalness_gap_vs_human_control.jsd_gap?.toFixed(4) ??
									"—"}
							</div>
							<p className="text-white/30 text-xs">
								JSD gap of {data.config.jsd_upper_bound?.toFixed(3) ?? "0.693"}{" "}
								maximum
							</p>
						</div>
					</div>
				</div>
			) : null}

			{data.alpha_sensitivity_mean_kl_stego_vs_matched_post ? (
				<div className="rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="mb-1 font-medium text-sm text-white/50 uppercase tracking-wider">
						KL Sensitivity to Smoothing Constant
					</h3>
					<p className="mb-4 text-white/40 text-xs">
						On short samples almost all mass falls on words the baseline never
						used, so KL grows roughly with log(1/alpha). A single KL number is
						only meaningful next to the alpha that produced it.
					</p>
					<div className="flex flex-wrap gap-6">
						{Object.entries(
							data.alpha_sensitivity_mean_kl_stego_vs_matched_post,
						).map(([alpha, value]) => (
							<div key={alpha}>
								<div className="font-bold text-white/80 text-xl">
									{value?.toFixed(3) ?? "—"}
								</div>
								<p className="text-white/30 text-xs">alpha = {alpha}</p>
							</div>
						))}
					</div>
				</div>
			) : null}

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
							<p className="text-white/30 text-xs">
								Carrier texts, not messages
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
