"use client";

import { useMemo, useState } from "react";
import { renderInspectorValue } from "./inspector-response";
import type { WorkflowRunStructuredModel } from "./types";
import { useRequestElapsedMs } from "./use-request-elapsed";
import { formatElapsedMs } from "./utils";

export interface WorkflowRunStructuredResponseProps {
	model: WorkflowRunStructuredModel;
	loading: boolean;
	requestStartedAtMs?: number;
	/** Last SSE `event` name (e.g. progress) when timeline/heartbeat are empty. */
	lastStreamEventName?: string;
}

export function WorkflowRunStructuredResponse(
	props: WorkflowRunStructuredResponseProps,
) {
	const { model, loading, requestStartedAtMs, lastStreamEventName } = props;
	const [copied, setCopied] = useState(false);

	const elapsedMs = useRequestElapsedMs(requestStartedAtMs, loading);

	const streamingHint = useMemo(() => {
		const last = model.timeline[model.timeline.length - 1];
		if (last) {
			const main = last.detail ? `${last.label} — ${last.detail}` : last.label;
			const kindNote =
				last.kind === "stage_progress"
					? " (stage progress)"
					: last.kind === "stage_start"
						? " (stage started)"
						: last.kind === "stage_done"
							? " (stage done)"
							: "";
			return { text: `${main}${kindNote}`, source: "timeline" as const };
		}
		if (model.lastHeartbeatActivity) {
			return {
				text: model.lastHeartbeatActivity,
				source: "heartbeat" as const,
			};
		}
		if (lastStreamEventName) {
			return {
				text: `Last event: ${lastStreamEventName}`,
				source: "event" as const,
			};
		}
		return null;
	}, [model.timeline, model.lastHeartbeatActivity, lastStreamEventName]);

	const copyStego = async () => {
		if (!model.stegoText) return;
		try {
			await navigator.clipboard.writeText(model.stegoText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	const statusBadge =
		model.outcome === "error"
			? "bg-rose-500/25 text-rose-200"
			: model.outcome === "success"
				? "bg-emerald-500/25 text-emerald-200"
				: "bg-amber-500/25 text-amber-200";

	const statusLabel =
		model.outcome === "error"
			? "Error"
			: model.outcome === "success"
				? "Done"
				: "Running";

	return (
		<div className="space-y-3">
			{loading ? (
				<div className="space-y-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-100 text-xs">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<span
							aria-hidden
							className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-200"
						/>
						<span className="font-medium">Streaming…</span>
						{elapsedMs !== null ? (
							<span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[11px] text-amber-50 tabular-nums">
								{formatElapsedMs(elapsedMs)} elapsed
							</span>
						) : null}
					</div>
					{streamingHint ? (
						<p className="text-white/80 leading-snug">
							<span className="text-white/50">
								{streamingHint.source === "timeline"
									? "Latest"
									: streamingHint.source === "heartbeat"
										? "Activity"
										: "Status"}
								:{" "}
							</span>
							{streamingHint.text}
						</p>
					) : (
						<p className="text-white/50">Waiting for server events…</p>
					)}
				</div>
			) : null}

			<div className="rounded-lg border border-white/10 bg-black/25 p-3">
				<div className="mb-2 flex flex-wrap items-center gap-2">
					<span
						className={`rounded px-2 py-0.5 font-medium text-xs ${statusBadge}`}
					>
						{statusLabel}
					</span>
					{model.command ? (
						<span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[11px] text-violet-200">
							{model.command}
						</span>
					) : null}
					{model.run_id ? (
						<span className="text-white/50 text-xs">
							run{" "}
							<span className="font-mono text-white/70">{model.run_id}</span>
						</span>
					) : null}
				</div>
				{model.summaryLine ? (
					<p className="text-sm text-white/85">{model.summaryLine}</p>
				) : null}
				{model.postIds.length > 0 ? (
					<p className="mt-1 text-white/55 text-xs">
						Post id{model.postIds.length > 1 ? "s" : ""}:{" "}
						<span className="font-mono text-white/75">
							{model.postIds.join(", ")}
						</span>
					</p>
				) : null}
				{model.stoppedReasonLabel ? (
					<p className="mt-1 text-white/60 text-xs">
						Stopped: {model.stoppedReasonLabel}
						{model.stoppedReason &&
						model.stoppedReason !== model.stoppedReasonLabel
							? ` (${model.stoppedReason})`
							: ""}
					</p>
				) : null}
				{model.outcome === "error" && model.errorMessage ? (
					<p className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-[11px] text-rose-100">
						{model.errorMessage}
					</p>
				) : null}
			</div>

			{model.stegoText ? (
				<div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
					<div className="mb-2 flex items-center justify-between gap-2">
						<span className="font-semibold text-sm text-white/80">
							Stego text
						</span>
						<button
							className="rounded-md bg-cyan-500/20 px-2 py-1 text-cyan-100 text-xs hover:bg-cyan-500/30"
							onClick={() => void copyStego()}
							type="button"
						>
							{copied ? "Copied" : "Copy"}
						</button>
					</div>
					<pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded border border-white/10 bg-black/30 p-2 font-mono text-[11px] text-white/90">
						{model.stegoText}
					</pre>
				</div>
			) : null}

			{model.timeline.length > 0 ? (
				<div className="rounded-lg border border-white/10 bg-black/20 p-3">
					<div className="mb-2 font-semibold text-white/70 text-xs">
						Timeline
					</div>
					<ol className="space-y-2 border-white/10 border-l pl-3 text-xs">
						{model.timeline.map((row, i) => (
							<li className="text-white/80" key={`${row.at}-${row.kind}-${i}`}>
								<span className="text-white/40">
									{new Date(row.at).toLocaleTimeString()}
								</span>{" "}
								<span className="font-medium text-white/90">{row.label}</span>
								{row.detail ? (
									<span className="text-white/55"> — {row.detail}</span>
								) : null}
								{row.kind === "stage_progress" && row.post_id ? (
									<span
										className={
											row.succeeded ? "text-emerald-300/90" : "text-rose-300/90"
										}
									>
										{" "}
										{row.succeeded ? "✓" : "✗"}
										{typeof row.retry_count === "number"
											? ` (${row.retry_count} retries)`
											: ""}
									</span>
								) : null}
							</li>
						))}
					</ol>
				</div>
			) : !loading && model.command === "stego" ? (
				<p className="text-white/45 text-xs">No stage timeline in this run.</p>
			) : null}

			{model.runAll && model.batchRows.length > 0 ? (
				<div className="overflow-x-auto rounded-lg border border-white/10">
					<table className="w-full min-w-[420px] text-left text-xs">
						<thead className="border-white/10 border-b bg-white/5 text-white/60">
							<tr>
								<th className="px-2 py-2 font-medium">Post</th>
								<th className="px-2 py-2 font-medium">#</th>
								<th className="px-2 py-2 font-medium">Ok</th>
								<th className="px-2 py-2 font-medium">Retries</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/10">
							{model.batchRows.map((row) => (
								<tr className="text-white/85" key={row.post_id}>
									<td className="max-w-[240px] truncate px-2 py-1.5 font-mono text-[11px]">
										{row.post_id}
									</td>
									<td className="px-2 py-1.5 text-white/70 tabular-nums">
										{row.processed_count}
									</td>
									<td className="px-2 py-1.5">
										{row.succeeded ? (
											<span className="text-emerald-300/90">yes</span>
										) : (
											<span className="text-rose-300/90">no</span>
										)}
									</td>
									<td className="px-2 py-1.5 tabular-nums">
										{row.retry_count ?? "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}

			{model.resultPayload !== null ? (
				<details className="rounded-lg border border-white/10 bg-black/20 p-2">
					<summary className="cursor-pointer text-white/70 text-xs">
						Full result (JSON)
					</summary>
					<div className="mt-2">
						{renderInspectorValue(model.resultPayload)}
					</div>
				</details>
			) : null}
		</div>
	);
}
