"use client";

import { useMemo, useState } from "react";

export type SampleCard = {
	key: string;
	postId: string;
	sampleIndex?: number;
	ourBits?: number;
	zlgBits?: number;
	coverPreview?: string;
	ourText: string;
	zlgText: string;
	ourSus?: { correct: boolean; reason?: string } | null;
	zlgSus?: { correct: boolean; reason?: string } | null;
	ourQuality?: QualityDetails;
	zlgQuality?: QualityDetails;
};

export type QualityDetails = {
	bleu?: number;
	rougeL?: number;
	bertscore_f1?: number;
	self_consistency?: number;
	thread_grounded_factuality?: number;
	geval_overall?: number;
};

type FilterKey = "all" | "zlg_only" | "ours_only" | "both" | "neither";

const FILTERS: { key: FilterKey; label: string }[] = [
	{ key: "all", label: "All samples" },
	{ key: "zlg_only", label: "ZLG caught, ours wasn't" },
	{ key: "ours_only", label: "Ours caught, ZLG wasn't" },
	{ key: "both", label: "Both caught" },
	{ key: "neither", label: "Neither caught" },
];

function matches(sample: SampleCard, filter: FilterKey): boolean {
	const ourCaught = Boolean(sample.ourSus?.correct);
	const zlgCaught = Boolean(sample.zlgSus?.correct);
	switch (filter) {
		case "zlg_only":
			return zlgCaught && !ourCaught;
		case "ours_only":
			return ourCaught && !zlgCaught;
		case "both":
			return ourCaught && zlgCaught;
		case "neither":
			return !ourCaught && !zlgCaught;
		default:
			return true;
	}
}

function SusBadge({
	label,
	sus,
}: {
	label: string;
	sus?: { correct: boolean; reason?: string } | null;
}) {
	if (!sus) return null;
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-[11px] ${
				sus.correct
					? "bg-rose-500/15 text-rose-300"
					: "bg-emerald-500/15 text-emerald-300"
			}`}
			title={sus.reason}
		>
			{sus.correct ? "\u{1F50D}" : "✓"} {label}{" "}
			{sus.correct ? "caught" : "blended in"}
		</span>
	);
}

function QualityLine({ quality }: { quality?: QualityDetails }) {
	if (!quality) return null;
	const values = [
		["BLEU", quality.bleu],
		["ROUGE-L", quality.rougeL],
		["BERT F1", quality.bertscore_f1],
		["Self", quality.self_consistency],
		["Facts", quality.thread_grounded_factuality],
		["G-Eval", quality.geval_overall],
	].filter(([, value]) => typeof value === "number");
	if (!values.length) return null;
	return (
		<p className="text-slate-500 text-xs">
			{values
				.map(([label, value]) => `${label} ${Number(value).toFixed(2)}`)
				.join(" · ")}
		</p>
	);
}

export function SampleBrowser({ samples }: { samples: SampleCard[] }) {
	const [filter, setFilter] = useState<FilterKey>("all");
	const [limit, setLimit] = useState(12);

	// Sus-detection filters only make sense when at least one sample actually
	// carries judge results; otherwise every non-"all" bucket is either always
	// empty or trivially "neither", which reads as a real finding instead of
	// "this judge pass was never run".
	const hasSusData = samples.some((s) => s.ourSus || s.zlgSus);

	const filtered = useMemo(
		() => samples.filter((s) => matches(s, filter)),
		[samples, filter],
	);
	const visible = filtered.slice(0, limit);

	return (
		<div className="space-y-4">
			{hasSusData ? (
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((f) => {
						const count = samples.filter((s) => matches(s, f.key)).length;
						return (
							<button
								className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
									filter === f.key
										? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
										: "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
								}`}
								key={f.key}
								onClick={() => {
									setFilter(f.key);
									setLimit(12);
								}}
								type="button"
							>
								{f.label} <span className="text-slate-500">({count})</span>
							</button>
						);
					})}
				</div>
			) : null}

			{visible.length === 0 ? (
				<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 text-sm">
					No samples match this filter.
				</div>
			) : (
				<div className="space-y-3">
					{visible.map((sample) => (
						<div
							className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
							key={sample.key}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-xs">
									<span className="text-slate-400">Post:</span> {sample.postId}{" "}
									| <span className="text-slate-400">Sample:</span>{" "}
									{sample.sampleIndex ?? "n/a"} |{" "}
									<span className="text-slate-400">Encoded:</span>{" "}
									<span className="font-mono">
										{sample.ourBits ?? "n/a"} bits (ours) ·{" "}
										{sample.zlgBits ?? "n/a"} bits (ZLG)
									</span>
								</p>
							</div>
							{sample.coverPreview ? (
								<p className="text-slate-500 text-xs italic">
									Cover context: {sample.coverPreview}
								</p>
							) : null}
							<div className="grid gap-3 lg:grid-cols-2">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<p className="text-cyan-300 text-xs uppercase tracking-wide">
											Our Method
										</p>
										<SusBadge label="" sus={sample.ourSus} />
									</div>
									<div className="max-h-40 overflow-auto rounded border border-white/10 bg-black/20 p-2 font-mono text-xs">
										{sample.ourText}
									</div>
									<QualityLine quality={sample.ourQuality} />
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<p className="text-orange-300 text-xs uppercase tracking-wide">
											ZLG Baseline
										</p>
										<SusBadge label="" sus={sample.zlgSus} />
									</div>
									<div className="max-h-40 overflow-auto rounded border border-white/10 bg-black/20 p-2 font-mono text-xs">
										{sample.zlgText}
									</div>
									<QualityLine quality={sample.zlgQuality} />
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{filtered.length > visible.length ? (
				<button
					className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 text-slate-400 text-xs hover:border-white/20 hover:text-slate-200"
					onClick={() => setLimit((n) => n + 12)}
					type="button"
				>
					Show more ({filtered.length - visible.length} remaining)
				</button>
			) : null}
		</div>
	);
}
