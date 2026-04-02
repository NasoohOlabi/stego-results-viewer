"use client";

import { useMemo, useState } from "react";
import type { StreamEventView } from "~/app/admin-api/types";

function CopyJsonButton({ text }: { text: string }) {
	const [state, setState] = useState<"idle" | "copied" | "error">("idle");
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setState("copied");
			setTimeout(() => setState("idle"), 1500);
		} catch {
			setState("error");
			setTimeout(() => setState("idle"), 1500);
		}
	};
	return (
		<button
			className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-medium text-xs transition-colors ${
				state === "copied"
					? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
					: state === "error"
						? "border-red-500/30 bg-red-500/20 text-red-300"
						: "border-white/15 bg-white/8 text-white/65 hover:bg-white/15 hover:text-white/90"
			}`}
			onClick={() => void copy()}
			type="button"
		>
			{state === "copied"
				? "✓ Copied"
				: state === "error"
					? "✗ Failed"
					: "Copy JSON"}
		</button>
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Inner discriminator from workflow `progress` SSE payloads (see side-wing quirk). */
function getProgressInnerEvent(data: unknown): string | null {
	if (!isRecord(data)) return null;
	const e = data.event;
	return typeof e === "string" ? e : null;
}

export interface DerivedDoubleProcessState {
	runId: string | null;
	phase: string | null;
	/** 0–100 visual progress (heuristic from events + heartbeat). */
	percent: number;
	/** High-level pipeline steps for the stepper UI. */
	steps: {
		id: string;
		label: string;
		status: "pending" | "active" | "done" | "error";
	}[];
	postId: string | null;
	fileName: string | null;
	currentPass: number | null;
	currentSubstage: string | null;
	cacheMode: string | null;
	lastHeartbeat: {
		elapsed_ms?: number;
		activity?: string;
		recent_log?: string;
	} | null;
	logLines: { at: string; message: string; level?: string }[];
	substageRows: {
		key: string;
		stage: string;
		pass: number | null;
		cache_mode: string | null;
		pipeline_substage: string | null;
		state: "running" | "done" | "failed";
		error?: string;
	}[];
	streamError: { message: string; details?: unknown } | null;
}

const STEP_DEF = [
	{ id: "accept", label: "Accepted" },
	{ id: "post", label: "Post selected" },
	{ id: "p1", label: "Pass 1 (cached)" },
	{ id: "p2", label: "Pass 2 (cacheless)" },
	{ id: "fin", label: "Finished" },
] as const;

function deriveState(events: StreamEventView[]): DerivedDoubleProcessState {
	let runId: string | null = null;
	let phase: string | null = null;
	let postId: string | null = null;
	let fileName: string | null = null;
	let currentPass: number | null = null;
	let currentSubstage: string | null = null;
	let cacheMode: string | null = null;
	let lastHeartbeat: DerivedDoubleProcessState["lastHeartbeat"] = null;
	const logLines: DerivedDoubleProcessState["logLines"] = [];
	const substageMap = new Map<
		string,
		DerivedDoubleProcessState["substageRows"][0]
	>();
	let streamError: DerivedDoubleProcessState["streamError"] = null;

	let score = 0;
	let sawWorkflowStart = false;
	let sawSelectedPost = false;
	let pass1Done = false;
	let pass2Done = false;
	let workflowDone = false;
	let sawResult = false;

	const bump = (n: number) => {
		score = Math.min(100, Math.max(score, n));
	};

	for (const ev of events) {
		if (ev.event === "status" && isRecord(ev.data)) {
			if (typeof ev.data.run_id === "string") runId = ev.data.run_id;
			if (typeof ev.data.phase === "string") phase = ev.data.phase;
			if (ev.data.phase === "accepted") bump(5);
			if (ev.data.phase === "started") bump(10);
		}
		if (ev.event === "heartbeat" && isRecord(ev.data)) {
			lastHeartbeat = {
				elapsed_ms:
					typeof ev.data.elapsed_ms === "number"
						? ev.data.elapsed_ms
						: undefined,
				activity:
					typeof ev.data.activity === "string" ? ev.data.activity : undefined,
				recent_log:
					typeof ev.data.recent_log === "string"
						? ev.data.recent_log
						: undefined,
			};
			// Gentle creep while running (capped); avoids a stuck bar during long I/O.
			if (!sawResult && score < 92) bump(score + 0.35);
		}
		if (ev.event === "log" && isRecord(ev.data)) {
			const msg = ev.data.message;
			logLines.push({
				at: ev.receivedAt,
				message: typeof msg === "string" ? msg : JSON.stringify(ev.data),
				level: typeof ev.data.level === "string" ? ev.data.level : undefined,
			});
			if (logLines.length > 80) logLines.shift();
		}
		if (ev.event === "error" && isRecord(ev.data)) {
			streamError = {
				message:
					typeof ev.data.message === "string" ? ev.data.message : "Error",
				details: ev.data.details,
			};
		}
		if (ev.event === "result") {
			sawResult = true;
			bump(100);
			if (isRecord(ev.data) && isRecord(ev.data.result)) {
				const r = ev.data.result;
				if (typeof r.post_id === "string") postId = r.post_id;
			}
		}
		if (ev.event !== "progress") continue;

		const inner = getProgressInnerEvent(ev.data);
		if (!inner) continue;
		const d = isRecord(ev.data) ? ev.data : {};

		switch (inner) {
			case "workflow_start":
				sawWorkflowStart = true;
				bump(12);
				break;
			case "selected_post":
				sawSelectedPost = true;
				if (typeof d.post_id === "string") postId = d.post_id as string;
				if (typeof d.file_name === "string") fileName = d.file_name as string;
				bump(22);
				break;
			case "pass_1_cached_start":
				currentPass = 1;
				bump(28);
				break;
			case "pass_2_cacheless_start":
				currentPass = 2;
				bump(55);
				break;
			case "substage_begin": {
				const st = typeof d.stage === "string" ? d.stage : "?";
				const pass = typeof d.pass === "number" ? d.pass : null;
				const ps =
					typeof d.pipeline_substage === "string" ? d.pipeline_substage : null;
				const cm = typeof d.cache_mode === "string" ? d.cache_mode : null;
				currentPass = pass;
				currentSubstage = ps ?? st;
				cacheMode = cm;
				const key = `${pass ?? "?"}:${st}:${ps ?? ""}`;
				substageMap.set(key, {
					key,
					stage: st,
					pass,
					cache_mode: cm,
					pipeline_substage: ps,
					state: "running",
				});
				bump(pass === 1 ? 30 : pass === 2 ? 58 : score);
				break;
			}
			case "substage_end": {
				const st = typeof d.stage === "string" ? d.stage : "?";
				const pass = typeof d.pass === "number" ? d.pass : null;
				const ps =
					typeof d.pipeline_substage === "string" ? d.pipeline_substage : null;
				const key = `${pass ?? "?"}:${st}:${ps ?? ""}`;
				const row = substageMap.get(key);
				if (row) row.state = "done";
				else {
					substageMap.set(key, {
						key,
						stage: st,
						pass,
						cache_mode: typeof d.cache_mode === "string" ? d.cache_mode : null,
						pipeline_substage: ps,
						state: "done",
					});
				}
				bump(pass === 1 ? 42 : 78);
				break;
			}
			case "substage_failed": {
				const st = typeof d.stage === "string" ? d.stage : "?";
				const pass = typeof d.pass === "number" ? d.pass : null;
				const ps =
					typeof d.pipeline_substage === "string" ? d.pipeline_substage : null;
				const key = `${pass ?? "?"}:${st}:${ps ?? ""}`;
				const err =
					typeof d.error === "string"
						? d.error
						: typeof d.summary === "string"
							? d.summary
							: undefined;
				const row = substageMap.get(key);
				if (row) {
					row.state = "failed";
					row.error = err;
				} else {
					substageMap.set(key, {
						key,
						stage: st,
						pass,
						cache_mode: typeof d.cache_mode === "string" ? d.cache_mode : null,
						pipeline_substage: ps,
						state: "failed",
						error: err,
					});
				}
				break;
			}
			case "pass_1_finished":
				pass1Done = true;
				currentPass = 1;
				bump(48);
				break;
			case "pass_2_finished":
				pass2Done = true;
				currentPass = 2;
				bump(88);
				break;
			case "workflow_done":
				workflowDone = true;
				if (typeof d.post_id === "string") postId = d.post_id as string;
				bump(94);
				break;
			case "fetch_failed":
				bump(score);
				break;
			default:
				break;
		}
	}

	const substageRows = [...substageMap.values()];

	// Stepper statuses
	const steps: DerivedDoubleProcessState["steps"] = STEP_DEF.map((s) => {
		let status: "pending" | "active" | "done" | "error" = "pending";
		if (s.id === "accept") {
			status = phase || runId ? "done" : "pending";
		} else if (s.id === "post") {
			if (sawSelectedPost || postId) status = "done";
			else if (sawWorkflowStart) status = "active";
		} else if (s.id === "p1") {
			if (pass1Done) status = "done";
			else if (sawSelectedPost) status = "active";
		} else if (s.id === "p2") {
			if (pass2Done) status = "done";
			else if (pass1Done) status = "active";
		} else if (s.id === "fin") {
			if (streamError && !sawResult) status = "error";
			else if (sawResult || workflowDone) status = "done";
			else if (pass2Done) status = "active";
		}
		return { ...s, status };
	});

	const percent = Math.round(Math.min(100, Math.max(0, score)));

	return {
		runId,
		phase,
		percent,
		steps,
		postId,
		fileName,
		currentPass,
		currentSubstage,
		cacheMode,
		lastHeartbeat,
		logLines,
		substageRows,
		streamError,
	};
}

function ProgressBar({
	percent,
	pulsing,
}: {
	percent: number;
	pulsing?: boolean;
}) {
	const w = Math.min(100, Math.max(0, percent));
	return (
		<div className="h-2.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
			<div
				className={`h-full max-w-full rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 transition-[width] duration-500 ease-out ${
					pulsing ? "animate-pulse" : ""
				}`}
				// Dynamic width for progress; Tailwind cannot express percent from runtime data.
				style={{ width: `${w}%` }}
			/>
		</div>
	);
}

type PanelTab = "overview" | "timeline" | "raw";

export function DoubleProcessSsePanel({
	events,
	sseEventsJson,
}: {
	events: StreamEventView[];
	sseEventsJson: unknown;
}) {
	const state = useMemo(() => deriveState(events), [events]);
	const [tab, setTab] = useState<PanelTab>("overview");
	const [expandedRaw, setExpandedRaw] = useState(false);

	const barPulse =
		state.percent > 0 &&
		state.percent < 100 &&
		state.steps[4]?.status !== "done";

	return (
		<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
			<div className="flex flex-wrap items-center justify-between gap-3 border-white/8 border-b px-4 py-3">
				<div className="flex min-w-0 flex-wrap items-center gap-3">
					<h2 className="font-semibold text-sm text-white/90">Live run</h2>
					<span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
						{events.length} events
					</span>
					{state.runId ? (
						<span className="truncate font-mono text-[10px] text-white/40">
							run {state.runId}
						</span>
					) : null}
				</div>
				<div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
					{(["overview", "timeline", "raw"] as const).map((id) => (
						<button
							className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
								tab === id
									? "bg-white/15 text-white"
									: "text-white/45 hover:text-white/75"
							}`}
							key={id}
							onClick={() => setTab(id)}
							type="button"
						>
							{id}
						</button>
					))}
				</div>
			</div>

			<div className="p-4">
				{tab === "overview" ? (
					<div className="space-y-5">
						<div>
							<div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-white/50">
								<span>Progress</span>
								<span className="font-mono text-violet-300/90 tabular-nums">
									{state.percent}%
									{state.lastHeartbeat?.elapsed_ms != null ? (
										<span className="ml-2 text-white/35">
											· {(state.lastHeartbeat.elapsed_ms / 1000).toFixed(1)}s
										</span>
									) : null}
								</span>
							</div>
							<ProgressBar percent={state.percent} pulsing={barPulse} />
						</div>

						<ol className="flex flex-wrap gap-2">
							{state.steps.map((s) => (
								<li
									className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-[11px] ${
										s.status === "done"
											? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
											: s.status === "active"
												? "border-violet-500/40 bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/25"
												: s.status === "error"
													? "border-red-500/35 bg-red-500/10 text-red-200"
													: "border-white/10 bg-black/25 text-white/40"
									}`}
									key={s.id}
								>
									{s.status === "done" ? (
										<span className="text-emerald-400">✓</span>
									) : s.status === "active" ? (
										<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
									) : s.status === "error" ? (
										<span className="text-red-400">✕</span>
									) : (
										<span className="text-white/25">○</span>
									)}
									{s.label}
								</li>
							))}
						</ol>

						{(state.postId || state.fileName) && (
							<div className="grid gap-2 sm:grid-cols-2">
								{state.postId ? (
									<div className="rounded-lg border border-white/8 bg-black/25 px-3 py-2">
										<div className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
											Post
										</div>
										<div className="mt-0.5 break-all font-mono text-sm text-white/85">
											{state.postId}
										</div>
									</div>
								) : null}
								{state.fileName ? (
									<div className="rounded-lg border border-white/8 bg-black/25 px-3 py-2">
										<div className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
											File
										</div>
										<div className="mt-0.5 break-all font-mono text-sm text-white/85">
											{state.fileName}
										</div>
									</div>
								) : null}
							</div>
						)}

						{(state.currentSubstage || state.lastHeartbeat?.activity) && (
							<div className="rounded-lg border border-white/8 bg-violet-950/20 px-3 py-2.5 text-sm">
								<div className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
									Now
								</div>
								<p className="mt-1 text-white/85">
									{state.currentPass != null && (
										<span className="mr-2 inline-flex rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-200">
											pass {state.currentPass}
											{state.cacheMode ? ` · ${state.cacheMode}` : ""}
										</span>
									)}
									{state.currentSubstage ??
										state.lastHeartbeat?.activity ??
										"—"}
								</p>
								{state.lastHeartbeat?.recent_log ? (
									<p className="mt-2 border-white/5 border-t pt-2 font-mono text-[11px] text-white/45">
										{state.lastHeartbeat.recent_log}
									</p>
								) : null}
							</div>
						)}

						{state.streamError ? (
							<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
								<strong className="text-red-300">Stream error:</strong>{" "}
								{state.streamError.message}
							</div>
						) : null}

						{state.logLines.length > 0 ? (
							<div>
								<div className="mb-1.5 font-semibold text-[10px] text-white/40 uppercase tracking-wide">
									Workflow log
								</div>
								<ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-white/8 bg-black/30 p-2 font-mono text-[11px] text-white/55">
									{state.logLines.slice(-12).map((l, i) => (
										<li key={`${l.at}-${i}`}>
											<span className="text-white/30">
												{l.at.slice(11, 19)}
											</span>{" "}
											{l.message}
										</li>
									))}
								</ul>
							</div>
						) : null}
					</div>
				) : null}

				{tab === "timeline" ? (
					<div className="space-y-3">
						<p className="text-white/45 text-xs">
							Substage events from{" "}
							<code className="text-white/65">progress</code> (runner inner{" "}
							<code className="text-white/65">event</code> field).
						</p>
						{state.substageRows.length === 0 ? (
							<p className="text-sm text-white/40">No substage rows yet.</p>
						) : (
							<ul className="max-h-80 space-y-1.5 overflow-y-auto">
								{state.substageRows.map((r) => (
									<li
										className={`flex flex-wrap items-baseline justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
											r.state === "done"
												? "border-emerald-500/20 bg-emerald-500/5"
												: r.state === "failed"
													? "border-red-500/25 bg-red-500/8"
													: "border-amber-500/20 bg-amber-500/5"
										}`}
										key={r.key}
									>
										<div className="min-w-0 flex-1">
											<span className="font-mono text-white/75">
												{r.pipeline_substage ?? r.stage}
											</span>
											{r.pass != null && (
												<span className="ml-2 text-white/35">
													pass {r.pass}
													{r.cache_mode ? ` · ${r.cache_mode}` : ""}
												</span>
											)}
										</div>
										<span
											className={`shrink-0 font-semibold uppercase ${
												r.state === "done"
													? "text-emerald-400"
													: r.state === "failed"
														? "text-red-400"
														: "text-amber-300"
											}`}
										>
											{r.state}
										</span>
										{r.error ? (
											<div className="basis-full text-[10px] text-red-200/90">
												{r.error}
											</div>
										) : null}
									</li>
								))}
							</ul>
						)}

						<details className="rounded-lg border border-white/8 bg-black/20">
							<summary className="cursor-pointer px-3 py-2 text-white/55 text-xs hover:text-white/80">
								All SSE event names (chronological)
							</summary>
							<ol className="max-h-48 space-y-1 overflow-y-auto px-3 pb-3 font-mono text-[10px] text-white/50">
								{events.map((ev, i) => {
									const inner =
										ev.event === "progress"
											? getProgressInnerEvent(ev.data)
											: null;
									return (
										<li key={`${ev.receivedAt}-${i}`}>
											<span
												className={
													ev.event === "error"
														? "text-red-400"
														: ev.event === "result"
															? "text-emerald-400"
															: "text-white/70"
												}
											>
												{ev.event}
											</span>
											{inner ? (
												<span className="text-white/35"> · {inner}</span>
											) : null}
										</li>
									);
								})}
							</ol>
						</details>
					</div>
				) : null}

				{tab === "raw" ? (
					<div>
						<div className="mb-2 flex flex-wrap items-center gap-2">
							<CopyJsonButton text={JSON.stringify(sseEventsJson, null, 2)} />
							<button
								className="text-violet-300/90 text-xs hover:text-violet-200"
								onClick={() => setExpandedRaw(!expandedRaw)}
								type="button"
							>
								{expandedRaw ? "Collapse" : "Expand"} view
							</button>
						</div>
						<pre
							className={`overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-black/30 p-3 font-mono text-[11px] text-white/60 ${
								expandedRaw ? "max-h-[min(70vh,32rem)]" : "max-h-48"
							}`}
						>
							{JSON.stringify(sseEventsJson, null, 2)}
						</pre>
					</div>
				) : null}
			</div>
		</section>
	);
}
