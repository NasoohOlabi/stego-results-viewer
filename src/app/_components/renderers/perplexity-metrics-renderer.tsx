"use client";

import { Link2, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ADMIN_API_STORAGE_KEY } from "~/app/admin-api/types";
import {
	deleteMetricsSample,
	normalizeAdminApiBase,
} from "~/app/dashboard/_components/metrics-api-client";
import type { PerplexityMetrics } from "~/schemas/perplexity-metrics";

const TOP_OUTLIERS_COUNT = 5;
const DEFAULT_ADMIN_API_BASE = "http://localhost:5001/api/v1";
const DEFAULT_METRICS_OUTPUT_DIR = "output-results";

function outputBasename(filePath: string): string {
	return filePath.replace(/^.*[/\\]/, "");
}

function readStoredBase(): string {
	try {
		const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
		if (!raw) return DEFAULT_ADMIN_API_BASE;
		const parsed = JSON.parse(raw) as { baseUrl?: string };
		return typeof parsed.baseUrl === "string"
			? parsed.baseUrl
			: DEFAULT_ADMIN_API_BASE;
	} catch {
		return DEFAULT_ADMIN_API_BASE;
	}
}

export function PerplexityMetricsRenderer({
	data,
	folderId = "side-wing",
}: {
	data: PerplexityMetrics;
	/** Matches `folder` query on the home file viewer (`/?filename=…&folder=…`). */
	folderId?: string;
}) {
	const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
	const [deletingFile, setDeletingFile] = useState<string | null>(null);
	const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const topOutliers = useMemo(
		() =>
			data.per_file_perplexity
				.filter((item) => !deletedFiles.includes(item.file))
				.slice()
				.sort((a, b) => b.perplexity - a.perplexity)
				.slice(0, TOP_OUTLIERS_COUNT),
		[data.per_file_perplexity, deletedFiles],
	);

	const handleDeleteOutlier = async (filePath: string) => {
		const filename = outputBasename(filePath);
		const confirmed = window.confirm(
			`Delete ${filename} from ${DEFAULT_METRICS_OUTPUT_DIR} on the API host? Existing saved metrics reports will stay unchanged until you rerun metrics.`,
		);
		if (!confirmed) return;

		setDeletingFile(filePath);
		setDeleteError(null);
		setDeleteMessage(null);

		const base = normalizeAdminApiBase(readStoredBase());
		const res = await deleteMetricsSample(base, {
			filename,
			output_dir: DEFAULT_METRICS_OUTPUT_DIR,
		});

		setDeletingFile(null);
		if (!res.ok) {
			setDeleteError(
				res.httpStatus !== undefined
					? `${res.error} (${res.httpStatus})`
					: res.error,
			);
			return;
		}

		setDeletedFiles((current) =>
			current.includes(filePath) ? current : [...current, filePath],
		);
		setDeleteMessage(
			`Deleted ${filename} on the API host. Rerun metrics to regenerate saved reports without it.`,
		);
	};

	return (
		<div className="space-y-8">
			<header>
				<h2 className="font-bold text-2xl">Fluency Proxy: Perplexity</h2>
				<p className="text-white/50">
					Generated at {new Date(data.created_at_utc).toLocaleString()}
				</p>
			</header>
			<p className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-amber-100 text-sm">
				Perplexity measures predictability to the scoring model, not
				reader-facing naturalness or human authorship. Unusually low perplexity
				can also characterize AI text. For multi-frame embedding, each carrier
				comment is scored separately, and this value is the unweighted average
				of scored frames—not one score for the reconstructed message.
			</p>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						{data.perplexity_summary.median_perplexity !== undefined
							? "Median Perplexity"
							: "Average Perplexity"}
					</h3>
					<div className="font-bold text-4xl text-purple-400">
						{(
							data.perplexity_summary.median_perplexity ??
							data.perplexity_summary.average_perplexity
						).toFixed(2)}
					</div>
					{data.perplexity_summary.median_perplexity !== undefined ? (
						<p className="text-white/30 text-xs">
							Mean {data.perplexity_summary.average_perplexity.toFixed(2)} — the
							per-sample distribution is heavy-tailed, so the median is the
							headline.
						</p>
					) : null}
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Minimum Perplexity
					</h3>
					<div className="font-bold text-4xl text-green-400">
						{data.perplexity_summary.min_perplexity.toFixed(2)}
					</div>
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Maximum Perplexity
					</h3>
					<div className="font-bold text-4xl text-red-400">
						{data.perplexity_summary.max_perplexity.toFixed(2)}
					</div>
				</div>

				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-6">
					<h3 className="font-medium text-sm text-white/50 uppercase tracking-wider">
						Scored Texts
					</h3>
					<div className="font-bold text-4xl text-cyan-400">
						{data.dataset_summary.scored_texts}
					</div>
					<p className="text-white/30 text-xs">
						Out of {data.dataset_summary.total_output_files} output files. A
						multi-frame message contributes one scored text per frame.
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-white/10 bg-white/5 p-6">
				<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<h3 className="font-semibold text-lg">Top Perplexity Outliers</h3>
						<p className="text-white/45 text-xs">
							Delete uses{" "}
							<code className="text-white/70">
								DELETE /tools/metrics/sample
							</code>{" "}
							against the Admin API base from{" "}
							<Link
								className="text-cyan-400/90 underline-offset-2 hover:underline"
								href="/admin-api"
							>
								/admin-api
							</Link>
							.
						</p>
					</div>
					{deleteMessage ? (
						<p className="max-w-md text-green-300/90 text-xs">
							{deleteMessage}
						</p>
					) : null}
				</div>
				{deleteError ? (
					<p className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
						{deleteError}
					</p>
				) : null}
				<div className="space-y-3">
					{topOutliers.map((item) => {
						const basename = outputBasename(item.file);
						const href = `/?filename=${encodeURIComponent(basename)}&folder=${encodeURIComponent(folderId)}`;
						const isDeleting = deletingFile === item.file;
						return (
							<div
								className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3"
								key={item.file}
							>
								<Link
									className="group flex min-w-0 flex-1 items-center gap-2 text-cyan-400/90 text-sm hover:text-cyan-300"
									href={href}
									title="Open in file viewer"
								>
									<span className="truncate group-hover:underline">
										{item.file}
									</span>
									<Link2
										aria-hidden
										className="shrink-0 opacity-70 group-hover:opacity-100"
										size={16}
									/>
								</Link>
								<div className="flex shrink-0 items-center gap-2">
									<p className="font-semibold text-red-300 text-sm">
										{item.perplexity.toFixed(2)}
									</p>
									<button
										className="inline-flex items-center justify-center rounded-md border border-red-400/25 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={isDeleting || deletingFile !== null}
										onClick={() => void handleDeleteOutlier(item.file)}
										title={`Delete ${basename} via API`}
										type="button"
									>
										{isDeleting ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Trash2 className="size-4" />
										)}
									</button>
								</div>
							</div>
						);
					})}
					{topOutliers.length === 0 ? (
						<p className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/50">
							No remaining outliers in this report view.
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
