"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";
import { FileExplorer } from "../_components/file-explorer";
import { DivergenceMetricsRenderer } from "../_components/renderers/divergence-metrics-renderer";
import { PerplexityMetricsRenderer } from "../_components/renderers/perplexity-metrics-renderer";
import { DistributionCharts } from "./_components/distribution-charts";
import { RecalculateMetricsButton } from "./_components/recalculate-metrics-button";

function DashboardContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [
		selectedPathId,
		enabledPaths,
		pathname,
		router,
		searchParams,
		isValidPath,
	]);

	const { data: stats, isLoading } = api.stats.getStats.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const { data: divergenceMetrics } = api.stats.getDivergenceMetrics.useQuery();
	const { data: perplexityMetrics } = api.stats.getPerplexityMetrics.useQuery();

	const selectedLabel =
		enabledPaths.find((p) => p.id === selectedPathId)?.label ?? selectedPathId;

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
					<header>
						<h1 className="font-bold text-3xl">Dashboard</h1>
						<p className="text-white/50">
							Overview of steganography results in {selectedLabel} folder.
						</p>
					</header>
					<div className="space-y-4 border-white/10 border-t pt-8">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<h2 className="font-semibold text-lg text-white/90">
								Perplexity & divergence
							</h2>
							<RecalculateMetricsButton />
						</div>
						{divergenceMetrics && (
							<DivergenceMetricsRenderer data={divergenceMetrics} />
						)}
						{perplexityMetrics && (
							<div className="border-white/10 border-t pt-8">
								<PerplexityMetricsRenderer
									data={perplexityMetrics}
									folderId={selectedPathId}
								/>
							</div>
						)}
					</div>

					<hr />
					{isLoading ? (
						<div className="flex h-64 items-center justify-center">
							<p className="text-white/50">Calculating statistics...</p>
						</div>
					) : stats ? (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Average Bits per Post
								</h3>
								<div className="font-bold text-4xl text-blue-400">
									{stats.avgBitsPerPost.toFixed(2)}
								</div>
								<p className="text-white/30 text-xs">
									Based on {stats.totalPosts} posts across {stats.totalFiles}{" "}
									files.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Average Compression Ratio
								</h3>
								<div className="font-bold text-4xl text-green-400">
									{(stats.avgCompressionRatio * 100).toFixed(1)}%
								</div>
								<p className="text-white/30 text-xs">
									Average ratio of compressed payload to original payload.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Average Angles per Post
								</h3>
								<div className="font-bold text-4xl text-orange-400">
									{stats.avgAngles.toFixed(1)}
								</div>
								<p className="text-white/30 text-xs">
									Number of angle selection points used for embedding.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Avg Comment Chain Length
								</h3>
								<div className="font-bold text-4xl text-pink-400">
									{stats.avgCommentChain.toFixed(1)}
								</div>
								<p className="text-white/30 text-xs">
									Average depth of the picked comment chain.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Dictionary Usage
								</h3>
								<div className="font-bold text-4xl text-cyan-400">
									{(stats.dictUsageRate * 100).toFixed(1)}%
								</div>
								<p className="text-white/30 text-xs">
									Percentage of posts using dictionary-based compression.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Total Bits Embedded
								</h3>
								<div className="font-bold text-4xl text-emerald-400">
									{stats.totalBitsEmbedded.toLocaleString()}
								</div>
								<p className="text-white/30 text-xs">
									Sum of all embedded bits across posts.
								</p>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Total Posts Analyzed
								</h3>
								<div className="font-bold text-4xl text-white">
									{stats.totalPosts}
								</div>
							</div>

							<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
								<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
									Total Files
								</h3>
								<div className="font-bold text-4xl text-white">
									{stats.totalFiles}
								</div>
							</div>
						</div>
					) : (
						<div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
							<p className="text-red-400">Error loading statistics.</p>
						</div>
					)}

					<DistributionCharts isValidPath={isValidPath} pathId={apiPathId} />
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DashboardContent />
		</Suspense>
	);
}
