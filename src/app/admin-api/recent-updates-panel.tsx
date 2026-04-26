"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecentUpdates } from "./fetch-admin-api";
import { ADMIN_API_STORAGE_KEY, type RecentUpdatesData } from "./types";

const numberFormatter = new Intl.NumberFormat();

function formatLocalTimestamp(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(parsed);
}

function parseBaseUrlFromStorage(): string {
	if (typeof window === "undefined") return "http://localhost:5001/api/v1";
	try {
		const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
		if (!raw) return "http://localhost:5001/api/v1";
		const parsed = JSON.parse(raw) as { baseUrl?: unknown };
		return typeof parsed.baseUrl === "string" && parsed.baseUrl
			? parsed.baseUrl
			: "http://localhost:5001/api/v1";
	} catch {
		return "http://localhost:5001/api/v1";
	}
}

export function RecentUpdatesPanel() {
	const [baseUrl, setBaseUrl] = useState(parseBaseUrlFromStorage);
	const [days, setDays] = useState(7);
	const [limit, setLimit] = useState(20);
	const [data, setData] = useState<RecentUpdatesData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshTick, setRefreshTick] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(null);
		void fetchRecentUpdates(baseUrl, {
			days,
			limit,
			signal: controller.signal,
		})
			.then((res) => {
				if (!res.ok) {
					setData(null);
					setError(
						typeof res.error === "string"
							? res.error
							: JSON.stringify(res.error ?? "Request failed"),
					);
					return;
				}
				setData(res.data ?? null);
			})
			.catch((err: unknown) => {
				if (controller.signal.aborted) return;
				setData(null);
				setError(err instanceof Error ? err.message : String(err));
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [baseUrl, days, limit, refreshTick]);

	const authorsLabel = useMemo(
		() => (data?.authors.length ? data.authors.join(", ") : "None"),
		[data?.authors],
	);

	return (
		<div className="space-y-4 text-white">
			<div className="rounded-xl border border-white/10 bg-white/5 p-4">
				<h2 className="font-semibold text-lg">Recent Updates</h2>
				<div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_110px_110px_auto]">
					<label className="text-xs">
						<div className="mb-1 text-white/70">Backend Base URL</div>
						<input
							className="w-full rounded border border-white/15 bg-black/30 px-2 py-2 text-sm"
							onChange={(e) => setBaseUrl(e.target.value)}
							value={baseUrl}
						/>
					</label>
					<label className="text-xs">
						<div className="mb-1 text-white/70">Days (1-90)</div>
						<input
							className="w-full rounded border border-white/15 bg-black/30 px-2 py-2 text-sm"
							max={90}
							min={1}
							onChange={(e) =>
								setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))
							}
							type="number"
							value={days}
						/>
					</label>
					<label className="text-xs">
						<div className="mb-1 text-white/70">Limit (1-100)</div>
						<input
							className="w-full rounded border border-white/15 bg-black/30 px-2 py-2 text-sm"
							max={100}
							min={1}
							onChange={(e) =>
								setLimit(
									Math.max(1, Math.min(100, Number(e.target.value) || 1)),
								)
							}
							type="number"
							value={limit}
						/>
					</label>
					<button
						className="self-end rounded border border-blue-400/30 bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
						onClick={() => setRefreshTick((x) => x + 1)}
						type="button"
					>
						Refresh
					</button>
				</div>
			</div>

			{loading ? (
				<div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
					<div className="h-4 w-48 animate-pulse rounded bg-white/10" />
					<div className="h-4 w-full animate-pulse rounded bg-white/10" />
					<div className="h-4 w-full animate-pulse rounded bg-white/10" />
					<div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
				</div>
			) : null}

			{!loading && error ? (
				<div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">
					<div className="font-medium text-sm">API error</div>
					<div className="mt-1 text-xs">{error}</div>
				</div>
			) : null}

			{!loading && !error && data ? (
				<div className="space-y-4">
					<div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
						<div className="grid gap-2 md:grid-cols-3">
							<div>
								<span className="text-white/60">Commits:</span>{" "}
								{numberFormatter.format(data.count)}
							</div>
							<div>
								<span className="text-white/60">Authors:</span> {authorsLabel}
							</div>
							<div title={data.generated_at_utc}>
								<span className="text-white/60">Generated:</span>{" "}
								{formatLocalTimestamp(data.generated_at_utc)}
							</div>
						</div>
					</div>

					{data.count === 0 ? (
						<div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
							No updates found for this range.
						</div>
					) : (
						<div className="space-y-3">
							{data.commits.map((commit) => (
								<div
									className="rounded-xl border border-white/10 bg-white/5 p-4"
									key={commit.commit}
								>
									<div className="flex flex-wrap items-start justify-between gap-2">
										<div>
											<div className="font-medium text-sm">{commit.subject}</div>
											<div className="mt-1 text-xs text-white/60">
												<span title={commit.committed_at}>
													{formatLocalTimestamp(commit.committed_at)}
												</span>{" "}
												| {commit.author} | {commit.short_commit}
											</div>
										</div>
										<div className="text-right text-xs text-white/80">
											<div>
												+{numberFormatter.format(commit.insertions)} / -
												{numberFormatter.format(commit.deletions)}
											</div>
											<div className="text-white/60">
												Visible {numberFormatter.format(commit.files_changed_visible)} |
												Generated{" "}
												{numberFormatter.format(commit.generated_files_changed)} |
												Total {numberFormatter.format(commit.files_changed_total)}
											</div>
										</div>
									</div>
									{commit.paths.length > 0 ? (
										<div className="mt-3 flex flex-wrap gap-1 text-xs">
											{commit.paths.map((path) => (
												<span
													className="rounded border border-white/10 bg-black/30 px-2 py-1"
													key={`${commit.commit}:${path}`}
												>
													{path}
												</span>
											))}
											{commit.has_more_paths ? (
												<span className="rounded border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-blue-100">
													+N more
												</span>
											) : null}
										</div>
									) : null}
								</div>
							))}
						</div>
					)}

					<div className="rounded-xl border border-white/10 bg-white/5 p-4">
						<h3 className="font-medium text-sm">Top touched paths</h3>
						{data.top_paths.length === 0 ? (
							<div className="mt-2 text-sm text-white/60">No path data.</div>
						) : (
							<div className="mt-2 space-y-1 text-xs">
								{data.top_paths.map((row) => (
									<div
										className="flex items-center justify-between rounded bg-black/20 px-2 py-1"
										key={row.path}
									>
										<span className="truncate">{row.path}</span>
										<span className="ml-3 text-white/70">
											{numberFormatter.format(row.touches)}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
