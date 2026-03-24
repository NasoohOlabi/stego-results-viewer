"use client";

import { useMemo, useState } from "react";
import type { ApiResponseView, StreamEventView } from "./types";
import {
	buildCopyRequestAndResponseText,
	buildCurlBash,
	buildStreamEventItems,
	extractLoggingTagsFromAdminResponse,
	extractStateLogsFromAdminResponse,
	extractValidatePostFromAdminResponse,
	extractWorkflowRunsFromAdminResponse,
	formatBytes,
	formatResponseForClipboard,
	getHeartbeatElapsedMs,
	isHeartbeatEvent,
	isLoggingTagsEndpoint,
	isSsePayload,
	isStateLogsEndpoint,
	isValidatePostEndpoint,
	isWorkflowRunsEndpoint
} from "./utils";
import { renderInspectorValue } from "./inspector-response";

export interface AdminApiActiveResponseProps {
	activeTabResponse: ApiResponseView;
	copyErrorReportState: "idle" | "copied" | "failed";
	onCopyActiveErrorReport: () => void;
	showHeartbeatEvents: boolean;
	onShowHeartbeatEventsChange: (value: boolean) => void;
	streamSearchText: string;
	onStreamSearchTextChange: (value: string) => void;
	copiedStreamEventKey: string | null;
	onCopyStreamEvent: (event: StreamEventView, eventKey: string) => void;
}

export function AdminApiActiveResponse(props: AdminApiActiveResponseProps) {
	const {
		activeTabResponse,
		copyErrorReportState,
		onCopyActiveErrorReport,
		showHeartbeatEvents,
		onShowHeartbeatEventsChange,
		streamSearchText,
		onStreamSearchTextChange,
		copiedStreamEventKey,
		onCopyStreamEvent
	} = props;

	const ssePayload = isSsePayload(activeTabResponse.data)
		? activeTabResponse.data
		: null;

	const workflowRuns =
		!ssePayload &&
		activeTabResponse.status === "success" &&
		isWorkflowRunsEndpoint(activeTabResponse)
			? extractWorkflowRunsFromAdminResponse(activeTabResponse.data)
			: null;

	const validatePostView =
		!ssePayload &&
		activeTabResponse.status === "success" &&
		isValidatePostEndpoint(activeTabResponse)
			? extractValidatePostFromAdminResponse(activeTabResponse.data)
			: null;

	const stateLogsView =
		!ssePayload &&
		activeTabResponse.status === "success" &&
		isStateLogsEndpoint(activeTabResponse)
			? extractStateLogsFromAdminResponse(activeTabResponse.data)
			: null;

	const loggingTagsView =
		!ssePayload &&
		activeTabResponse.status === "success" &&
		isLoggingTagsEndpoint(activeTabResponse)
			? extractLoggingTagsFromAdminResponse(activeTabResponse.data)
			: null;

	const streamItems = useMemo(
		() =>
			ssePayload
				? buildStreamEventItems([...ssePayload.events].reverse(), {
						includeHeartbeats: showHeartbeatEvents,
						searchText: streamSearchText
					})
				: [],
		[ssePayload, showHeartbeatEvents, streamSearchText]
	);

	const [copiedAction, setCopiedAction] = useState<
		"curl" | "response" | "both" | null
	>(null);

	const curlText = useMemo(
		() => buildCurlBash(activeTabResponse),
		[activeTabResponse]
	);
	const canCopyCurl = curlText.length > 0;
	const canCopyResponse = activeTabResponse.status !== "idle";
	const canCopyBoth = canCopyResponse;

	const copyWithFeedback = async (
		kind: "curl" | "response" | "both",
		text: string
	) => {
		if (!text.trim()) return;
		try {
			await navigator.clipboard.writeText(text);
			setCopiedAction(kind);
			setTimeout(() => {
				setCopiedAction((current) => (current === kind ? null : current));
			}, 1500);
		} catch {
			setCopiedAction(null);
		}
	};

	const heartbeatCount = ssePayload
		? ssePayload.events.filter(isHeartbeatEvent).length
		: 0;
	const nonHeartbeatCount = ssePayload
		? ssePayload.events.length - heartbeatCount
		: 0;
	const lastHeartbeatElapsed = ssePayload
		? ([...ssePayload.events]
				.reverse()
				.map(getHeartbeatElapsedMs)
				.find((value) => value !== null) ?? null)
		: null;

	return (
		<section className="rounded-xl border border-white/10 bg-black/30 p-4">
			<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-lg font-semibold">Active Tab Response</h2>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						disabled={!canCopyCurl}
						onClick={() => void copyWithFeedback("curl", curlText)}
						className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{copiedAction === "curl" ? "Copied" : "Copy curl"}
					</button>
					<button
						type="button"
						disabled={!canCopyResponse}
						onClick={() =>
							void copyWithFeedback(
								"response",
								formatResponseForClipboard(activeTabResponse)
							)
						}
						className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{copiedAction === "response" ? "Copied" : "Copy response"}
					</button>
					<button
						type="button"
						disabled={!canCopyBoth}
						onClick={() =>
							void copyWithFeedback(
								"both",
								buildCopyRequestAndResponseText(activeTabResponse)
							)
						}
						className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{copiedAction === "both" ? "Copied" : "Copy both"}
					</button>
					{activeTabResponse.status === "error" ? (
						<button
							type="button"
							onClick={onCopyActiveErrorReport}
							className="rounded-md bg-blue-500/20 px-3 py-1 text-xs hover:bg-blue-500/30"
						>
							{copyErrorReportState === "copied"
								? "Copied"
								: copyErrorReportState === "failed"
									? "Copy failed"
									: "Copy error report"}
						</button>
					) : null}
					<span
						className={`rounded px-2 py-1 text-xs ${
							activeTabResponse.status === "success"
								? "bg-emerald-500/20 text-emerald-300"
								: activeTabResponse.status === "error"
									? "bg-rose-500/20 text-rose-300"
									: activeTabResponse.status === "loading"
										? "bg-amber-500/20 text-amber-300"
										: "bg-white/10 text-white/60"
						}`}
					>
						{activeTabResponse.status.toUpperCase()}
					</span>
				</div>
			</div>
			{activeTabResponse.endpoint ? (
				<p className="mb-2 text-xs text-white/50">
					<span className="font-semibold text-white/70">
						{activeTabResponse.method}
					</span>{" "}
					{activeTabResponse.endpoint}
				</p>
			) : null}
			<div className="space-y-3 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3">
				{ssePayload ? (
					<>
						<div className="rounded-md border border-white/10 bg-black/30 p-2">
							<div className="mb-2 text-xs font-semibold text-white/70">
								Stream metadata
							</div>
							{renderInspectorValue({
								httpStatus: (
									activeTabResponse.data as Record<string, unknown>
								).httpStatus,
								httpStatusText: (
									activeTabResponse.data as Record<string, unknown>
								).httpStatusText,
								contentType: (
									activeTabResponse.data as Record<string, unknown>
								).contentType,
								streaming: (
									activeTabResponse.data as Record<string, unknown>
								).streaming,
								complete: (
									activeTabResponse.data as Record<string, unknown>
								).complete,
								eventCount: ssePayload.events.length,
								finishedAt: (
									activeTabResponse.data as Record<string, unknown>
								).finishedAt
							})}
						</div>

						<div className="space-y-2">
							<div className="flex flex-wrap items-center gap-2 text-xs">
								<span className="rounded bg-white/10 px-2 py-1 text-white/80">
									events: {ssePayload.events.length}
								</span>
								<span className="rounded bg-blue-500/20 px-2 py-1 text-blue-200">
									updates: {nonHeartbeatCount}
								</span>
								<span className="rounded bg-amber-500/20 px-2 py-1 text-amber-200">
									heartbeats: {heartbeatCount}
								</span>
								{lastHeartbeatElapsed !== null ? (
									<span className="rounded bg-white/10 px-2 py-1 text-white/70">
										last heartbeat:{" "}
										{(lastHeartbeatElapsed / 1000).toFixed(1)}s
									</span>
								) : null}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<label className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/70">
									<input
										type="checkbox"
										checked={showHeartbeatEvents}
										onChange={(e) =>
											onShowHeartbeatEventsChange(e.target.checked)
										}
									/>
									Show heartbeat events
								</label>
								<input
									value={streamSearchText}
									onChange={(e) =>
										onStreamSearchTextChange(e.target.value)
									}
									placeholder="Filter stream text"
									className="min-w-[220px] flex-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white placeholder:text-white/40"
								/>
							</div>
							{streamItems.length === 0 ? (
								<p className="text-xs text-white/60">
									Waiting for events...
								</p>
							) : (
								streamItems.map((item, index) => {
									if (item.type === "heartbeat-group") {
										const firstHeartbeat = item.heartbeats?.[0];
										const lastHeartbeat =
											item.heartbeats?.[
												(item.heartbeats?.length ?? 1) - 1
											];
										const firstElapsed = firstHeartbeat
											? getHeartbeatElapsedMs(firstHeartbeat)
											: null;
										const lastElapsed = lastHeartbeat
											? getHeartbeatElapsedMs(lastHeartbeat)
											: null;
										return (
											<div
												key={`hb-${index}-${firstHeartbeat?.receivedAt ?? "unknown"}`}
												className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-100"
											>
												{item.heartbeats?.length} heartbeat
												{item.heartbeats?.length === 1
													? ""
													: "s"}
												{firstElapsed !== null &&
												lastElapsed !== null
													? ` (${(firstElapsed / 1000).toFixed(1)}s -> ${(lastElapsed / 1000).toFixed(1)}s)`
													: ""}
											</div>
										);
									}

									const event = item.event;
									if (!event) return null;
									const eventKey = `${event.receivedAt}-${index}`;
									return (
										<div
											key={eventKey}
											className="rounded-md border border-white/10 bg-black/20 p-2"
										>
											<div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
												<span className="rounded bg-blue-500/20 px-2 py-0.5 font-semibold text-blue-200">
													{event.event}
												</span>
												<span className="text-white/50">
													{new Date(
														event.receivedAt
													).toLocaleTimeString()}
												</span>
												{event.id ? (
													<span className="rounded bg-white/10 px-2 py-0.5 text-white/70">
														id: {event.id}
													</span>
												) : null}
												{event.retry !== undefined ? (
													<span className="rounded bg-white/10 px-2 py-0.5 text-white/70">
														retry: {event.retry}
													</span>
												) : null}
												<button
													type="button"
													onClick={() =>
														onCopyStreamEvent(event, eventKey)
													}
													className="ml-auto rounded bg-blue-500/20 px-2 py-0.5 text-[11px] text-blue-100 hover:bg-blue-500/30"
												>
													{copiedStreamEventKey === eventKey
														? "Copied"
														: "Copy"}
												</button>
											</div>
											{renderInspectorValue(event.data)}
										</div>
									);
								})
							)}
						</div>
					</>
				) : (
					<>
						{workflowRuns ? (
							<div className="mb-4 space-y-2">
								<div className="text-xs font-semibold text-white/70">
									Workflow runs ({workflowRuns.count} reported
									{workflowRuns.runs.length !== workflowRuns.count
										? `, ${workflowRuns.runs.length} parsed`
										: ""}
									)
								</div>
								{workflowRuns.runs.length === 0 ? (
									<p className="text-xs text-white/55">
										No runs in this response.
									</p>
								) : (
									<div className="overflow-x-auto rounded-md border border-white/10">
										<table className="w-full min-w-[640px] text-left text-xs">
											<thead className="border-b border-white/10 bg-white/5 text-white/60">
												<tr>
													<th className="px-2 py-2 font-medium">ID</th>
													<th className="px-2 py-2 font-medium">Command</th>
													<th className="px-2 py-2 font-medium">Mode</th>
													<th className="px-2 py-2 font-medium">Started</th>
													<th className="px-2 py-2 font-medium text-right">
														Elapsed
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-white/10">
												{workflowRuns.runs.map((run) => (
													<tr
														key={run.id}
														className="text-white/85 hover:bg-white/5"
													>
														<td className="max-w-[200px] truncate px-2 py-2 font-mono text-[11px]">
															{run.id}
														</td>
														<td className="px-2 py-2">{run.command}</td>
														<td className="px-2 py-2">
															<span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-200">
																{run.mode}
															</span>
														</td>
														<td className="px-2 py-2 text-white/60">
															{new Date(run.started_at * 1000).toLocaleString()}
														</td>
														<td className="px-2 py-2 text-right tabular-nums text-white/70">
															{(run.elapsed_ms / 1000).toFixed(1)}s
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						) : null}
						{validatePostView ? (
							<div className="mb-4 space-y-2 rounded-md border border-teal-500/25 bg-teal-500/5 p-3">
								<div className="flex flex-wrap items-center gap-2 text-xs">
									<span className="font-semibold text-white/80">
										Validate post — {validatePostView.post_id}
									</span>
									{validatePostView.mode ? (
										<span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50">
											{validatePostView.mode}
										</span>
									) : null}
									<span
										className={`rounded px-2 py-0.5 font-medium ${
											validatePostView.valid
												? "bg-emerald-500/25 text-emerald-200"
												: validatePostView.validation_outcome ===
													  "rerun_incomplete"
													? "bg-sky-500/20 text-sky-200"
													: "bg-amber-500/25 text-amber-200"
										}`}
									>
										{validatePostView.valid
											? "valid"
											: validatePostView.validation_outcome
												? validatePostView.validation_outcome.replace(
														/_/g,
														" "
													)
												: "not valid"}
									</span>
								</div>
								{validatePostView.validation_explanation ? (
									<p className="text-[11px] leading-snug text-white/55">
										{validatePostView.validation_explanation}
									</p>
								) : null}
								<div className="overflow-x-auto rounded border border-white/10">
									<table className="w-full min-w-[640px] text-left text-xs">
										<thead className="border-b border-white/10 bg-white/5 text-white/55">
											<tr>
												<th className="px-2 py-2 font-medium">Stage</th>
												<th className="px-2 py-2 font-medium">Step</th>
												<th className="px-2 py-2 font-medium">Match</th>
												<th className="px-2 py-2 font-medium">Comparison</th>
												<th className="px-2 py-2 font-medium">
													Changed keys
												</th>
												<th className="px-2 py-2 font-medium">Error</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-white/10">
											{Object.entries(validatePostView.steps).map(
												([key, row]) => (
													<tr
														key={key}
														className="text-white/85"
														title={
															[row.comparison_note, row.error]
																.filter(Boolean)
																.join("\n\n") || undefined
														}
													>
														<td className="px-2 py-2 font-mono text-[11px] text-white/60">
															{key}
														</td>
														<td className="px-2 py-2 font-mono text-[11px]">
															{row.step}
														</td>
														<td className="px-2 py-2">
															{row.matches === true ? (
																<span className="text-emerald-300/90">
																	yes
																</span>
															) : row.matches === false ? (
																<span className="text-rose-300/90">no</span>
															) : (
																<span className="text-white/45">n/a</span>
															)}
														</td>
														<td className="max-w-[140px] px-2 py-2 font-mono text-[10px] text-violet-200/90">
															{row.comparison ?? "—"}
														</td>
														<td className="max-w-[200px] px-2 py-2 text-white/70">
															{row.changed_keys.length === 0
																? "—"
																: row.changed_keys.join(", ")}
														</td>
														<td className="max-w-[220px] truncate px-2 py-2 font-mono text-[10px] text-rose-200/80">
															{row.error ?? "—"}
														</td>
													</tr>
												)
											)}
										</tbody>
									</table>
								</div>
							</div>
						) : null}
						{stateLogsView ? (
							<div className="mb-4 space-y-2 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
								<div className="text-xs font-semibold text-white/70">
									API JSONL log file
								</div>
								<div className="flex flex-wrap gap-2 text-xs">
									<span
										className={`rounded px-2 py-1 font-medium ${
											stateLogsView.file_logging_enabled
												? "bg-emerald-500/20 text-emerald-200"
												: "bg-white/10 text-white/55"
										}`}
									>
										file_logging_enabled:{" "}
										{stateLogsView.file_logging_enabled ? "true" : "false"}
									</span>
									<span className="rounded bg-white/10 px-2 py-1 tabular-nums text-white/80">
										on disk: {formatBytes(stateLogsView.bytes)}
									</span>
								</div>
								<p className="break-all font-mono text-[11px] text-white/65">
									{stateLogsView.path ?? (
										<span className="text-white/45">path: null</span>
									)}
								</p>
								<p className="text-[11px] text-white/45">
									DELETE /state/logs truncates this file when file logging is
									enabled; otherwise the API returns 400.
								</p>
							</div>
						) : null}
						{loggingTagsView ? (
							<div className="mb-4 space-y-2">
								<div className="text-xs font-semibold text-white/70">
									Structured log tags ({loggingTagsView.tags.length})
								</div>
								<div className="overflow-x-auto rounded-md border border-white/10">
									<table className="w-full min-w-[480px] text-left text-xs">
										<thead className="border-b border-white/10 bg-white/5 text-white/60">
											<tr>
												<th className="px-2 py-2 font-medium">id</th>
												<th className="px-2 py-2 font-medium">description</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-white/10">
											{loggingTagsView.tags.map((row) => (
												<tr
													key={row.id}
													className="text-white/85 hover:bg-white/5"
												>
													<td className="px-2 py-2 font-mono text-[11px] text-violet-200/90">
														{row.id}
													</td>
													<td className="px-2 py-2 text-white/70">
														{row.description}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
								{loggingTagsView.tag_ids.length > 0 ? (
									<details className="rounded border border-white/10 bg-black/20 p-2 text-[11px] text-white/55">
										<summary className="cursor-pointer text-white/70">
											tag_ids ({loggingTagsView.tag_ids.length})
										</summary>
										<pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-white/60">
											{JSON.stringify(loggingTagsView.tag_ids, null, 2)}
										</pre>
									</details>
								) : null}
							</div>
						) : null}
						{renderInspectorValue(activeTabResponse.data)}
					</>
				)}
			</div>
		</section>
	);
}
