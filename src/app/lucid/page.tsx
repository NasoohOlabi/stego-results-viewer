import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { LucidExplainer } from "~/app/_components/research-explainers";
import {
	deriveFromDirectories,
	deriveFromFile,
	mapWithConcurrency,
} from "~/server/artifact-cache";
import { FreshDatasetSection } from "./_components/fresh-dataset-section";
import { loadFreshDataset } from "./_lib/fresh-dataset";

/** Open file handles to keep in flight while scanning failure artifacts. */
const SCAN_CONCURRENCY = 32;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "LUCID results",
};

const LUCID_RUN_DIR = join(
	process.cwd(),
	"..",
	"stego-side-wing",
	"metrics",
	"e2e_runs",
	"LUCID_context_weighted_v2_balanced_500",
);

const LUCID_SUMMARY_PATH = join(LUCID_RUN_DIR, "summary.json");
const LUCID_PROGRESS_PATH = join(LUCID_RUN_DIR, "progress.json");
const LUCID_FAILURES_DIR = join(LUCID_RUN_DIR, "balanced", "failures");
const TANGENTS_DB_V1_NS = "project_lucid/tangents_db/v1";

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
			lucid_tangents_db?: {
				artifact_namespace?: string;
				content_hash?: string;
			};
		};
	};
}

interface LucidProgress {
	failure_totals?: Record<string, number>;
	git_commit?: string;
	git_branch?: string;
	git_status_clean?: boolean;
	status?: string;
}

interface TaxonomyCounts {
	no_decode: number;
	wrong_angle_decode: number;
	weak_thread_grounding: number;
	quality_gate_violation: number;
}

async function readJson<T>(path: string): Promise<T | null> {
	try {
		return JSON.parse(await readFile(path, "utf8")) as T;
	} catch {
		return null;
	}
}

/**
 * Narrow the run summary to what this page renders.
 *
 * `summary.json` is 4.9 MB, 2.7 MB of which is `profile_summaries` — per-sample
 * detail the page never shows. Parsing it whole put every byte in reach of the
 * RSC payload; keeping the seven fields below costs under a kilobyte.
 */
function projectLucidSummary(text: string): LucidSummary | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null) return null;
	const full = parsed as LucidSummary;
	return {
		run_id: full.run_id,
		created_at_utc: full.created_at_utc,
		total_requested_samples: full.total_requested_samples,
		total_succeeded_samples: full.total_succeeded_samples,
		total_failed_samples: full.total_failed_samples,
		unique_selected_post_ids: full.unique_selected_post_ids,
		source: full.source,
	};
}

function emptyTaxonomy(): TaxonomyCounts {
	return {
		no_decode: 0,
		wrong_angle_decode: 0,
		weak_thread_grounding: 0,
		quality_gate_violation: 0,
	};
}

function kindFromReasons(reasons: unknown): keyof TaxonomyCounts {
	const list = Array.isArray(reasons) ? reasons.map(String) : [];
	if (
		list.some((r) =>
			[
				"decode_mismatch",
				"adjacent_angle_mismatch",
				"weak_decoder_mode",
			].includes(r),
		)
	) {
		return "wrong_angle_decode";
	}
	if (
		list.some((r) =>
			[
				"no_context_overlap",
				"unsupported_topic_drift",
				"weak_selected_angle_grounding",
			].includes(r),
		)
	) {
		return "weak_thread_grounding";
	}
	if (list.length === 0) return "no_decode";
	return "quality_gate_violation";
}

async function scanFailureTaxonomy(): Promise<{
	codes: Record<string, number>;
	taxonomy: TaxonomyCounts;
	failuresScanned: number;
}> {
	const codes: Record<string, number> = {};
	const taxonomy = emptyTaxonomy();
	let failuresScanned = 0;
	try {
		const names = (await readdir(LUCID_FAILURES_DIR)).filter((name) =>
			name.endsWith(".json"),
		);
		const raws = await mapWithConcurrency(names, SCAN_CONCURRENCY, (name) =>
			readJson<Record<string, unknown>>(join(LUCID_FAILURES_DIR, name)),
		);
		for (const raw of raws) {
			if (!raw) continue;
			failuresScanned += 1;
			const code = String(raw.failure_code ?? "unknown");
			codes[code] = (codes[code] ?? 0) + 1;
			const top = raw.failure_taxonomy;
			if (top && typeof top === "object") {
				for (const key of Object.keys(taxonomy) as (keyof TaxonomyCounts)[]) {
					const value = (top as Record<string, unknown>)[key];
					if (typeof value === "number") taxonomy[key] += value;
				}
				continue;
			}
			const envelope = raw.envelope as Record<string, unknown> | undefined;
			const stego = envelope?.stego_encode as
				| Record<string, unknown>
				| undefined;
			const candidates = stego?.contextuality_reasons;
			if (!Array.isArray(candidates) || candidates.length === 0) {
				taxonomy.no_decode += 1;
				continue;
			}
			for (const candidate of candidates) {
				if (!candidate || typeof candidate !== "object") continue;
				const row = candidate as Record<string, unknown>;
				if (row.accepted) continue;
				if (row.decoded_index == null) taxonomy.no_decode += 1;
				else taxonomy[kindFromReasons(row.rejection_reasons)] += 1;
			}
		}
	} catch {
		/* failures dir may be absent */
	}
	return { codes, taxonomy, failuresScanned };
}

function formatPercent(numerator: number, denominator: number): string {
	if (denominator <= 0) return "—";
	return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function LucidResultsPage() {
	const [summary, progress, failureAgg, freshDataset] = await Promise.all([
		deriveFromFile<LucidSummary | null>({
			path: LUCID_SUMMARY_PATH,
			as: "lucid-run-summary",
			fallback: null,
			derive: projectLucidSummary,
		}),
		deriveFromFile<LucidProgress | null>({
			path: LUCID_PROGRESS_PATH,
			as: "lucid-run-progress",
			fallback: null,
			derive: (text) => {
				try {
					const parsed: unknown = JSON.parse(text);
					return typeof parsed === "object" && parsed !== null
						? (parsed as LucidProgress)
						: null;
				} catch {
					return null;
				}
			},
		}),
		deriveFromDirectories({
			as: "lucid-failure-taxonomy",
			dirs: [LUCID_FAILURES_DIR],
			derive: scanFailureTaxonomy,
		}),
		loadFreshDataset(),
	]);

	if (!summary) {
		return (
			<main className="mx-auto max-w-6xl space-y-6 p-8 text-white">
				<h1 className="font-bold text-3xl">LUCID results</h1>
				<LucidExplainer here="lucid" />
				{freshDataset && <FreshDatasetSection data={freshDataset} />}
				<p className="mt-4 text-white/60">
					The historical LUCID run summary has not been written yet.
				</p>
			</main>
		);
	}

	const requested = summary.total_requested_samples ?? 0;
	const succeeded = summary.total_succeeded_samples ?? 0;
	const failed = summary.total_failed_samples ?? 0;
	const uniquePosts = summary.unique_selected_post_ids?.length ?? 0;
	const artifact = summary.source?.angle_artifact;
	const namespace = artifact?.artifact_namespace ?? "";
	const isTangentsDbV1 =
		artifact?.lucid_tangents_db?.artifact_namespace === TANGENTS_DB_V1_NS ||
		namespace === TANGENTS_DB_V1_NS;
	const failureTotals = progress?.failure_totals ?? failureAgg.codes;

	return (
		<main className="mx-auto max-w-6xl space-y-6 p-8 text-white">
			<header className="space-y-2">
				<p className="font-medium text-emerald-300 text-sm uppercase tracking-wide">
					Project LUCID
				</p>
				<h1 className="font-bold text-3xl">LUCID results</h1>
				<p className="text-sm text-white/60">
					Live clean-data preparation, validation tests, generated samples, and
					the historical 500-attempt evaluation.
				</p>
			</header>

			<LucidExplainer here="lucid" />

			{freshDataset && <FreshDatasetSection data={freshDataset} />}

			<section className="space-y-1 border-white/10 border-t pt-6">
				<p className="font-medium text-white/40 text-xs uppercase tracking-[0.18em]">
					Historical evaluation
				</p>
				<h2 className="font-semibold text-2xl">
					{isTangentsDbV1
						? "TangentsDB-v1 evaluation"
						: "Context-weighted angle run"}
				</h2>
				<p className="text-sm text-white/55">
					{isTangentsDbV1
						? "Frozen Project LUCID TangentsDB codebook evaluation."
						: "Balanced 500-attempt evaluation using cached researched posts and the context-weighted angle sampler."}
				</p>
			</section>

			{!isTangentsDbV1 && (
				<section className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-amber-100 text-sm">
					<strong className="font-semibold">
						Sampler baseline, not TangentsDB-v1.
					</strong>{" "}
					Artifact namespace is{" "}
					<code className="text-amber-50">{namespace || "unknown"}</code>, not{" "}
					<code className="text-amber-50">{TANGENTS_DB_V1_NS}</code>. Do not
					cite this run as a TangentsDB codebook result or pair it with ZLG as a
					publication claim.
				</section>
			)}

			<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Metric label="Requested" value={String(requested)} />
				<Metric label="Succeeded" tone="success" value={String(succeeded)} />
				<Metric label="Failed" tone="failure" value={String(failed)} />
				<Metric
					label="Success rate"
					value={formatPercent(succeeded, requested)}
				/>
			</section>

			<section className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
					<h2 className="font-semibold text-lg">Failure codes</h2>
					<ul className="mt-4 space-y-2 text-white/75">
						{Object.entries(failureTotals)
							.filter(([, count]) => (count ?? 0) > 0)
							.sort((a, b) => Number(b[1]) - Number(a[1]))
							.map(([code, count]) => (
								<li className="flex justify-between gap-3" key={code}>
									<span className="break-all">{code}</span>
									<span className="font-medium text-white">
										{String(count)}
									</span>
								</li>
							))}
						{Object.values(failureTotals).every((n) => !n) && (
							<li className="text-white/45">No failure totals recorded.</li>
						)}
					</ul>
				</section>

				<section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
					<h2 className="font-semibold text-lg">Candidate failure taxonomy</h2>
					<p className="mt-1 text-white/45">
						Aggregated across {failureAgg.failuresScanned} failure artifacts
						(candidate-level counts).
					</p>
					<ul className="mt-4 space-y-2 text-white/75">
						{(
							Object.entries(failureAgg.taxonomy) as [
								keyof TaxonomyCounts,
								number,
							][]
						).map(([key, count]) => (
							<li className="flex justify-between gap-3" key={key}>
								<span>{key}</span>
								<span className="font-medium text-white">{String(count)}</span>
							</li>
						))}
					</ul>
				</section>
			</section>

			<section className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm">
				<h2 className="font-semibold text-lg">Run provenance</h2>
				<dl className="mt-4 grid gap-3 text-white/70 sm:grid-cols-2">
					<Detail label="Run ID" value={summary.run_id ?? "—"} />
					<Detail label="Created" value={summary.created_at_utc ?? "—"} />
					<Detail label="Unique source posts" value={String(uniquePosts)} />
					<Detail label="Progress status" value={progress?.status ?? "—"} />
					<Detail label="Git commit" value={progress?.git_commit || "—"} />
					<Detail label="Git branch" value={progress?.git_branch || "—"} />
					<Detail
						label="Git clean"
						value={
							progress?.git_status_clean == null
								? "—"
								: progress.git_status_clean
									? "yes"
									: "no"
						}
					/>
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
