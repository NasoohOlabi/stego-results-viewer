"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";
import { FileExplorer } from "../_components/file-explorer";
import { DivergenceMetricsRenderer } from "../_components/renderers/divergence-metrics-renderer";
import { PerplexityMetricsRenderer } from "../_components/renderers/perplexity-metrics-renderer";
import { DistributionCharts } from "./_components/distribution-charts";

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
		isValidPath
	]);

	const { data: stats, isLoading } = api.stats.getStats.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath }
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
		{ enabled: isValidPath }
	);

	const { data: divergenceMetrics } =
		api.stats.getDivergenceMetrics.useQuery();
	const { data: perplexityMetrics } =
		api.stats.getPerplexityMetrics.useQuery();

	const selectedLabel =
		enabledPaths.find((p) => p.id === selectedPathId)?.label ??
		selectedPathId;

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					selectedFile={null}
					onFileSelect={handleFileSelect}
					selectedPathId={selectedPathId}
					onPathSelect={handlePathSelect}
				/>
			</div>
			<div className="flex-1 overflow-y-auto p-8">
				<div className="max-w-7xl mx-auto space-y-8">
					<header>
						<h1 className="text-3xl font-bold">Dashboard</h1>
						<p className="text-white/50">
							Overview of steganography results in {selectedLabel}{" "}
							folder.
						</p>
					</header>
					{divergenceMetrics && (
						<div className="pt-8 border-t border-white/10">
							<DivergenceMetricsRenderer data={divergenceMetrics} />
						</div>
					)}
					{perplexityMetrics && (
						<div className="pt-8 border-t border-white/10">
							<PerplexityMetricsRenderer
								data={perplexityMetrics}
								folderId={selectedPathId}
							/>
						</div>
					)}

					<hr />
					{isLoading ? (
						<div className="flex h-64 items-center justify-center">
							<p className="text-white/50">Calculating statistics...</p>
						</div>
					) : stats ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Average Bits per Post
								</h3>
								<div className="text-4xl font-bold text-blue-400">
									{stats.avgBitsPerPost.toFixed(2)}
								</div>
								<p className="text-xs text-white/30">
									Based on {stats.totalPosts} posts across{" "}
									{stats.totalFiles} files.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Average Compression Ratio
								</h3>
								<div className="text-4xl font-bold text-green-400">
									{(stats.avgCompressionRatio * 100).toFixed(1)}%
								</div>
								<p className="text-xs text-white/30">
									Average ratio of compressed payload to original
									payload.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Average Angles per Post
								</h3>
								<div className="text-4xl font-bold text-orange-400">
									{stats.avgAngles.toFixed(1)}
								</div>
								<p className="text-xs text-white/30">
									Number of angle selection points used for embedding.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Avg Comment Chain Length
								</h3>
								<div className="text-4xl font-bold text-pink-400">
									{stats.avgCommentChain.toFixed(1)}
								</div>
								<p className="text-xs text-white/30">
									Average depth of the picked comment chain.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Dictionary Usage
								</h3>
								<div className="text-4xl font-bold text-cyan-400">
									{(stats.dictUsageRate * 100).toFixed(1)}%
								</div>
								<p className="text-xs text-white/30">
									Percentage of posts using dictionary-based
									compression.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Total Bits Embedded
								</h3>
								<div className="text-4xl font-bold text-emerald-400">
									{stats.totalBitsEmbedded.toLocaleString()}
								</div>
								<p className="text-xs text-white/30">
									Sum of all embedded bits across posts.
								</p>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Total Posts Analyzed
								</h3>
								<div className="text-4xl font-bold text-white">
									{stats.totalPosts}
								</div>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-2">
								<h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">
									Total Files
								</h3>
								<div className="text-4xl font-bold text-white">
									{stats.totalFiles}
								</div>
							</div>
						</div>
					) : (
						<div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
							<p className="text-red-400">Error loading statistics.</p>
						</div>
					)}

					<DistributionCharts
						pathId={apiPathId}
						isValidPath={isValidPath}
					/>
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
