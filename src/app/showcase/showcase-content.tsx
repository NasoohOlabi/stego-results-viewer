"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

const profileTheme = {
	balanced: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
	robustness: "border-sky-400/30 bg-sky-500/10 text-sky-200",
	capacity: "border-amber-400/30 bg-amber-500/10 text-amber-200",
	security: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200",
} as const;

const preferredSettingOrder = [
	"encoding_profile",
	"capacity_profile",
	"capacity_limits_enabled",
	"angles_generation_mode",
	"stego_generation_mode",
	"payload_transform",
	"stego_prompt_style",
	"stego_sample_angle_count",
	"stego_default_max_retries",
	"stego_llm_temperature",
	"decode_semantic_top_n",
	"decode_llm_max_tries",
	"decode_strict_default",
	"has_encoding_secret",
] as const;

function formatDateUtc(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}).format(new Date(value));
}

function formatMs(value: number) {
	if (value >= 1000) {
		return `${(value / 1000).toFixed(1)}s`;
	}
	return `${value}ms`;
}

function formatRatio(value: number) {
	return `${(value * 100).toFixed(1)}%`;
}

function formatSettingLabel(key: string) {
	return key.replaceAll("_", " ");
}

function formatSettingValue(value: unknown) {
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		return String(value);
	}
	if (typeof value === "string") {
		return value;
	}
	return JSON.stringify(value);
}

function trimText(value: string, maxLength = 120) {
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength - 3)}...`;
}

function getProfileTheme(profile: string) {
	return profileTheme[profile as keyof typeof profileTheme] ??
		"border-white/15 bg-white/10 text-white";
}

function sortSettingsEntries(settings: Record<string, unknown>) {
	const order = new Map(preferredSettingOrder.map((key, index) => [key, index]));
	return Object.entries(settings).sort((a, b) => {
		const left = order.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
		const right = order.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
		if (left !== right) {
			return left - right;
		}
		return a[0].localeCompare(b[0]);
	});
}

export function ShowcaseContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((path) => path.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [enabledPaths, isValidPath, pathname, router, searchParams]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);
	const showcaseQuery = api.showcase.getCodexShowcase.useQuery();
	const [profileFilter, setProfileFilter] = useState<string>("all");

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const fastestAverageProfile = useMemo(() => {
		if (!showcaseQuery.data || showcaseQuery.data.profiles.length === 0) {
			return null;
		}
		return showcaseQuery.data.profiles.reduce((best, profile) =>
			profile.avgElapsedMs < best.avgElapsedMs ? profile : best,
		);
	}, [showcaseQuery.data]);

	const zeroRetryProfile = useMemo(() => {
		return showcaseQuery.data?.profiles.find((profile) => profile.samplesWithRetries === 0) ?? null;
	}, [showcaseQuery.data]);

	const visibleSamples = useMemo(() => {
		if (!showcaseQuery.data) {
			return [];
		}
		if (profileFilter === "all") {
			return showcaseQuery.data.samples;
		}
		return showcaseQuery.data.samples.filter((sample) => sample.profile === profileFilter);
	}, [profileFilter, showcaseQuery.data]);

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={handleFileSelect}
					onPathSelect={handlePathSelect}
					selectedFile={null}
					selectedPathId={selectedPathId}
				/>
			</div>
			<div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_26%),radial-gradient(circle_at_20%_20%,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,_rgba(9,9,11,1),_rgba(9,9,11,0.96))] p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					<header className="space-y-4">
						<div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 uppercase tracking-[0.24em]">
							Codex Showcase
						</div>
						<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
							<div className="space-y-2">
								<h1 className="font-semibold text-4xl tracking-tight">
									New branch work, tuning, and the latest 52 samples
								</h1>
								<p className="max-w-3xl text-sm text-white/65">
									This page reads the latest actual workload run from the sibling{" "}
									<code className="rounded bg-white/10 px-1.5 py-0.5 text-white">
										stego-side-wing
									</code>{" "}
									repo and turns it into a branch-level summary: KLD wins, profile
									tradeoffs, and every generated sample.
								</p>
							</div>
							{showcaseQuery.data ? (
								<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
									<div className="font-medium text-white">
										{showcaseQuery.data.backendBranch}
									</div>
									<div>Backend branch</div>
									<div className="mt-2 text-xs text-white/45">
										Run {showcaseQuery.data.runDirName}
									</div>
								</div>
							) : null}
						</div>
					</header>

					{showcaseQuery.isLoading ? (
						<div className="flex h-72 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
							<p className="text-white/50">Loading latest workload showcase...</p>
						</div>
					) : showcaseQuery.error || !showcaseQuery.data ? (
						<div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
							Unable to load the showcase data from the side-wing repo.
						</div>
					) : (
						<>
							<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
									<div className="text-xs text-white/45 uppercase tracking-[0.22em]">
										Run health
									</div>
									<div className="mt-3 font-semibold text-4xl">
										{showcaseQuery.data.totalSucceededSamples}/
										{showcaseQuery.data.totalRequestedSamples}
									</div>
									<p className="mt-2 text-sm text-white/60">
										Samples finished with receiver decode enabled and{" "}
										{showcaseQuery.data.totalFailedSamples} failures.
									</p>
								</div>
								<div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
									<div className="text-xs text-emerald-100/70 uppercase tracking-[0.22em]">
										Lowest matched KLD
									</div>
									<div className="mt-3 font-semibold text-3xl text-white">
										{showcaseQuery.data.lowestMatchedProfile.profile}
									</div>
									<p className="mt-2 text-sm text-emerald-50/75">
										KLD {showcaseQuery.data.lowestMatchedProfile.value.toFixed(4)} against
										the paired original posts.
									</p>
								</div>
								<div className="rounded-3xl border border-sky-400/20 bg-sky-500/10 p-5">
									<div className="text-xs text-sky-100/70 uppercase tracking-[0.22em]">
										Lowest global KLD
									</div>
									<div className="mt-3 font-semibold text-3xl text-white">
										{showcaseQuery.data.lowestGlobalProfile.profile}
									</div>
									<p className="mt-2 text-sm text-sky-50/75">
										KLD {showcaseQuery.data.lowestGlobalProfile.value.toFixed(4)} against
										the full source corpus.
									</p>
								</div>
								<div className="rounded-3xl border border-white/10 bg-white/5 p-5">
									<div className="text-xs text-white/45 uppercase tracking-[0.22em]">
										Tuning envelope
									</div>
									<div className="mt-3 font-semibold text-3xl">
										{showcaseQuery.data.profilesRequested.length} x{" "}
										{showcaseQuery.data.samplesPerProfile}
									</div>
									<p className="mt-2 text-sm text-white/60">
										Profiles over {showcaseQuery.data.selectedPostCount} real posts.{" "}
										{showcaseQuery.data.forceModelGeneration
											? "Generation stayed model-backed."
											: "Profile defaults were used."}
									</p>
								</div>
							</section>

							<section className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
								<div className="rounded-3xl border border-white/10 bg-black/20 p-6">
									<div className="text-xs text-white/45 uppercase tracking-[0.22em]">
										What stands out
									</div>
									<div className="mt-4 grid gap-3 md:grid-cols-2">
										<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
											<div className="font-medium text-white">Balanced won the closest-match test</div>
											<p className="mt-2 text-sm text-white/62">
												It delivered the lowest KLD against the matched source post while
												keeping the prompt style natural.
											</p>
										</div>
										<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
											<div className="font-medium text-white">Security won the broader-distribution test</div>
											<p className="mt-2 text-sm text-white/62">
												It had the best KLD against the global corpus, but every sample paid
												for the secret-backed transform with compression warnings.
											</p>
										</div>
										<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
											<div className="font-medium text-white">Capacity moved fastest on average</div>
											<p className="mt-2 text-sm text-white/62">
												{fastestAverageProfile
													? `${fastestAverageProfile.profile} averaged ${formatMs(fastestAverageProfile.avgElapsedMs)} per sample.`
													: "Average timing is not available."}
											</p>
										</div>
										<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
											<div className="font-medium text-white">Robustness stayed steady</div>
											<p className="mt-2 text-sm text-white/62">
												{zeroRetryProfile
													? `${zeroRetryProfile.profile} cleared all 13 samples without a single retry.`
													: "No zero-retry profile was detected."}
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-3xl border border-white/10 bg-black/20 p-6">
									<div className="text-xs text-white/45 uppercase tracking-[0.22em]">
										Run configuration
									</div>
									<div className="mt-4 space-y-3 text-sm text-white/68">
										<div className="flex items-center justify-between gap-4 border-white/10 border-b pb-3">
											<span>Created (UTC)</span>
											<span className="text-right text-white">
												{formatDateUtc(showcaseQuery.data.createdAtUtc)}
											</span>
										</div>
										<div className="flex items-center justify-between gap-4 border-white/10 border-b pb-3">
											<span>Max model retries</span>
											<span className="text-white">{showcaseQuery.data.maxRetries}</span>
										</div>
										<div className="flex items-center justify-between gap-4 border-white/10 border-b pb-3">
											<span>Transient retries</span>
											<span className="text-white">
												{showcaseQuery.data.maxTransientSampleRetries} x{" "}
												{showcaseQuery.data.transientRetryBaseDelaySeconds}s base delay
											</span>
										</div>
										<div className="space-y-2 pt-1">
											<div className="text-white/50">Selected source posts</div>
											<div className="flex flex-wrap gap-2">
												{showcaseQuery.data.selectedPostIds.map((postId) => (
													<span
														key={postId}
														className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80"
													>
														{postId}
													</span>
												))}
											</div>
										</div>
									</div>
								</div>
							</section>

							<section className="space-y-4">
								<div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
									<div>
										<h2 className="font-semibold text-2xl">Profile tuning</h2>
										<p className="text-sm text-white/55">
											Each profile below shows the configuration that produced its 13
											latest samples plus the observed runtime and divergence behavior.
										</p>
									</div>
									<div className="text-sm text-white/45">
										{showcaseQuery.data.backendRepoDir}
									</div>
								</div>
								<div className="grid gap-4 xl:grid-cols-2">
									{showcaseQuery.data.profiles.map((profile, index) => (
										<div
											key={`${profile.profile}-${index}`}
											className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
										>
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div>
													<div
														className={`inline-flex rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.22em] ${getProfileTheme(profile.profile)}`}
													>
														{profile.profile}
													</div>
													<h3 className="mt-3 font-semibold text-2xl text-white">
														{profile.profile}
													</h3>
												</div>
												<div className="text-right text-sm text-white/55">
													<div>{profile.samplesSucceeded} succeeded</div>
													<div>{profile.samplesFailed} failed</div>
												</div>
											</div>
											<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
												<div className="rounded-2xl border border-white/10 bg-black/20 p-3">
													<div className="text-xs text-white/45 uppercase">Matched KLD</div>
													<div className="mt-2 font-semibold text-xl">
														{profile.matchedKl.toFixed(4)}
													</div>
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 p-3">
													<div className="text-xs text-white/45 uppercase">Global KLD</div>
													<div className="mt-2 font-semibold text-xl">
														{profile.globalKl.toFixed(4)}
													</div>
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 p-3">
													<div className="text-xs text-white/45 uppercase">Avg time</div>
													<div className="mt-2 font-semibold text-xl">
														{formatMs(profile.avgElapsedMs)}
													</div>
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 p-3">
													<div className="text-xs text-white/45 uppercase">Avg ratio</div>
													<div className="mt-2 font-semibold text-xl">
														{formatRatio(profile.avgCompressionRatio)}
													</div>
												</div>
											</div>
											<div className="mt-4 grid gap-2 sm:grid-cols-3">
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
													{profile.avgEmbeddedBits.toFixed(1)} avg embedded bits
												</div>
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
													{profile.samplesWithRetries} samples needed retries
												</div>
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
													{profile.semanticDisagreements} semantic mismatches recovered
												</div>
											</div>
											<div className="mt-5 grid gap-x-4 gap-y-2 sm:grid-cols-2">
												{sortSettingsEntries(profile.settings).map(([key, value]) => (
													<div
														key={key}
														className="flex items-start justify-between gap-3 border-white/10 border-b py-2 text-sm"
													>
														<span className="text-white/45">{formatSettingLabel(key)}</span>
														<span className="max-w-[58%] text-right text-white/85">
															{formatSettingValue(value)}
														</span>
													</div>
												))}
												<div className="flex items-start justify-between gap-3 border-white/10 border-b py-2 text-sm">
													<span className="text-white/45">samples with warnings</span>
													<span className="text-right text-white/85">
														{profile.samplesWithWarnings}
													</span>
												</div>
												<div className="flex items-start justify-between gap-3 border-white/10 border-b py-2 text-sm">
													<span className="text-white/45">has encoding secret</span>
													<span className="text-right text-white/85">
														{profile.hasEncodingSecret ? "true" : "false"}
													</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</section>

							<section className="space-y-4">
								<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
									<div>
										<h2 className="font-semibold text-2xl">Latest 52 generated samples</h2>
										<p className="text-sm text-white/55">
											Each card shows why the sample matters, which angle it encoded,
											and the small metrics that help explain it.
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => setProfileFilter("all")}
											className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
												profileFilter === "all"
													? "border-white/20 bg-white/[0.12] text-white"
													: "border-white/10 bg-white/5 text-white/55 hover:text-white"
											}`}
										>
											All ({showcaseQuery.data.samples.length})
										</button>
										{showcaseQuery.data.profiles.map((profile, index) => (
											<button
												key={`${profile.profile}-${index}`}
												type="button"
												onClick={() => setProfileFilter(profile.profile)}
												className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
													profileFilter === profile.profile
														? getProfileTheme(profile.profile)
														: "border-white/10 bg-white/5 text-white/55 hover:text-white"
												}`}
											>
												{profile.profile}
											</button>
										))}
									</div>
								</div>
								<div className="grid gap-4 xl:grid-cols-2">
									{visibleSamples.map((sample) => (
										<div
											key={sample.id}
											className="rounded-3xl border border-white/10 bg-black/20 p-5"
										>
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div className="flex items-center gap-2">
													<div
														className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] ${getProfileTheme(sample.profile)}`}
													>
														{sample.profile}
													</div>
													<div className="text-sm text-white/45">
														{sample.postId} #{sample.sampleIndex + 1}
													</div>
												</div>
												<div className="text-xs text-white/35">
													{sample.outputFileName}
												</div>
											</div>
											<h3 className="mt-4 font-medium text-xl text-white">
												{sample.significance}
											</h3>
											<div className="mt-3 flex flex-wrap gap-2">
												{sample.tags.map((tag) => (
													<span
														key={tag}
														className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/72"
													>
														{tag}
													</span>
												))}
											</div>
											<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/72">
													KLD {sample.profileMatchedKl.toFixed(4)}
												</div>
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/72">
													{sample.totalBitsEmbedded} embedded bits
												</div>
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/72">
													{formatMs(sample.elapsedMs)}
												</div>
												<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/72">
													ratio {formatRatio(sample.compressionRatio)}
												</div>
											</div>
											<div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
												<div className="space-y-2">
													<div className="text-xs text-white/45 uppercase tracking-[0.2em]">
														Stego preview
													</div>
													<p className="text-sm leading-6 text-white/78">
														{sample.preview}
													</p>
												</div>
												<div className="space-y-2">
													<div className="text-xs text-white/45 uppercase tracking-[0.2em]">
														Angle significance
													</div>
													<div className="rounded-2xl border border-white/10 bg-white/5 p-3">
														<div className="font-medium text-white">
															{sample.angleCategory}
															{typeof sample.angleIndex === "number"
																? ` #${sample.angleIndex}`
																: ""}
														</div>
														<p className="mt-2 text-sm text-white/68">
															{trimText(sample.angleTangent || sample.angleSourceQuote)}
														</p>
													</div>
												</div>
											</div>
											<div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
												<div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62">
													payload {sample.payloadBytes}B
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62">
													embedded {sample.embeddedPayloadBytes}B
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62">
													comment bits {sample.commentBitsCount}
												</div>
												<div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62">
													angle bits {sample.angleBitsCount}
												</div>
											</div>
											{sample.warnings.length > 0 ? (
												<div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100/85">
													{sample.warnings[0]}
												</div>
											) : null}
										</div>
									))}
								</div>
							</section>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
