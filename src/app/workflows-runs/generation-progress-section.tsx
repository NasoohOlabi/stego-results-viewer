"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

function formatAgo(epochMs: number): string {
	if (!epochMs) return "never";
	const deltaMs = Date.now() - epochMs;
	const minutes = Math.floor(deltaMs / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return `${hours}h ago`;
	return new Date(epochMs).toLocaleDateString();
}

/** On-disk sample generation progress for every run side-wing has produced.
 * Complements the live `/workflows/runs` table: it works even when the API
 * process is down, and shows done/failed/pending per run profile. */
export function GenerationProgressSection() {
	const { data: rows = [], isLoading } = api.runs.progress.useQuery(undefined, {
		refetchInterval: 5_000,
	});

	return (
		<section className="space-y-3">
			<header>
				<h2 className="font-semibold text-xl">Sample generation progress</h2>
				<p className="text-sm text-white/55">
					Read from run folders on disk (<code>metrics/*/…/output-results</code>
					): samples done vs. attempted per run profile. A run is{" "}
					<span className="text-emerald-300">live</span> when files were written
					in the last 3 minutes.
				</p>
			</header>

			<div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
				<div className="overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="bg-white/10 text-left text-white/60 text-xs uppercase tracking-wide">
							<tr>
								<th className="px-4 py-3">Run / profile</th>
								<th className="px-4 py-3">Progress</th>
								<th className="px-4 py-3 text-right">Done</th>
								<th className="px-4 py-3 text-right">Failed</th>
								<th className="px-4 py-3 text-right">Attempted</th>
								<th className="px-4 py-3">Last activity</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td className="px-4 py-6 text-white/60" colSpan={7}>
										Scanning run folders...
									</td>
								</tr>
							) : rows.length === 0 ? (
								<tr>
									<td className="px-4 py-6 text-white/60" colSpan={7}>
										No generation runs found on disk yet.
									</td>
								</tr>
							) : (
								rows.map((row) => {
									const settled = row.doneCount + row.failedCount;
									const total = Math.max(row.attemptedCount, settled);
									const donePct = total > 0 ? (row.doneCount / total) * 100 : 0;
									const failedPct =
										total > 0 ? (row.failedCount / total) * 100 : 0;
									return (
										<tr
											className="border-white/10 border-t text-white/90"
											key={row.id}
										>
											<td className="max-w-[22rem] px-4 py-3">
												<div className="flex items-center gap-2">
													{row.isActive ? (
														<span
															className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400"
															title="Live: files written in the last 3 minutes"
														/>
													) : null}
													<span className="truncate" title={row.id}>
														{row.run}
													</span>
												</div>
												<div className="truncate text-white/45 text-xs">
													{row.profile}
												</div>
											</td>
											<td className="min-w-[10rem] px-4 py-3">
												<div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
													<div className="flex h-full">
														<div
															className="h-full bg-emerald-400/80"
															style={{ width: `${donePct}%` }}
														/>
														<div
															className="h-full bg-red-400/70"
															style={{ width: `${failedPct}%` }}
														/>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 text-right text-emerald-300">
												{row.doneCount}
											</td>
											<td className="px-4 py-3 text-right text-red-300">
												{row.failedCount}
											</td>
											<td className="px-4 py-3 text-right text-white/70">
												{row.attemptedCount}
											</td>
											<td className="px-4 py-3 text-white/60">
												{formatAgo(row.lastActivityMs)}
											</td>
											<td className="px-4 py-3">
												{row.doneCount > 0 ? (
													<Link
														className="rounded-md bg-white/10 px-2.5 py-1.5 text-xs transition-colors hover:bg-white/20"
														href={`/?folder=${encodeURIComponent(row.sourceId)}`}
													>
														View samples
													</Link>
												) : null}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
