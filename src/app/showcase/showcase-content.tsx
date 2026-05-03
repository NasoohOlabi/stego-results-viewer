"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

type FailureClass = "infrastructure" | "generation" | "decode" | "other";

const failureLabels: Record<FailureClass, string> = {
	infrastructure: "Infra",
	generation: "Generation",
	decode: "Decode",
	other: "Other",
};

function formatDate(value: string | null) {
	if (!value) return "unknown";
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	}).format(new Date(value));
}

function formatMetric(value: number | null, decimals = 4) {
	if (value === null) return "n/a";
	return value.toFixed(decimals);
}

function formatPercent(value: number | null) {
	if (value === null) return "n/a";
	return `${(value * 100).toFixed(0)}%`;
}

function getTargetTone(succeeded: number, target: number) {
	if (succeeded >= target)
		return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
	if (succeeded >= target / 2)
		return "border-amber-400/30 bg-amber-500/10 text-amber-100";
	return "border-white/10 bg-white/5 text-white/55";
}

function setFolderParam(pathname: string, folder: string) {
	const params = new URLSearchParams();
	params.set("folder", folder);
	return `${pathname}?${params.toString()}`;
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
			const fallbackPath = enabledPaths[0];
			if (fallbackPath) {
				router.replace(setFolderParam(pathname, fallbackPath.id));
			}
		}
	}, [enabledPaths, isValidPath, pathname, router]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);
	const showcaseQuery = api.showcase.getCodexShowcase.useQuery();

	const handleFileSelect = (filename: string) => {
		const params = new URLSearchParams();
		params.set("filename", filename);
		params.set("folder", selectedPathId);
		router.push(`/?${params.toString()}`);
	};

	const handlePathSelect = (pathId: string) => {
		router.push(setFolderParam(pathname, pathId));
	};

	const openGeneratedPath = () => {
		const pathId = showcaseQuery.data?.latestGeneratedPathId;
		if (!pathId) return;
		router.push(setFolderParam("/", pathId));
	};

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
			<div className="flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					<header className="space-y-4">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<p className="font-medium text-emerald-300/80 text-xs uppercase tracking-[0.22em]">
									Research Showcase
								</p>
								<h1 className="mt-2 font-semibold text-4xl tracking-tight">
									Stego variant evidence and benchmark readiness
								</h1>
								<p className="mt-3 max-w-3xl text-sm text-white/62 leading-6">
									This page summarizes the current side-wing research artifacts:
									reliability, stealth metrics, payload overhead, failure
									causes, and whether the data is strong enough for final
									claims.
								</p>
							</div>
							{showcaseQuery.data ? (
								<div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
									<div className="font-medium text-white">
										{showcaseQuery.data.backendBranch} @{" "}
										{showcaseQuery.data.backendCommit}
									</div>
									<div>
										{showcaseQuery.data.backendIsDirty
											? "dirty backend tree"
											: "clean backend tree"}
									</div>
								</div>
							) : null}
						</div>
					</header>

					{showcaseQuery.isLoading ? (
						<div className="flex h-72 items-center justify-center rounded-lg border border-white/10 bg-white/5">
							<p className="text-white/50">Loading research summary...</p>
						</div>
					) : showcaseQuery.error || !showcaseQuery.data ? (
						<div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-red-100">
							Unable to load side-wing workload summaries.
						</div>
					) : (
						<>
							<section className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-5">
								<div className="font-medium text-amber-100">
									Progress evidence, not final proof
								</div>
								<p className="mt-2 text-amber-50/75 text-sm leading-6">
									The current artifacts show strong decode reliability on
									completed samples, but some real-workload runs are incomplete
									or affected by backend/API failures. Synthetic zero-KLD
									results should stay a regression signal, not the headline
									claim.
								</p>
							</section>

							<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								<div className="rounded-lg border border-white/10 bg-white/5 p-5">
									<div className="text-white/40 text-xs uppercase tracking-[0.18em]">
										Run health
									</div>
									<div className="mt-3 font-semibold text-4xl">
										{showcaseQuery.data.totalSucceededSamples}/
										{showcaseQuery.data.totalRequestedSamples}
									</div>
									<p className="mt-2 text-sm text-white/55">
										Completed samples, with{" "}
										{showcaseQuery.data.totalFailedSamples} failures tracked.
									</p>
								</div>
								<div className="rounded-lg border border-white/10 bg-white/5 p-5">
									<div className="text-white/40 text-xs uppercase tracking-[0.18em]">
										Variants
									</div>
									<div className="mt-3 font-semibold text-4xl">
										{showcaseQuery.data.variantCount}
									</div>
									<p className="mt-2 text-sm text-white/55">
										{showcaseQuery.data.reportableVariantCount} meet the
										50-sample minimum.
									</p>
								</div>
								<div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-5">
									<div className="text-emerald-100/65 text-xs uppercase tracking-[0.18em]">
										Best complete candidate
									</div>
									<div className="mt-3 truncate font-semibold text-2xl">
										{showcaseQuery.data.bestCompleteSecurityCandidate
											?.variant ?? "none"}
									</div>
									<p className="mt-2 text-emerald-50/70 text-sm">
										50+ samples, no failed samples, receiver success at 100%.
									</p>
								</div>
								<div className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-5">
									<div className="text-sky-100/65 text-xs uppercase tracking-[0.18em]">
										Best language match
									</div>
									<div className="mt-3 truncate font-semibold text-2xl">
										{showcaseQuery.data.bestLanguageMatch?.variant ?? "none"}
									</div>
									<p className="mt-2 text-sky-50/70 text-sm">
										Lowest matched-post KLD among scored variants.
									</p>
								</div>
							</section>

							<section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
								<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
									<h2 className="font-semibold text-lg">Latest detected run</h2>
									<div className="mt-4 space-y-3 text-sm">
										<div className="flex justify-between gap-4 border-white/10 border-b pb-2">
											<span className="text-white/45">Run</span>
											<span className="text-right text-white">
												{showcaseQuery.data.runDirName}
											</span>
										</div>
										<div className="flex justify-between gap-4 border-white/10 border-b pb-2">
											<span className="text-white/45">Created UTC</span>
											<span className="text-right text-white">
												{formatDate(showcaseQuery.data.createdAtUtc)}
											</span>
										</div>
										<div className="flex justify-between gap-4 border-white/10 border-b pb-2">
											<span className="text-white/45">Post set</span>
											<span className="text-right text-white">
												{showcaseQuery.data.selectedPostCount} posts
											</span>
										</div>
										<div className="flex justify-between gap-4">
											<span className="text-white/45">Generation</span>
											<span className="text-right text-white">
												{showcaseQuery.data.forceModelGeneration
													? "model-backed"
													: "profile defaults"}
											</span>
										</div>
									</div>
								</div>

								<div
									className={`rounded-lg border p-5 ${
										showcaseQuery.data.pathMismatch
											? "border-amber-400/30 bg-amber-500/10"
											: "border-white/10 bg-white/[0.04]"
									}`}
								>
									<h2 className="font-semibold text-lg">Result source check</h2>
									<div className="mt-4 space-y-3 text-sm">
										<div>
											<div className="text-white/45">Default viewer path</div>
											<div className="mt-1 break-all text-white/75">
												{showcaseQuery.data.defaultViewerPath}
											</div>
											<div className="text-white/35 text-xs">
												{showcaseQuery.data.defaultViewerFileCount} JSON files
											</div>
										</div>
										<div>
											<div className="text-white/45">Latest generated path</div>
											<div className="mt-1 break-all text-white/75">
												{showcaseQuery.data.latestGeneratedPath ??
													"none detected"}
											</div>
											<div className="text-white/35 text-xs">
												{showcaseQuery.data.latestGeneratedFileCount} JSON files
											</div>
										</div>
										{showcaseQuery.data.latestGeneratedPathId ? (
											<button
												className="rounded-md border border-white/15 bg-white/10 px-3 py-2 font-medium text-sm text-white hover:bg-white/15"
												onClick={openGeneratedPath}
												type="button"
											>
												Open generated samples in Explorer
											</button>
										) : null}
									</div>
								</div>
							</section>

							<section className="space-y-4">
								<div>
									<h2 className="font-semibold text-2xl">Variant comparison</h2>
									<p className="mt-1 text-sm text-white/50">
										Lower KLD/JSD is better. Receiver success is computed only
										for completed samples, so failure counts matter.
									</p>
								</div>
								<div className="overflow-x-auto rounded-lg border border-white/10">
									<table className="min-w-full border-collapse text-sm">
										<thead className="bg-white/5 text-left text-white/45 text-xs uppercase tracking-[0.14em]">
											<tr>
												<th className="px-4 py-3">Variant</th>
												<th className="px-4 py-3 text-right">Samples</th>
												<th className="px-4 py-3 text-right">Matched KLD</th>
												<th className="px-4 py-3 text-right">JSD</th>
												<th className="px-4 py-3 text-right">Global KLD</th>
												<th className="px-4 py-3 text-right">PPL</th>
												<th className="px-4 py-3 text-right">Receiver</th>
												<th className="px-4 py-3 text-right">Expansion</th>
												<th className="px-4 py-3 text-right">Unique sigs</th>
											</tr>
										</thead>
										<tbody>
											{showcaseQuery.data.variants.map((variant) => (
												<tr
													className="border-white/10 border-t text-white/75"
													key={variant.id}
												>
													<td className="max-w-[18rem] px-4 py-3">
														<div className="font-medium text-white">
															{variant.variant}
														</div>
														<div className="truncate text-white/40 text-xs">
															{variant.description}
														</div>
													</td>
													<td className="px-4 py-3 text-right">
														{variant.succeeded}/{variant.requested}
													</td>
													<td className="px-4 py-3 text-right">
														{formatMetric(variant.matchedKl)}
													</td>
													<td className="px-4 py-3 text-right">
														{formatMetric(variant.matchedJsd)}
													</td>
													<td className="px-4 py-3 text-right">
														{formatMetric(variant.globalKl)}
													</td>
													<td className="px-4 py-3 text-right">
														{formatMetric(variant.perplexity)}
													</td>
													<td className="px-4 py-3 text-right">
														{formatPercent(variant.receiverSuccessRate)}
													</td>
													<td className="px-4 py-3 text-right">
														{formatMetric(variant.hiddenExpansionRatio, 2)}
													</td>
													<td className="px-4 py-3 text-right">
														{variant.uniqueSelectionSignatures ?? "n/a"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>

							<section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
								<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
									<h2 className="font-semibold text-lg">Failure breakdown</h2>
									<div className="mt-4 space-y-3">
										{showcaseQuery.data.variants.map((variant) => (
											<div
												className="grid gap-2 border-white/10 border-b pb-3 text-sm md:grid-cols-[1fr_auto]"
												key={`${variant.id}-failures`}
											>
												<div>
													<div className="font-medium text-white">
														{variant.variant}
													</div>
													<div className="text-white/40">
														{variant.failed} failed samples
													</div>
												</div>
												<div className="flex flex-wrap gap-2 md:justify-end">
													{(Object.keys(failureLabels) as FailureClass[]).map(
														(key) => (
															<span
																className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/65 text-xs"
																key={key}
															>
																{failureLabels[key]}{" "}
																{variant.failureCounts[key]}
															</span>
														),
													)}
												</div>
											</div>
										))}
									</div>
								</div>

								<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
									<h2 className="font-semibold text-lg">Benchmark readiness</h2>
									<div className="mt-4 space-y-3">
										{showcaseQuery.data.variants.map((variant) => (
											<div key={`${variant.id}-readiness`}>
												<div className="mb-1 flex justify-between gap-3 text-sm">
													<span className="truncate text-white">
														{variant.variant}
													</span>
													<span className="text-white/45">
														{variant.succeeded} successes
													</span>
												</div>
												<div className="flex gap-2">
													{[50, 100, 200].map((target) => (
														<span
															className={`rounded-md border px-2 py-1 text-xs ${getTargetTone(
																variant.succeeded,
																target,
															)}`}
															key={target}
														>
															{target}+
														</span>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							</section>

							<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
								{[
									[
										"KLD",
										"Word-distribution distance from stego text to baseline. Lower is better.",
									],
									[
										"JSD",
										"Symmetric divergence. Lower means the distributions are closer.",
									],
									[
										"Receiver success",
										"Payload recovered on completed samples. Read with failure counts.",
									],
									[
										"Expansion",
										"Hidden carrier bytes divided by original payload bytes. Lower is better.",
									],
									[
										"Selection diversity",
										"Unique carrier signatures. Higher reduces repeated patterns.",
									],
								].map(([term, description]) => (
									<div
										className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
										key={term}
									>
										<div className="font-medium text-white">{term}</div>
										<p className="mt-2 text-white/55 text-xs leading-5">
											{description}
										</p>
									</div>
								))}
							</section>

							<div className="text-sm text-white/40">
								Raw summary:{" "}
								<span className="break-all text-white/60">
									{showcaseQuery.data.summaryPath}
								</span>
								{" . "}
								<Link
									className="text-emerald-300 hover:text-emerald-200"
									href="/"
								>
									Open Explorer
								</Link>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
