"use client";

import { useMemo, useState } from "react";

export type SampleCard = {
	key: string;
	postId: string;
	sampleIndex?: number;
	coverPreview?: string;
	balancedText: string;
	barbText: string;
	balancedWordCount?: number;
	barbWordCount?: number;
	balancedSuccess?: boolean;
	barbSuccess?: boolean;
	balancedDecodeOk?: boolean;
	barbDecodeOk?: boolean;
	balancedBadges?: string[];
	barbBadges?: string[];
};

type FilterKey =
	| "all"
	| "barb_affect"
	| "barb_specific"
	| "barb_platitude"
	| "balanced_platitude";

const FILTERS: { key: FilterKey; label: string }[] = [
	{ key: "all", label: "All pairs" },
	{ key: "barb_affect", label: "BARB has strong affect" },
	{ key: "barb_specific", label: "BARB is thread-specific" },
	{ key: "barb_platitude", label: "BARB still platitude" },
	{ key: "balanced_platitude", label: "Balanced hit platitude" },
];

function matches(sample: SampleCard, filter: FilterKey): boolean {
	switch (filter) {
		case "barb_affect":
			return Boolean(sample.barbBadges?.includes("strong affect"));
		case "barb_specific":
			return Boolean(sample.barbBadges?.includes("specific"));
		case "barb_platitude":
			return Boolean(sample.barbBadges?.includes("platitude"));
		case "balanced_platitude":
			return Boolean(sample.balancedBadges?.includes("platitude"));
		default:
			return true;
	}
}

function BadgeRow({ badges }: { badges?: string[] }) {
	if (!badges?.length) return null;
	return (
		<div className="flex flex-wrap gap-1">
			{badges.map((badge) => (
				<span
					className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400"
					key={badge}
				>
					{badge}
				</span>
			))}
		</div>
	);
}

function StatusLine({
	success,
	decodeOk,
	wordCount,
}: {
	success?: boolean;
	decodeOk?: boolean;
	wordCount?: number;
}) {
	const parts: string[] = [];
	if (typeof wordCount === "number") parts.push(`${wordCount} words`);
	if (success !== undefined) parts.push(success ? "encode ok" : "encode fail");
	if (decodeOk !== undefined)
		parts.push(decodeOk ? "receiver match" : "receiver miss");
	if (!parts.length) return null;
	return <p className="text-slate-500 text-xs">{parts.join(" · ")}</p>;
}

export function SampleBrowser({ samples }: { samples: SampleCard[] }) {
	const [filter, setFilter] = useState<FilterKey>("all");
	const [limit, setLimit] = useState(12);

	const hasFeatureData = samples.some(
		(s) =>
			(s.barbBadges?.length ?? 0) > 0 || (s.balancedBadges?.length ?? 0) > 0,
	);

	const filtered = useMemo(
		() => samples.filter((s) => matches(s, filter)),
		[samples, filter],
	);
	const visible = filtered.slice(0, limit);

	if (samples.length === 0) {
		return (
			<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 text-sm">
				No paired samples yet. Once the pairer writes{" "}
				<code className="rounded bg-black/30 px-1">
					comparison/paired_rows.jsonl
				</code>
				, Balanced vs BARB carriers will show here side by side.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{hasFeatureData ? (
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
							<p className="text-xs">
								<span className="text-slate-400">Post:</span> {sample.postId} |{" "}
								<span className="text-slate-400">Sample:</span>{" "}
								{sample.sampleIndex ?? "n/a"}
							</p>
							{sample.coverPreview ? (
								<p className="text-slate-500 text-xs italic">
									Thread context: {sample.coverPreview}
								</p>
							) : null}
							<div className="grid gap-3 lg:grid-cols-2">
								<div className="space-y-2">
									<p className="text-slate-300 text-xs uppercase tracking-wide">
										Balanced (control)
									</p>
									<div className="max-h-40 overflow-auto rounded border border-white/10 bg-black/20 p-2 font-mono text-xs">
										{sample.balancedText}
									</div>
									<StatusLine
										decodeOk={sample.balancedDecodeOk}
										success={sample.balancedSuccess}
										wordCount={sample.balancedWordCount}
									/>
									<BadgeRow badges={sample.balancedBadges} />
								</div>
								<div className="space-y-2">
									<p className="text-cyan-300 text-xs uppercase tracking-wide">
										BARB
									</p>
									<div className="max-h-40 overflow-auto rounded border border-cyan-400/20 bg-black/20 p-2 font-mono text-xs">
										{sample.barbText}
									</div>
									<StatusLine
										decodeOk={sample.barbDecodeOk}
										success={sample.barbSuccess}
										wordCount={sample.barbWordCount}
									/>
									<BadgeRow badges={sample.barbBadges} />
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
