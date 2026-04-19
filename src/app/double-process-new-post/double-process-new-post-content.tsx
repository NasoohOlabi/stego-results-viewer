"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import {
	ADMIN_API_STORAGE_KEY,
	type StreamEventView,
} from "~/app/admin-api/types";
import { parseJsonOrText, parseSseEvent } from "~/app/admin-api/utils";
import { DoubleProcessSsePanel } from "~/app/double-process-new-post/double-process-sse-panel";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

const ENDPOINT_PATH = "/workflows/double-process-new-post";
const RECENT_RUNS_ENDPOINT_PATH = "/workflows/double-process-posts";

type DoubleProcessRunListItem = {
	report_path?: unknown;
	file_mtime?: unknown;
	record?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractDataPayload(payload: unknown): unknown {
	if (!isRecord(payload)) return null;
	if (payload.ok === true && "data" in payload) return payload.data;
	if (payload.mode === "double_process_new_post") return payload;
	const inner = payload.data;
	if (isRecord(inner) && inner.mode === "double_process_new_post") return inner;
	return null;
}

function extractRecentRunsPayload(payload: unknown): {
	base_path?: string;
	count?: number;
	runs: DoubleProcessRunListItem[];
} | null {
	if (!isRecord(payload)) return null;
	const candidate = isRecord(payload.data) ? payload.data : payload;
	if (!isRecord(candidate) || !Array.isArray(candidate.runs)) return null;
	return {
		base_path:
			typeof candidate.base_path === "string" ? candidate.base_path : undefined,
		count: typeof candidate.count === "number" ? candidate.count : undefined,
		runs: candidate.runs as DoubleProcessRunListItem[],
	};
}

function formatFileMtime(value: unknown): string {
	if (typeof value !== "number" || !Number.isFinite(value)) return "—";
	return new Date(value * 1000).toLocaleString();
}

async function readSsePost(
	url: string,
	body: Record<string, unknown>,
	onEvent: (event: StreamEventView) => void,
): Promise<{ ok: boolean; sawError: boolean }> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const contentType = res.headers.get("content-type") ?? "";
	if (!contentType.includes("text/event-stream")) {
		throw new Error(
			`Expected SSE (text/event-stream), got ${contentType || "unknown"}`,
		);
	}
	const stream = res.body;
	if (!stream) throw new Error("SSE response had no body");

	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let sawError = false;

	const flush = () => {
		let sep = buffer.indexOf("\n\n");
		while (sep >= 0) {
			const rawBlock = buffer.slice(0, sep).replace(/\r/g, "");
			buffer = buffer.slice(sep + 2);
			const parsed = parseSseEvent(rawBlock);
			if (parsed) {
				if (parsed.event === "error") sawError = true;
				onEvent(parsed);
			}
			sep = buffer.indexOf("\n\n");
		}
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		flush();
	}
	buffer += decoder.decode();
	buffer = buffer.replace(/\r/g, "");
	if (buffer.trim()) {
		const parsed = parseSseEvent(buffer);
		if (parsed) {
			if (parsed.event === "error") sawError = true;
			onEvent(parsed);
		}
	}

	return { ok: res.ok && !sawError, sawError };
}

function buildCurl(url: string, body: Record<string, unknown>): string {
	return `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
}

/** Short chime (success) or low buzz (failure); uses an already-unlocked `AudioContext`. */
function playDoubleProcessOutcomeSound(
	ctx: AudioContext,
	outcome: "success" | "error",
): void {
	const t0 = ctx.currentTime;
	const master = ctx.createGain();
	master.gain.value = 0.22;
	master.connect(ctx.destination);

	if (outcome === "success") {
		const freqs: readonly number[] = [784, 1047];
		for (let i = 0; i < freqs.length; i++) {
			const t = t0 + i * 0.09;
			const f = freqs[i];
			if (f === undefined) continue;
			const osc = ctx.createOscillator();
			const g = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(f, t);
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
			osc.connect(g);
			g.connect(master);
			osc.start(t);
			osc.stop(t + 0.32);
		}
	} else {
		const osc = ctx.createOscillator();
		const g = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(200, t0);
		osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.22);
		g.gain.setValueAtTime(0.0001, t0);
		g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015);
		g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
		osc.connect(g);
		g.connect(master);
		osc.start(t0);
		osc.stop(t0 + 0.42);
	}
}

function CopyButton({
	text,
	label = "Copy",
}: {
	text: string;
	label?: string;
}) {
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
			{state === "copied" ? "✓ Copied" : state === "error" ? "✗ Failed" : label}
		</button>
	);
}

function StatusPill({
	status,
}: {
	status: "idle" | "loading" | "success" | "error";
}) {
	if (status === "idle") return null;
	const styles = {
		loading: "border-blue-500/30 bg-blue-500/15 text-blue-300",
		success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
		error: "border-red-500/30 bg-red-500/15 text-red-300",
	};
	const labels = { loading: "running", success: "success", error: "error" };
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium text-xs ${styles[status]}`}
		>
			{status === "loading" ? (
				<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
			) : status === "success" ? (
				"✓"
			) : (
				"✕"
			)}
			{labels[status]}
		</span>
	);
}

export function DoubleProcessNewPostContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const first = enabledPaths[0];
			if (!first) return;
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", first.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [enabledPaths, isValidPath, pathname, router, searchParams]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [stream, setStream] = useState(true);
	const [allowAnglesFallback, setAllowAnglesFallback] = useState(false);
	const [postId, setPostId] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [jsonResult, setJsonResult] = useState<unknown>(null);
	const [sseEvents, setSseEvents] = useState<StreamEventView[]>([]);
	const [recentRunsStatus, setRecentRunsStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [recentRunsError, setRecentRunsError] = useState<string | null>(null);
	const [recentRunsResult, setRecentRunsResult] = useState<unknown>(null);
	const [recentPostIdFilter, setRecentPostIdFilter] = useState("");
	const [recentLimit, setRecentLimit] = useState("10");
	const workflowAudioCtxRef = useRef<AudioContext | null>(null);

	const primeWorkflowAudioForRun = () => {
		if (typeof window === "undefined") return;
		if (!workflowAudioCtxRef.current) {
			workflowAudioCtxRef.current = new AudioContext();
		}
		void workflowAudioCtxRef.current.resume();
	};

	const playRunFinishedSound = (outcome: "success" | "error") => {
		const ctx = workflowAudioCtxRef.current;
		if (!ctx) return;
		try {
			void ctx.resume().then(() => {
				playDoubleProcessOutcomeSound(ctx, outcome);
			});
		} catch {
			// ignore
		}
	};

	useEffect(() => {
		try {
			const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as { baseUrl?: unknown };
			if (typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
				setBaseUrl(parsed.baseUrl.trim());
			}
		} catch {
			// ignore
		}
	}, []);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
	const requestUrl = `${base}${ENDPOINT_PATH}`;
	const recentRunsUrl = `${base}${RECENT_RUNS_ENDPOINT_PATH}`;

	const requestBody = useMemo<Record<string, unknown>>(() => {
		const body: Record<string, unknown> = {
			stream,
			allow_angles_fallback: allowAnglesFallback,
		};
		const trimmedPostId = postId.trim();
		if (trimmedPostId) body.post_id = trimmedPostId;
		return body;
	}, [stream, allowAnglesFallback, postId]);

	const curlCommand = useMemo(
		() => buildCurl(requestUrl, requestBody),
		[requestUrl, requestBody],
	);

	const summaryData = useMemo(() => {
		if (jsonResult !== null) {
			const d = extractDataPayload(jsonResult);
			if (d) return d;
		}
		for (let i = sseEvents.length - 1; i >= 0; i--) {
			const ev = sseEvents[i];
			if (!ev || ev.event !== "result") continue;
			const d = extractDataPayload(ev.data);
			if (d) return d;
		}
		return null;
	}, [jsonResult, sseEvents]);

	const stageMatch = useMemo(() => {
		if (!isRecord(summaryData)) return null;
		const m = summaryData.stage_hash_match;
		if (!isRecord(m)) return null;
		return m as Record<string, unknown>;
	}, [summaryData]);

	const sseEventsJson = useMemo(
		() =>
			sseEvents.map((ev) => ({
				event: ev.event,
				receivedAt: ev.receivedAt,
				data: ev.data,
			})),
		[sseEvents],
	);

	const recentRunsData = useMemo(
		() => extractRecentRunsPayload(recentRunsResult),
		[recentRunsResult],
	);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const loadRecentRuns = useCallback(async () => {
		setRecentRunsStatus("loading");
		setRecentRunsError(null);

		const qs = new URLSearchParams();
		const trimmedPostId = recentPostIdFilter.trim();
		if (trimmedPostId) qs.set("post_id", trimmedPostId);

		const parsedLimit = Number.parseInt(recentLimit.trim(), 10);
		if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
			qs.set("limit", String(Math.min(parsedLimit, 100)));
		}

		const url =
			qs.size > 0 ? `${recentRunsUrl}?${qs.toString()}` : recentRunsUrl;

		try {
			const res = await fetch(url, { method: "GET" });
			const text = await res.text();
			const parsed = parseJsonOrText(text);
			setRecentRunsResult(parsed);

			if (!res.ok) {
				setRecentRunsStatus("error");
				setRecentRunsError(
					isRecord(parsed) && typeof parsed.error === "string"
						? parsed.error
						: `HTTP ${res.status}`,
				);
				return;
			}

			const extracted = extractRecentRunsPayload(parsed);
			if (!extracted) {
				setRecentRunsStatus("error");
				setRecentRunsError(
					"Response did not match GET /workflows/double-process-posts.",
				);
				return;
			}

			setRecentRunsStatus("success");
		} catch (e) {
			setRecentRunsStatus("error");
			setRecentRunsError(e instanceof Error ? e.message : String(e));
		}
	}, [recentLimit, recentPostIdFilter, recentRunsUrl]);

	useEffect(() => {
		void loadRecentRuns();
	}, [loadRecentRuns]);

	const run = async () => {
		primeWorkflowAudioForRun();
		setStatus("loading");
		setErrorMessage(null);
		setJsonResult(null);
		setSseEvents([]);

		const url = requestUrl;
		const body: Record<string, unknown> = { ...requestBody };

		try {
			if (stream) {
				const events: StreamEventView[] = [];
				const { ok } = await readSsePost(url, body, (ev) => {
					events.push(ev);
					setSseEvents([...events]);
				});
				setSseEvents(events);
				playRunFinishedSound(ok ? "success" : "error");
				setStatus(ok ? "success" : "error");
				if (!ok) {
					setErrorMessage(
						"SSE stream reported an error event or non-OK HTTP status.",
					);
				}
			} else {
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				const text = await res.text();
				const parsed = parseJsonOrText(text);
				setJsonResult(parsed);
				if (!res.ok) {
					playRunFinishedSound("error");
					setStatus("error");
					setErrorMessage(
						isRecord(parsed) && typeof parsed.error === "string"
							? parsed.error
							: `HTTP ${res.status}`,
					);
					return;
				}
				const env = parsed as { ok?: boolean };
				if (env && env.ok === false) {
					playRunFinishedSound("error");
					setStatus("error");
					setErrorMessage(
						isRecord(parsed) && typeof parsed.error === "string"
							? parsed.error
							: "API returned ok: false",
					);
					return;
				}
				playRunFinishedSound("success");
				setStatus("success");
			}
		} catch (e) {
			playRunFinishedSound("error");
			setStatus("error");
			setErrorMessage(e instanceof Error ? e.message : String(e));
		}
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

			<div className="min-w-0 flex-1 overflow-y-auto">
				{/* Hero header */}
				<div className="relative border-white/10 border-b bg-linear-to-br from-violet-900/20 via-transparent to-purple-900/10 px-8 py-8">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />
					<div className="relative mx-auto max-w-4xl">
						<div className="mb-1 flex items-center gap-2 font-semibold text-[11px] text-violet-400/80 uppercase tracking-widest">
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
							Workflow
						</div>
						<h1 className="font-bold text-3xl tracking-tight">
							Double-process new post
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-white/55 leading-relaxed">
							Runs{" "}
							<code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
								POST {ENDPOINT_PATH}
							</code>
							: picks one queued new post, then runs data-load → research →
							gen-angles twice—pass 1 on{" "}
							<strong className="text-white/70">main</strong> URL/terms/angles
							caches, pass 2 on an{" "}
							<strong className="text-white/70">isolated validation</strong>{" "}
							tree (default{" "}
							<code className="rounded bg-white/10 px-1 text-white/80">
								datasets/double_process_validation/
							</code>
							, or override with{" "}
							<code className="rounded bg-white/10 px-1 text-white/80">
								DOUBLE_PROCESS_VALIDATION_ROOT
							</code>
							). Both passes keep the same cache{" "}
							<em className="text-white/60">flags</em> enabled; pass 2 does not
							read pass 1’s files. Compares per-stage hashes between passes.
							Writes artifacts each time; pass 2 overwrites step outputs for
							that <code className="text-white/80">post_id</code>. Saved run
							reports can be listed via{" "}
							<code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
								GET {RECENT_RUNS_ENDPOINT_PATH}
							</code>
							.
						</p>
					</div>
				</div>

				<div className="mx-auto max-w-4xl space-y-5 px-8 py-8">
					{/* Warning */}
					<div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-amber-100/85 text-sm">
						<span className="mt-px shrink-0 text-amber-400">⚠</span>
						<span>
							<strong className="text-amber-200">Not read-only.</strong> This
							workflow persists each pass. Unlike validate-post, it writes
							artifacts to disk.
						</span>
					</div>

					{/* Request config card */}
					<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
						<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
							<div className="flex items-center gap-2">
								<span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-bold text-[10px] text-violet-300 uppercase tracking-wider">
									POST
								</span>
								<code className="text-sm text-white/65">{ENDPOINT_PATH}</code>
							</div>
							<CopyButton label="Copy as cURL" text={curlCommand} />
						</div>
						<div className="space-y-4 p-4">
							<div>
								<label
									className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
									htmlFor="double-process-api-base-url"
								>
									Base URL
								</label>
								<input
									className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
									id="double-process-api-base-url"
									onChange={(e) => setBaseUrl(e.target.value)}
									placeholder="http://localhost:5001/api/v1"
									value={baseUrl}
								/>
							</div>

							<div>
								<label
									className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
									htmlFor="double-process-post-id"
								>
									<code className="text-white/55">post_id</code> (optional)
								</label>
								<input
									className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
									id="double-process-post-id"
									onChange={(e) => setPostId(e.target.value)}
									placeholder="Leave empty to dequeue the next new post"
									value={postId}
								/>
								<p className="mt-1.5 text-[11px] text-white/40 leading-relaxed">
									Set to a specific post id to run double-process on that post
									instead of the queue.
								</p>
							</div>

							<div className="flex flex-wrap gap-5">
								<label className="flex cursor-pointer items-center gap-2.5 text-sm">
									<input
										checked={stream}
										className="h-4 w-4 accent-violet-500"
										onChange={(e) => setStream(e.target.checked)}
										type="checkbox"
									/>
									<span className="text-white/75">
										<code className="rounded bg-white/10 px-1 text-violet-300">
											stream
										</code>
										<span className="ml-1.5 text-[11px] text-white/40">
											SSE progress; default on
										</span>
									</span>
								</label>
								<label className="flex cursor-pointer items-center gap-2.5 text-sm">
									<input
										checked={allowAnglesFallback}
										className="h-4 w-4 accent-violet-500"
										onChange={(e) => setAllowAnglesFallback(e.target.checked)}
										type="checkbox"
									/>
									<span className="text-white/75">
										<code className="rounded bg-white/10 px-1 text-violet-300">
											allow_angles_fallback
										</code>
									</span>
								</label>
							</div>

							<div className="flex items-center gap-3">
								<button
									className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-sm text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={status === "loading"}
									onClick={() => void run()}
									type="button"
								>
									{status === "loading" ? (
										<>
											<span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
											Running…
										</>
									) : (
										"Run double-process"
									)}
								</button>
								<StatusPill status={status} />
							</div>
						</div>
					</section>

					{/* Error */}
					{errorMessage ? (
						<div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
							<span className="mt-px shrink-0 text-red-400">✕</span>
							{errorMessage}
						</div>
					) : null}

					<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
						<div className="flex items-center justify-between gap-3 border-white/8 border-b px-4 py-3">
							<div>
								<h2 className="font-semibold text-sm text-white/90">
									Recent saved runs
								</h2>
								<p className="mt-0.5 text-[11px] text-white/45">
									Reads{" "}
									<code className="text-white/70">
										GET {RECENT_RUNS_ENDPOINT_PATH}
									</code>{" "}
									from the current base URL.
								</p>
							</div>
							<div className="flex items-center gap-2">
								<StatusPill status={recentRunsStatus} />
								<button
									className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 py-2 font-semibold text-sm text-white/85 transition-colors hover:bg-white/12"
									onClick={() => void loadRecentRuns()}
									type="button"
								>
									Refresh
								</button>
							</div>
						</div>

						<div className="space-y-4 p-4">
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
								<div>
									<label
										className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
										htmlFor="double-process-recent-post-id"
									>
										Filter by <code className="text-white/55">post_id</code>
									</label>
									<input
										className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
										id="double-process-recent-post-id"
										onChange={(e) => setRecentPostIdFilter(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") void loadRecentRuns();
										}}
										placeholder="Optional exact post_id"
										value={recentPostIdFilter}
									/>
								</div>
								<div>
									<label
										className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
										htmlFor="double-process-recent-limit"
									>
										limit
									</label>
									<input
										className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
										id="double-process-recent-limit"
										inputMode="numeric"
										onChange={(e) => setRecentLimit(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") void loadRecentRuns();
										}}
										placeholder="10"
										value={recentLimit}
									/>
								</div>
								<div className="flex items-end">
									<button
										className="inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-sm text-white transition-colors hover:bg-violet-500"
										onClick={() => void loadRecentRuns()}
										type="button"
									>
										Load runs
									</button>
								</div>
							</div>

							{recentRunsError ? (
								<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200 text-sm">
									{recentRunsError}
								</div>
							) : null}

							{recentRunsData?.base_path ? (
								<div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
									<div className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
										Reports root
									</div>
									<div className="mt-1 break-all font-mono text-[11px] text-white/70">
										{recentRunsData.base_path}
									</div>
								</div>
							) : null}

							{recentRunsData ? (
								recentRunsData.runs.length > 0 ? (
									<div className="space-y-3">
										<p className="text-[11px] text-white/45">
											Showing {recentRunsData.runs.length}
											{typeof recentRunsData.count === "number"
												? ` saved run${recentRunsData.count === 1 ? "" : "s"}`
												: " saved runs"}
											, newest file first.
										</p>
										<div className="space-y-3">
											{recentRunsData.runs.map((run, index) => {
												const record = isRecord(run.record) ? run.record : null;
												const stageHashMatch = isRecord(
													record?.stage_hash_match,
												)
													? record.stage_hash_match
													: null;
												const postIdValue =
													typeof record?.post_id === "string"
														? record.post_id
														: "—";
												const sourceFileValue =
													typeof record?.source_file === "string"
														? record.source_file
														: "—";
												const succeededValue =
													typeof record?.succeeded === "boolean"
														? record.succeeded
														: null;
												return (
													<details
														className="rounded-xl border border-white/10 bg-black/20"
														key={`${String(run.report_path ?? "run")}-${index}`}
													>
														<summary className="cursor-pointer list-none px-4 py-3">
															<div className="flex flex-wrap items-start justify-between gap-3">
																<div className="min-w-0 flex-1">
																	<div className="flex flex-wrap items-center gap-2">
																		<span className="font-semibold text-sm text-white/90">
																			{postIdValue}
																		</span>
																		<span
																			className={`rounded-full border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide ${
																				succeededValue === true
																					? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
																					: succeededValue === false
																						? "border-red-500/30 bg-red-500/10 text-red-300"
																						: "border-white/10 bg-white/5 text-white/45"
																			}`}
																		>
																			{succeededValue === true
																				? "success"
																				: succeededValue === false
																					? "failed"
																					: "unknown"}
																		</span>
																	</div>
																	<div className="mt-1 text-[11px] text-white/45">
																		{sourceFileValue}
																		<span className="mx-1.5 text-white/20">
																			•
																		</span>
																		{formatFileMtime(run.file_mtime)}
																	</div>
																	{typeof run.report_path === "string" ? (
																		<div className="mt-1 break-all font-mono text-[11px] text-white/35">
																			{run.report_path}
																		</div>
																	) : null}
																</div>
																{stageHashMatch ? (
																	<div className="grid grid-cols-3 gap-1 text-center text-[10px]">
																		{(
																			[
																				"data_load",
																				"research",
																				"gen_angles",
																			] as const
																		).map((key) => {
																			const value = stageHashMatch[key];
																			return (
																				<div
																					className={`rounded-md border px-2 py-1 ${
																						value === true
																							? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
																							: value === false
																								? "border-amber-500/25 bg-amber-500/8 text-amber-300"
																								: "border-white/10 bg-white/5 text-white/40"
																					}`}
																					key={key}
																				>
																					<div>{key.replace(/_/g, " ")}</div>
																					<div className="mt-0.5 font-semibold">
																						{value === true
																							? "match"
																							: value === false
																								? "diff"
																								: "—"}
																					</div>
																				</div>
																			);
																		})}
																	</div>
																) : null}
															</div>
														</summary>
														<div className="border-white/8 border-t px-4 py-3">
															<pre className="max-h-96 overflow-auto whitespace-pre-wrap text-[11px] text-white/65">
																{JSON.stringify(run.record ?? null, null, 2)}
															</pre>
														</div>
													</details>
												);
											})}
										</div>
									</div>
								) : (
									<p className="text-sm text-white/45">
										No saved double-process reports matched this query.
									</p>
								)
							) : recentRunsStatus === "loading" ? (
								<p className="text-sm text-white/45">Loading saved runs…</p>
							) : null}

							{recentRunsResult !== null ? (
								<details className="rounded-lg border border-white/8 bg-black/20">
									<summary className="cursor-pointer px-3 py-2 text-white/55 text-xs transition-colors hover:text-white/80">
										Raw <code className="text-white/75">GET</code> response
									</summary>
									<pre className="max-h-96 overflow-auto whitespace-pre-wrap px-3 pt-1 pb-3 text-[11px] text-white/65">
										{JSON.stringify(recentRunsResult, null, 2)}
									</pre>
								</details>
							) : null}
						</div>
					</section>

					{/* Result summary */}
					{summaryData && isRecord(summaryData) ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
							<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
								<h2 className="font-semibold text-sm text-white/90">
									Result summary
								</h2>
								<CopyButton
									label="Copy JSON"
									text={JSON.stringify(summaryData, null, 2)}
								/>
							</div>
							<div className="space-y-4 p-4">
								<dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
									{(["post_id", "source_file", "mode"] as const).map((key) => (
										<div
											className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
											key={key}
										>
											<dt className="font-semibold text-[10px] text-white/40 uppercase tracking-wide">
												{key}
											</dt>
											<dd className="mt-1 break-all font-mono text-sm text-white/85">
												{String(summaryData[key] ?? "—")}
											</dd>
										</div>
									))}
								</dl>

								{stageMatch ? (
									<div>
										<h3 className="mb-2 font-semibold text-[10px] text-white/45 uppercase tracking-wide">
											Stage hash match
										</h3>
										<div className="grid grid-cols-3 gap-2">
											{(["data_load", "research", "gen_angles"] as const).map(
												(key) => {
													const val = stageMatch[key];
													return (
														<div
															className={`rounded-lg border px-3 py-3 text-center transition-colors ${
																val === true
																	? "border-emerald-500/30 bg-emerald-500/10"
																	: val === false
																		? "border-amber-500/30 bg-amber-500/10"
																		: "border-white/10 bg-black/20"
															}`}
															key={key}
														>
															<div className="mb-1 text-[10px] text-white/45 uppercase tracking-wide">
																{key.replace(/_/g, " ")}
															</div>
															<div
																className={`font-bold text-xl ${
																	val === true
																		? "text-emerald-400"
																		: val === false
																			? "text-amber-300"
																			: "text-white/50"
																}`}
															>
																{val === true ? "✓" : val === false ? "✗" : "—"}
															</div>
															<div className="mt-0.5 text-[10px] text-white/40">
																{String(val ?? "n/a")}
															</div>
														</div>
													);
												},
											)}
										</div>
									</div>
								) : null}

								<details className="rounded-lg border border-white/8 bg-black/20">
									<summary className="cursor-pointer px-3 py-2 text-white/55 text-xs transition-colors hover:text-white/80">
										Full <code className="text-white/75">data</code> object
									</summary>
									<pre className="max-h-96 overflow-auto whitespace-pre-wrap px-3 pt-1 pb-3 text-[11px] text-white/65">
										{JSON.stringify(summaryData, null, 2)}
									</pre>
								</details>
							</div>
						</section>
					) : null}

					{/* SSE: progress UI + raw JSON */}
					{stream && sseEvents.length > 0 ? (
						<DoubleProcessSsePanel
							events={sseEvents}
							sseEventsJson={sseEventsJson}
						/>
					) : null}

					{/* JSON response (non-stream) */}
					{!stream && jsonResult !== null ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
							<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
								<h2 className="font-semibold text-sm text-white/90">
									Response
								</h2>
								<CopyButton
									label="Copy JSON"
									text={JSON.stringify(jsonResult, null, 2)}
								/>
							</div>
							<pre className="max-h-96 overflow-auto whitespace-pre-wrap p-4 text-[11px] text-white/70">
								{JSON.stringify(jsonResult, null, 2)}
							</pre>
						</section>
					) : null}
				</div>
			</div>
		</div>
	);
}
