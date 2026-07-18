"use client";

import { useState } from "react";

export type TangentDbQualitySummary = {
	version?: string;
	inference_unit?: string;
	report_rows?: number;
	unique_posts?: number;
	relevance?: {
		kept_score_mean_by_post?: { mean?: number | null };
	};
	distinctness?: {
		mean_pairwise_jaccard_by_post?: { mean?: number | null };
	};
	source_composition?: {
		mean_share_by_post?: Record<string, { mean?: number | null }>;
		search_share_by_post?: { mean?: number | null };
	};
	deduplication?: {
		drop_rate_by_post?: { mean?: number | null };
		posts_with_dedup_drops?: number;
	};
	capacity_floor_relaxation?: {
		posts_relaxed?: number;
		posts_floor_unmet?: number;
	};
	kept_count_by_post?: { mean?: number | null };
	config_hashes?: string[];
};

type Side = "legacy" | "v1";

function value(value: number | null | undefined, percent = false) {
	if (value === undefined || value === null) return "n/a";
	return percent ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
}

export function TangentDbQualityPanel({
	legacy,
	v1,
}: {
	legacy?: TangentDbQualitySummary | null;
	v1?: TangentDbQualitySummary | null;
}) {
	const [side, setSide] = useState<Side>("v1");
	const summary = side === "legacy" ? legacy : v1;
	const wasRun = Boolean(summary?.unique_posts);

	return (
		<section className="rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-5">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="font-semibold text-sm text-violet-200 uppercase tracking-wide">
						Tangent DB quality
					</p>
					<p className="mt-1 max-w-3xl text-slate-400 text-sm">
						Offline, post-clustered diagnostics from persisted tangent DB
						reports. This does not run a comparison.
					</p>
				</div>
				<div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
					{(["legacy", "v1"] as const).map((option) => (
						<button
							className={`rounded-md px-3 py-1.5 font-medium text-xs ${
								side === option
									? "bg-violet-400/20 text-violet-100"
									: "text-slate-400 hover:text-slate-200"
							}`}
							key={option}
							onClick={() => setSide(option)}
							type="button"
						>
							{option === "legacy" ? "Legacy" : "V1"}
						</button>
					))}
				</div>
			</div>

			{!wasRun ? (
				<div className="mt-5 rounded-lg border border-white/15 border-dashed bg-black/20 p-6 text-center">
					<p className="font-semibold text-slate-200">Not run</p>
					<p className="mt-1 text-slate-500 text-xs">
						No persisted {side === "legacy" ? "legacy" : "v1"} tangent DB
						quality reports are available.
					</p>
				</div>
			) : (
				<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<QualityStat label="Posts" value={String(summary?.unique_posts)} />
					<QualityStat
						label="Kept relevance"
						value={value(summary?.relevance?.kept_score_mean_by_post?.mean)}
					/>
					<QualityStat
						label="Pairwise Jaccard"
						value={value(
							summary?.distinctness?.mean_pairwise_jaccard_by_post?.mean,
						)}
					/>
					<QualityStat
						label="Search share"
						value={value(
							summary?.source_composition?.search_share_by_post?.mean,
							true,
						)}
					/>
					<QualityStat
						label="Kept capacity"
						value={value(summary?.kept_count_by_post?.mean)}
					/>
					<QualityStat
						label="Dedup drop rate"
						value={value(summary?.deduplication?.drop_rate_by_post?.mean, true)}
					/>
					<QualityStat
						label="Posts relaxed"
						value={String(
							summary?.capacity_floor_relaxation?.posts_relaxed ?? 0,
						)}
					/>
					<QualityStat
						label="Floor unmet"
						value={String(
							summary?.capacity_floor_relaxation?.posts_floor_unmet ?? 0,
						)}
					/>
				</div>
			)}
		</section>
	);
}

function QualityStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-white/10 bg-black/20 p-3">
			<p className="text-slate-500 text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-1 font-semibold text-lg text-slate-100">{value}</p>
		</div>
	);
}
