import { execFile } from "node:child_process";
import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getResultSources } from "~/server/paths";

const execFileAsync = promisify(execFile);
const sideWingRepoDir = resolve(process.cwd(), "..", "stego-side-wing");
const e2eRunsDir = join(sideWingRepoDir, "metrics", "e2e_runs");
const latestWorkloadSummaryPath = join(
	e2eRunsDir,
	"latest_actual_workload_e2e.json",
);

type FailureClass = "infrastructure" | "generation" | "decode" | "other";

interface WorkloadSummary {
	run_id?: string;
	created_at_utc?: string;
	run_dir?: string;
	profiles?: string[];
	variants?: string[];
	samples_per_profile?: number;
	total_requested_samples?: number;
	total_succeeded_samples?: number;
	total_failed_samples?: number;
	unique_selected_post_ids?: string[];
	force_model_generation?: boolean;
	profile_summaries?: WorkloadProfileSummary[];
}

interface WorkloadProfileSummary {
	profile?: string;
	variant?: string;
	variant_description?: string;
	requested_samples?: number;
	samples_succeeded?: number;
	samples_failed?: number;
	has_encoding_secret?: boolean;
	settings?: Record<string, unknown>;
	failures?: WorkloadFailure[];
	summary_metrics?: {
		quality_metrics?: {
			matched_post_kl?: number;
			matched_post_jsd?: number;
			global_corpus_kl?: number;
			global_corpus_jsd?: number;
			perplexity?: number;
			receiver_success_rate?: number;
		};
		carrier_metrics?: {
			hidden_expansion_ratio?: number;
			standard_fallback_rate?: number;
			bps_total?: number;
		};
		selection_metrics?: {
			unique_selection_signatures?: number;
		};
	};
	metrics_report?: {
		primary_baseline_matched_post?: {
			average_kl_stego_vs_matched_post?: number;
			average_jsd_stego_vs_matched_post?: number;
		};
		secondary_baseline_global_corpus?: {
			average_kl_stego_vs_global_corpus?: number;
			average_jsd_stego_vs_global_corpus?: number;
		};
	};
	perplexity_report?: {
		perplexity_summary?: {
			average_perplexity?: number;
		};
	};
}

interface WorkloadFailure {
	error?: string;
	post_id?: string;
	sample_index?: number;
}

interface SummaryCandidate {
	path: string;
	mtimeMs: number;
	summary: WorkloadSummary;
}

function round(value: number | undefined | null, decimals = 4) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return Number(value.toFixed(decimals));
}

async function readJson<T>(filePath: string) {
	const content = await readFile(filePath, "utf-8");
	return JSON.parse(content) as T;
}

async function getGitValue(args: string[]) {
	try {
		const { stdout } = await execFileAsync("git", [
			"-C",
			sideWingRepoDir,
			...args,
		]);
		return stdout.trim() || null;
	} catch {
		return null;
	}
}

async function getGitProvenance() {
	const [branch, commit, status] = await Promise.all([
		getGitValue(["branch", "--show-current"]),
		getGitValue(["rev-parse", "--short", "HEAD"]),
		getGitValue(["status", "--porcelain"]),
	]);

	return {
		branch: branch ?? "unknown",
		commit: commit ?? "unknown",
		isDirty: Boolean(status),
	};
}

function classifyFailure(error: string | undefined): FailureClass {
	const lower = (error ?? "").toLowerCase();
	if (
		lower.includes("404") ||
		lower.includes("client error") ||
		lower.includes("timeout") ||
		lower.includes("auth") ||
		lower.includes("ngrok") ||
		lower.includes("5xx")
	) {
		return "infrastructure";
	}
	if (
		lower.includes("valid json") ||
		lower.includes("non-empty strings") ||
		lower.includes("llm output") ||
		lower.includes("generation")
	) {
		return "generation";
	}
	if (lower.includes("decode") || lower.includes("decoding validation")) {
		return "decode";
	}
	return "other";
}

function getFailureCounts(failures: WorkloadFailure[] | undefined) {
	const counts: Record<FailureClass, number> = {
		infrastructure: 0,
		generation: 0,
		decode: 0,
		other: 0,
	};
	const examples: Partial<Record<FailureClass, string>> = {};

	for (const failure of failures ?? []) {
		const failureClass = classifyFailure(failure.error);
		counts[failureClass] += 1;
		examples[failureClass] ??= failure.error;
	}

	return { counts, examples };
}

function getQualityMetric(
	profile: WorkloadProfileSummary,
	key: "matched" | "global",
) {
	if (key === "matched") {
		return (
			profile.summary_metrics?.quality_metrics?.matched_post_kl ??
			profile.metrics_report?.primary_baseline_matched_post
				?.average_kl_stego_vs_matched_post
		);
	}
	return (
		profile.summary_metrics?.quality_metrics?.global_corpus_kl ??
		profile.metrics_report?.secondary_baseline_global_corpus
			?.average_kl_stego_vs_global_corpus
	);
}

async function findSummaryFiles(root: string, maxDepth: number) {
	const files: string[] = [];

	async function walk(current: string, depth: number) {
		if (depth > maxDepth) return;
		let entries: Dirent[];
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const child = join(current, entry.name);
			if (entry.isFile() && entry.name === "summary.json") {
				files.push(child);
				continue;
			}
			if (entry.isDirectory()) {
				await walk(child, depth + 1);
			}
		}
	}

	await walk(root, 0);
	return files;
}

function isWorkloadSummary(summary: WorkloadSummary) {
	return (
		Array.isArray(summary.profile_summaries) &&
		summary.profile_summaries.length > 0
	);
}

function getSucceededSamples(summary: WorkloadSummary) {
	return (
		summary.total_succeeded_samples ??
		summary.profile_summaries?.reduce(
			(total, profile) => total + (profile.samples_succeeded ?? 0),
			0,
		) ??
		0
	);
}

async function getLatestSummaryCandidate() {
	const summaryFiles = [
		latestWorkloadSummaryPath,
		...(await findSummaryFiles(e2eRunsDir, 2)),
	];
	const candidates = await Promise.all(
		summaryFiles.map(async (path): Promise<SummaryCandidate | null> => {
			try {
				const [summary, fileStat] = await Promise.all([
					readJson<WorkloadSummary>(path),
					stat(path),
				]);
				if (!isWorkloadSummary(summary)) return null;
				return { path, mtimeMs: fileStat.mtimeMs, summary };
			} catch {
				return null;
			}
		}),
	);

	const validCandidates = candidates.filter(
		(candidate): candidate is SummaryCandidate => candidate !== null,
	);
	return (
		validCandidates.sort((a, b) => {
			const aSucceeded = getSucceededSamples(a.summary);
			const bSucceeded = getSucceededSamples(b.summary);
			if (aSucceeded > 0 && bSucceeded === 0) return -1;
			if (aSucceeded === 0 && bSucceeded > 0) return 1;
			return b.mtimeMs - a.mtimeMs;
		})[0] ?? null
	);
}

export const showcaseRouter = createTRPCRouter({
	getCodexShowcase: publicProcedure.query(async () => {
		const [summaryCandidate, git, sources] = await Promise.all([
			getLatestSummaryCandidate(),
			getGitProvenance(),
			getResultSources(),
		]);

		if (!summaryCandidate) {
			throw new Error(
				"No workload summary found in side-wing metrics/e2e_runs.",
			);
		}

		const summary = summaryCandidate.summary;
		const defaultSource =
			sources.find((source) => source.id === "side-wing") ?? null;
		const latestGeneratedSource =
			sources
				.filter((source) => source.kind === "generated")
				.sort((a, b) => b.mtimeMs - a.mtimeMs)[0] ?? null;

		const variants = (summary.profile_summaries ?? []).map((profile) => {
			const failureBreakdown = getFailureCounts(profile.failures);
			const matchedKl = getQualityMetric(profile, "matched");
			const globalKl = getQualityMetric(profile, "global");
			const succeeded = profile.samples_succeeded ?? 0;
			const requested =
				profile.requested_samples ?? succeeded + (profile.samples_failed ?? 0);
			const failed =
				profile.samples_failed ?? Math.max(0, requested - succeeded);

			return {
				id: profile.variant ?? profile.profile ?? "unknown",
				profile: profile.profile ?? "unknown",
				variant: profile.variant ?? profile.profile ?? "unknown",
				description: profile.variant_description ?? "",
				requested,
				succeeded,
				failed,
				hasEncodingSecret: profile.has_encoding_secret ?? false,
				matchedKl: round(matchedKl),
				matchedJsd: round(
					profile.summary_metrics?.quality_metrics?.matched_post_jsd ??
						profile.metrics_report?.primary_baseline_matched_post
							?.average_jsd_stego_vs_matched_post,
				),
				globalKl: round(globalKl),
				globalJsd: round(
					profile.summary_metrics?.quality_metrics?.global_corpus_jsd ??
						profile.metrics_report?.secondary_baseline_global_corpus
							?.average_jsd_stego_vs_global_corpus,
				),
				perplexity: round(
					profile.summary_metrics?.quality_metrics?.perplexity ??
						profile.perplexity_report?.perplexity_summary?.average_perplexity,
				),
				receiverSuccessRate: round(
					profile.summary_metrics?.quality_metrics?.receiver_success_rate,
					3,
				),
				hiddenExpansionRatio: round(
					profile.summary_metrics?.carrier_metrics?.hidden_expansion_ratio,
					3,
				),
				standardFallbackRate: round(
					profile.summary_metrics?.carrier_metrics?.standard_fallback_rate,
					3,
				),
				bpsTotal: round(profile.summary_metrics?.carrier_metrics?.bps_total, 4),
				uniqueSelectionSignatures:
					profile.summary_metrics?.selection_metrics
						?.unique_selection_signatures ?? null,
				failureCounts: failureBreakdown.counts,
				failureExamples: failureBreakdown.examples,
				meetsMinimumReportable: succeeded >= 50,
				meetsRecommended: succeeded >= 100,
				meetsStrongClaim: succeeded >= 200,
			};
		});

		const completeCandidates = variants.filter(
			(variant) =>
				variant.succeeded >= 50 &&
				variant.failed === 0 &&
				variant.receiverSuccessRate === 1 &&
				variant.matchedKl !== null,
		);
		const bestCompleteSecurityCandidate =
			completeCandidates.sort(
				(a, b) => (a.matchedKl ?? Infinity) - (b.matchedKl ?? Infinity),
			)[0] ?? null;
		const bestLanguageMatch =
			variants
				.filter((variant) => variant.matchedKl !== null)
				.sort(
					(a, b) => (a.matchedKl ?? Infinity) - (b.matchedKl ?? Infinity),
				)[0] ?? null;

		return {
			backendRepoDir: sideWingRepoDir,
			backendBranch: git.branch,
			backendCommit: git.commit,
			backendIsDirty: git.isDirty,
			summaryPath: summaryCandidate.path,
			summaryDir: dirname(summaryCandidate.path),
			summaryMtimeMs: summaryCandidate.mtimeMs,
			runId:
				summary.run_id ?? basename(summary.run_dir ?? summaryCandidate.path),
			runDir: summary.run_dir ?? dirname(summaryCandidate.path),
			runDirName: basename(summary.run_dir ?? dirname(summaryCandidate.path)),
			createdAtUtc: summary.created_at_utc ?? null,
			totalRequestedSamples: summary.total_requested_samples ?? 0,
			totalSucceededSamples: summary.total_succeeded_samples ?? 0,
			totalFailedSamples: summary.total_failed_samples ?? 0,
			samplesPerProfile: summary.samples_per_profile ?? 0,
			variantCount: variants.length,
			selectedPostCount: summary.unique_selected_post_ids?.length ?? 0,
			forceModelGeneration: summary.force_model_generation ?? false,
			defaultViewerPath: defaultSource?.path ?? null,
			defaultViewerFileCount: defaultSource?.fileCount ?? 0,
			latestGeneratedPath: latestGeneratedSource?.path ?? null,
			latestGeneratedPathId: latestGeneratedSource?.id ?? null,
			latestGeneratedLabel: latestGeneratedSource?.label ?? null,
			latestGeneratedFileCount: latestGeneratedSource?.fileCount ?? 0,
			pathMismatch:
				Boolean(defaultSource?.path && latestGeneratedSource?.path) &&
				defaultSource?.path !== latestGeneratedSource?.path,
			bestCompleteSecurityCandidate,
			bestLanguageMatch,
			reportableVariantCount: variants.filter(
				(variant) => variant.meetsMinimumReportable,
			).length,
			recommendedVariantCount: variants.filter(
				(variant) => variant.meetsRecommended,
			).length,
			strongClaimVariantCount: variants.filter(
				(variant) => variant.meetsStrongClaim,
			).length,
			variants,
		};
	}),
});
