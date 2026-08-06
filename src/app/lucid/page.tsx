import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "LUCID results",
};

const LUCID_SUMMARY_PATH = join(
	process.cwd(),
	"..",
	"stego-side-wing",
	"metrics",
	"e2e_runs",
	"LUCID_context_weighted_v2_balanced_500",
	"summary.json",
);

interface LucidSummary {
	run_id?: string;
	created_at_utc?: string;
	total_requested_samples?: number;
	total_succeeded_samples?: number;
	total_failed_samples?: number;
	unique_selected_post_ids?: string[];
	source?: {
		angle_artifact?: {
			artifact_namespace?: string;
			sampler_version?: string;
			angles_retained_target?: number;
		};
	};
}

async function loadSummary(): Promise<LucidSummary | null> {
	try {
		return JSON.parse(
			await readFile(LUCID_SUMMARY_PATH, "utf8"),
		) as LucidSummary;
	} catch {
		return null;
	}
}

function formatPercent(numerator: number, denominator: number): string {
	if (denominator <= 0) return "—";
	return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function LucidResultsPage() {
	const summary = await loadSummary();
	if (!summary) {
		return (
			<main className="mx-auto max-w-4xl p-8 text-white">
				<h1 className="font-bold text-3xl">LUCID results</h1>
				<p className="mt-4 text-white/60">
					The LUCID run summary has not been written yet.
				</p>
			</main>
		);
	}

	const requested = summary.total_requested_samples ?? 0;
	const succeeded = summary.total_succeeded_samples ?? 0;
	const failed = summary.total_failed_samples ?? 0;
	const uniquePosts = summary.unique_selected_post_ids?.length ?? 0;
	const artifact = summary.source?.angle_artifact;

	return (
		<main className="mx-auto max-w-5xl space-y-6 p-8 text-white">
			<header className="space-y-2">
				<p className="font-medium text-emerald-300 text-sm uppercase tracking-wide">
					Project LUCID
				</p>
				<h1 className="font-bold text-3xl">Context-weighted angle run</h1>
				<p className="text-sm text-white/60">
					Balanced 500-attempt evaluation using cached researched posts and the
					context-weighted angle sampler.
				</p>
			</header>

			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Metric label="Requested" value={String(requested)} />
				<Metric label="Succeeded" tone="success" value={String(succeeded)} />
				<Metric label="Failed" tone="failure" value={String(failed)} />
				<Metric
					label="Success rate"
					value={formatPercent(succeeded, requested)}
				/>
			</section>

			<section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
				<h2 className="font-semibold text-lg">Run provenance</h2>
				<dl className="mt-4 grid gap-3 text-white/70 sm:grid-cols-2">
					<Detail label="Run ID" value={summary.run_id ?? "—"} />
					<Detail label="Created" value={summary.created_at_utc ?? "—"} />
					<Detail label="Unique source posts" value={String(uniquePosts)} />
					<Detail label="Sampler" value={artifact?.sampler_version ?? "—"} />
					<Detail
						label="Artifact namespace"
						value={artifact?.artifact_namespace ?? "—"}
					/>
					<Detail
						label="Retained angles/post"
						value={String(artifact?.angles_retained_target ?? "—")}
					/>
				</dl>
			</section>

			<p className="text-sm text-white/50">
				The 500 attempts reuse {uniquePosts || "the available"} source posts;
				evaluate uncertainty clustered by source post rather than treating
				attempts as independent.
			</p>
		</main>
	);
}

function Metric({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: "success" | "failure";
}) {
	const toneClass =
		tone === "success"
			? "text-emerald-300"
			: tone === "failure"
				? "text-red-300"
				: "text-white";
	return (
		<div className="rounded-xl border border-white/10 bg-white/5 p-4">
			<div className="text-sm text-white/55">{label}</div>
			<div className={`mt-1 font-bold text-2xl ${toneClass}`}>{value}</div>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-white/45">{label}</dt>
			<dd className="mt-1 break-all text-white/90">{value}</dd>
		</div>
	);
}
