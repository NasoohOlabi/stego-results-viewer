import { execFile } from "child_process";
import { readFile } from "fs/promises";
import { basename, join, resolve } from "path";
import { promisify } from "util";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const execFileAsync = promisify(execFile);
const sideWingRepoDir = resolve(process.cwd(), "..", "stego-side-wing");
const latestWorkloadSummaryPath = join(
	sideWingRepoDir,
	"metrics",
	"e2e_runs",
	"latest_actual_workload_e2e.json",
);

interface LatestWorkloadSummary {
	run_id: string;
	created_at_utc: string;
	run_dir: string;
	profiles: string[];
	samples_per_profile: number;
	total_requested_samples: number;
	total_succeeded_samples: number;
	total_failed_samples: number;
	unique_selected_post_ids?: string[];
	force_model_generation?: boolean;
	max_retries?: number;
	max_transient_sample_retries?: number;
	transient_sample_retry_base_delay_seconds?: number;
	profile_summaries: WorkloadProfileSummary[];
}

interface WorkloadProfileSummary {
	profile: string;
	settings: Record<string, unknown>;
	has_encoding_secret: boolean;
	samples_succeeded: number;
	samples_failed: number;
	entries: WorkloadSampleEntry[];
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
}

interface WorkloadSampleEntry {
	post_id: string;
	sample_index: number;
	payload_bytes: number;
	output_file: string;
	elapsed_ms: number;
	retry_count?: number;
	transient_retry_count?: number;
	receiver_decode?: {
		decoded_angle_index?: number;
		semantic_decoded_angle_index?: number;
		recovery_meta?: {
			payload_bytes?: number;
			embedded_payload_bytes?: number;
		};
	};
}

interface OutputArtifactEntry {
	stegoText?: string;
	embedding?: {
		compression?: {
			ratio?: number;
		};
		commentEmbedding?: {
			bitsCount?: number;
		};
		angleEmbedding?: {
			bitsCount?: number;
			selectedAngle?: {
				category?: string;
				idx?: number;
				source_quote?: string;
				tangent?: string;
			};
		};
		totalBitsEmbedded?: number;
		warnings?: string[];
		senderAudit?: {
			embedded_payload_bytes?: number;
			raw_payload_bytes?: number;
			payload_transform?: string;
		};
	};
}

interface DerivedSample {
	id: string;
	profile: string;
	postId: string;
	sampleIndex: number;
	outputFileName: string;
	profileMatchedKl: number;
	profileGlobalKl: number;
	elapsedMs: number;
	retryCount: number;
	transientRetryCount: number;
	payloadBytes: number;
	embeddedPayloadBytes: number;
	totalBitsEmbedded: number;
	compressionRatio: number;
	stegoTextLength: number;
	commentBitsCount: number;
	angleBitsCount: number;
	angleCategory: string;
	angleIndex: number | null;
	angleTangent: string;
	angleSourceQuote: string;
	warningCount: number;
	warnings: string[];
	decodedAngleIndex: number | null;
	semanticDecodedAngleIndex: number | null;
	hasSemanticDisagreement: boolean;
	preview: string;
	significance: string;
	tags: string[];
}

function average(values: number[]) {
	if (values.length === 0) {
		return 0;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number, decimals = 3) {
	return Number(value.toFixed(decimals));
}

function previewText(value: string | undefined, length = 160) {
	if (!value) {
		return "";
	}
	return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

async function readJson<T>(filePath: string) {
	const content = await readFile(filePath, "utf-8");
	return JSON.parse(content) as T;
}

async function getBranchName(repoDir: string) {
	try {
		const { stdout } = await execFileAsync("git", [
			"-C",
			repoDir,
			"branch",
			"--show-current",
		]);
		const branch = stdout.trim();
		return branch || null;
	} catch {
		return null;
	}
}

function buildSampleSignificance(
	sample: Omit<DerivedSample, "significance" | "tags">,
	context: {
		fastestSampleId: string | null;
		maxEmbeddedBits: number;
		lowestMatchedProfile: string;
		lowestGlobalProfile: string;
	},
) {
	const tags: string[] = [];
	if (sample.id === context.fastestSampleId) {
		tags.push("Fastest sample in the latest run");
	}
	if (sample.totalBitsEmbedded === context.maxEmbeddedBits) {
		tags.push("Hits the top embedded-bit count in this run");
	}
	if (sample.retryCount > 0) {
		tags.push(
			`Recovered after ${sample.retryCount} model ${sample.retryCount === 1 ? "retry" : "retries"}`,
		);
	}
	if (sample.transientRetryCount > 0) {
		tags.push(
			`Recovered after ${sample.transientRetryCount} transient ${sample.transientRetryCount === 1 ? "retry" : "retries"}`,
		);
	}
	if (sample.hasSemanticDisagreement) {
		tags.push("Exact decode held even when semantic ranking pointed elsewhere");
	}
	if (sample.warningCount > 0) {
		tags.push("Security overhead displaced compression on this sample");
	}
	if (sample.profile === context.lowestMatchedProfile) {
		tags.push("Part of the lowest matched-post KL profile");
	}
	if (sample.profile === context.lowestGlobalProfile) {
		tags.push("Part of the lowest global-corpus KL profile");
	}
	if (tags.length === 0) {
		tags.push("Clean encode/decode with no warnings");
	}

	return {
		significance: tags[0],
		tags: tags.slice(0, 3),
	};
}

export const showcaseRouter = createTRPCRouter({
	getCodexShowcase: publicProcedure.query(async () => {
		const [summary, backendBranch] = await Promise.all([
			readJson<LatestWorkloadSummary>(latestWorkloadSummaryPath),
			getBranchName(sideWingRepoDir),
		]);

		const profileMetrics = new Map(
			summary.profile_summaries.map((profile) => [
				profile.profile,
				{
					matchedKl:
						profile.metrics_report?.primary_baseline_matched_post
							?.average_kl_stego_vs_matched_post ?? 0,
					globalKl:
						profile.metrics_report?.secondary_baseline_global_corpus
							?.average_kl_stego_vs_global_corpus ?? 0,
					matchedJsd:
						profile.metrics_report?.primary_baseline_matched_post
							?.average_jsd_stego_vs_matched_post ?? 0,
					globalJsd:
						profile.metrics_report?.secondary_baseline_global_corpus
							?.average_jsd_stego_vs_global_corpus ?? 0,
				},
			]),
		);

		const rawSamples = await Promise.all(
			summary.profile_summaries.flatMap((profile) =>
				profile.entries.map(async (entry) => {
					const metrics = profileMetrics.get(profile.profile);
					const artifact = await readJson<OutputArtifactEntry[]>(entry.output_file);
					const output = artifact[0] ?? {};
					const compressionRatio = output.embedding?.compression?.ratio ?? 0;
					const warnings = output.embedding?.warnings ?? [];
					const decodedAngleIndex = entry.receiver_decode?.decoded_angle_index ?? null;
					const semanticDecodedAngleIndex =
						entry.receiver_decode?.semantic_decoded_angle_index ?? null;

					return {
						id: `${profile.profile}-${entry.sample_index.toString().padStart(4, "0")}`,
						profile: profile.profile,
						postId: entry.post_id,
						sampleIndex: entry.sample_index,
						outputFileName: basename(entry.output_file),
						profileMatchedKl: metrics?.matchedKl ?? 0,
						profileGlobalKl: metrics?.globalKl ?? 0,
						elapsedMs: entry.elapsed_ms,
						retryCount: entry.retry_count ?? 0,
						transientRetryCount: entry.transient_retry_count ?? 0,
						payloadBytes: entry.payload_bytes,
						embeddedPayloadBytes:
							output.embedding?.senderAudit?.embedded_payload_bytes ??
							entry.receiver_decode?.recovery_meta?.embedded_payload_bytes ??
							entry.payload_bytes,
						totalBitsEmbedded: output.embedding?.totalBitsEmbedded ?? 0,
						compressionRatio,
						stegoTextLength: output.stegoText?.length ?? 0,
						commentBitsCount: output.embedding?.commentEmbedding?.bitsCount ?? 0,
						angleBitsCount: output.embedding?.angleEmbedding?.bitsCount ?? 0,
						angleCategory:
							output.embedding?.angleEmbedding?.selectedAngle?.category ??
							"Uncategorised",
						angleIndex:
							output.embedding?.angleEmbedding?.selectedAngle?.idx ?? null,
						angleTangent:
							output.embedding?.angleEmbedding?.selectedAngle?.tangent ?? "",
						angleSourceQuote:
							output.embedding?.angleEmbedding?.selectedAngle?.source_quote ?? "",
						warningCount: warnings.length,
						warnings,
						decodedAngleIndex,
						semanticDecodedAngleIndex,
						hasSemanticDisagreement:
							typeof decodedAngleIndex === "number" &&
							typeof semanticDecodedAngleIndex === "number" &&
							decodedAngleIndex !== semanticDecodedAngleIndex,
						preview: previewText(output.stegoText),
					};
				}),
			),
		);

		const fastestSample =
			rawSamples.length > 0
				? rawSamples.reduce((currentFastest, sample) =>
						sample.elapsedMs < currentFastest.elapsedMs ? sample : currentFastest,
					)
				: null;
		const maxEmbeddedBits = rawSamples.reduce(
			(highest, sample) => Math.max(highest, sample.totalBitsEmbedded),
			0,
		);
		const lowestMatchedProfile =
			[...profileMetrics.entries()].sort((a, b) => a[1].matchedKl - b[1].matchedKl)[0]?.[0] ??
			"";
		const lowestGlobalProfile =
			[...profileMetrics.entries()].sort((a, b) => a[1].globalKl - b[1].globalKl)[0]?.[0] ??
			"";

		const samples = rawSamples.map((sample) => {
			const significance = buildSampleSignificance(sample, {
				fastestSampleId: fastestSample?.id ?? null,
				maxEmbeddedBits,
				lowestMatchedProfile,
				lowestGlobalProfile,
			});
			return {
				...sample,
				significance: significance.significance,
				tags: significance.tags,
			};
		});

		const samplesByProfile = new Map<string, DerivedSample[]>();
		for (const sample of samples) {
			const existing = samplesByProfile.get(sample.profile);
			if (existing) {
				existing.push(sample);
				continue;
			}
			samplesByProfile.set(sample.profile, [sample]);
		}

		const profiles = summary.profile_summaries.map((profile) => {
			const profileSamples = samplesByProfile.get(profile.profile) ?? [];
			const metrics = profileMetrics.get(profile.profile);

			return {
				profile: profile.profile,
				matchedKl: round(metrics?.matchedKl ?? 0, 4),
				globalKl: round(metrics?.globalKl ?? 0, 4),
				matchedJsd: round(metrics?.matchedJsd ?? 0, 4),
				globalJsd: round(metrics?.globalJsd ?? 0, 4),
				samplesSucceeded: profile.samples_succeeded,
				samplesFailed: profile.samples_failed,
				hasEncodingSecret: profile.has_encoding_secret,
				settings: profile.settings,
				avgElapsedMs: Math.round(
					average(profileSamples.map((sample) => sample.elapsedMs)),
				),
				avgCompressionRatio: round(
					average(profileSamples.map((sample) => sample.compressionRatio)),
				),
				avgEmbeddedBits: round(
					average(profileSamples.map((sample) => sample.totalBitsEmbedded)),
					1,
				),
				avgStegoTextLength: Math.round(
					average(profileSamples.map((sample) => sample.stegoTextLength)),
				),
				samplesWithWarnings: profileSamples.filter((sample) => sample.warningCount > 0)
					.length,
				samplesWithRetries: profileSamples.filter(
					(sample) =>
						sample.retryCount > 0 || sample.transientRetryCount > 0,
				).length,
				semanticDisagreements: profileSamples.filter(
					(sample) => sample.hasSemanticDisagreement,
				).length,
			};
		});

		const lowestMatched = profiles[0]
			? profiles.reduce((best, profile) =>
					profile.matchedKl < best.matchedKl ? profile : best,
				)
			: null;
		const lowestGlobal = profiles[0]
			? profiles.reduce((best, profile) =>
					profile.globalKl < best.globalKl ? profile : best,
				)
			: null;

		return {
			backendRepoDir: sideWingRepoDir,
			backendBranch: backendBranch ?? "unknown",
			runId: summary.run_id,
			runDirName: basename(summary.run_dir),
			createdAtUtc: summary.created_at_utc,
			totalRequestedSamples: summary.total_requested_samples,
			totalSucceededSamples: summary.total_succeeded_samples,
			totalFailedSamples: summary.total_failed_samples,
			samplesPerProfile: summary.samples_per_profile,
			profilesRequested: summary.profiles,
			selectedPostCount: summary.unique_selected_post_ids?.length ?? 0,
			selectedPostIds: summary.unique_selected_post_ids ?? [],
			forceModelGeneration: summary.force_model_generation ?? false,
			maxRetries: summary.max_retries ?? 0,
			maxTransientSampleRetries: summary.max_transient_sample_retries ?? 0,
			transientRetryBaseDelaySeconds:
				summary.transient_sample_retry_base_delay_seconds ?? 0,
			lowestMatchedProfile: {
				profile: lowestMatched?.profile ?? "",
				value: lowestMatched?.matchedKl ?? 0,
			},
			lowestGlobalProfile: {
				profile: lowestGlobal?.profile ?? "",
				value: lowestGlobal?.globalKl ?? 0,
			},
			profiles,
			samples,
		};
	}),
});
