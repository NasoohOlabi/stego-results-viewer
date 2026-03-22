"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import {
	ADMIN_API_STORAGE_KEY,
	type StreamEventView
} from "~/app/admin-api/types";
import { parseJsonOrText, parseSseEvent } from "~/app/admin-api/utils";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

const ENDPOINT_PATH = "/workflows/double-process-new-post";

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Extract `data` from API success envelope or nested SSE result payload. */
function extractDataPayload(payload: unknown): unknown {
	if (!isRecord(payload)) return null;
	if (payload.ok === true && "data" in payload) return payload.data;
	if (payload.mode === "double_process_new_post") return payload;
	const inner = payload.data;
	if (isRecord(inner) && inner.mode === "double_process_new_post") return inner;
	return null;
}

async function readSsePost(
	url: string,
	body: Record<string, unknown>,
	onEvent: (event: StreamEventView) => void
): Promise<{ ok: boolean; sawError: boolean }> {
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body)
	});
	const contentType = res.headers.get("content-type") ?? "";
	if (!contentType.includes("text/event-stream")) {
		throw new Error(
			`Expected SSE (text/event-stream), got ${contentType || "unknown"}`
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
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [enabledPaths, isValidPath, pathname, router, searchParams]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath }
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [stream, setStream] = useState(true);
	const [allowAnglesFallback, setAllowAnglesFallback] = useState(false);
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [jsonResult, setJsonResult] = useState<unknown>(null);
	const [sseEvents, setSseEvents] = useState<StreamEventView[]>([]);

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

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const run = async () => {
		setStatus("loading");
		setErrorMessage(null);
		setJsonResult(null);
		setSseEvents([]);

		const body: Record<string, unknown> = {
			stream,
			allow_angles_fallback: allowAnglesFallback
		};
		const url = `${base}${ENDPOINT_PATH}`;

		try {
			if (stream) {
				const events: StreamEventView[] = [];
				const { ok } = await readSsePost(url, body, (ev) => {
					events.push(ev);
					setSseEvents([...events]);
				});
				setSseEvents(events);
				setStatus(ok ? "success" : "error");
				if (!ok) {
					setErrorMessage(
						"SSE stream reported an error event or non-OK HTTP status."
					);
				}
			} else {
				const res = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body)
				});
				const text = await res.text();
				const parsed = parseJsonOrText(text);
				setJsonResult(parsed);
				if (!res.ok) {
					setStatus("error");
					setErrorMessage(
						isRecord(parsed) && typeof parsed.error === "string"
							? parsed.error
							: `HTTP ${res.status}`
					);
					return;
				}
				const env = parsed as { ok?: boolean };
				if (env && env.ok === false) {
					setStatus("error");
					setErrorMessage(
						isRecord(parsed) && typeof parsed.error === "string"
							? parsed.error
							: "API returned ok: false"
					);
					return;
				}
				setStatus("success");
			}
		} catch (e) {
			setStatus("error");
			setErrorMessage(e instanceof Error ? e.message : String(e));
		}
	};

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
			<div className="min-w-0 flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-4xl space-y-6">
					<header className="space-y-2">
						<h1 className="text-3xl font-bold">Double-process new post</h1>
						<p className="text-sm text-white/55">
							Runs <code>POST {ENDPOINT_PATH}</code>: pick one queued new post,
							then run data-load → research → gen-angles twice (cached pass vs
							cacheless pass) and compare stage hashes. Writes artifacts to disk;
							the second pass overwrites step outputs for that{" "}
							<code className="text-white/80">post_id</code>.
						</p>
					</header>

					<section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
						<strong className="text-amber-200">Note:</strong> This workflow
						persists each pass. Unlike validate-post, it is not read-only.
					</section>

					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
						<input
							value={baseUrl}
							onChange={(e) => setBaseUrl(e.target.value)}
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="http://localhost:5001/api/v1"
							aria-label="API base URL"
						/>
						<div className="flex flex-wrap gap-4 text-sm text-white/80">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={stream}
									onChange={(e) => setStream(e.target.checked)}
								/>
								<span>
									<code className="text-white/90">stream</code> (SSE progress;
									default on)
								</span>
							</label>
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={allowAnglesFallback}
									onChange={(e) => setAllowAnglesFallback(e.target.checked)}
								/>
								<span>
									<code className="text-white/90">allow_angles_fallback</code>
								</span>
							</label>
						</div>
						<button
							type="button"
							onClick={() => void run()}
							disabled={status === "loading"}
							className="rounded-md bg-violet-500/25 px-4 py-2 text-sm font-medium hover:bg-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{status === "loading" ? "Running…" : "Run double-process"}
						</button>
						<div className="text-xs text-white/50">
							Status:{" "}
							<span className="font-medium text-white/80">{status}</span>
						</div>
						{errorMessage ? (
							<div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
								{errorMessage}
							</div>
						) : null}
					</section>

					{summaryData && isRecord(summaryData) ? (
						<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
							<h2 className="text-lg font-semibold text-white/95">Result summary</h2>
							<dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
								<div>
									<dt className="text-white/45">post_id</dt>
									<dd className="font-mono text-white/90">
										{String(summaryData.post_id ?? "—")}
									</dd>
								</div>
								<div>
									<dt className="text-white/45">source_file</dt>
									<dd className="font-mono text-white/90">
										{String(summaryData.source_file ?? "—")}
									</dd>
								</div>
								<div>
									<dt className="text-white/45">mode</dt>
									<dd className="font-mono text-white/90">
										{String(summaryData.mode ?? "—")}
									</dd>
								</div>
							</dl>
							{stageMatch ? (
								<div>
									<h3 className="mb-2 text-sm font-medium text-white/70">
										stage_hash_match
									</h3>
									<div className="grid grid-cols-3 gap-2 text-center text-sm">
										{(["data_load", "research", "gen_angles"] as const).map(
											(key) => (
												<div
													key={key}
													className="rounded-md border border-white/10 bg-black/20 px-2 py-2"
												>
													<div className="text-[10px] uppercase tracking-wide text-white/45">
														{key}
													</div>
													<div
														className={
															stageMatch[key] === true
																? "text-emerald-400"
																: stageMatch[key] === false
																	? "text-amber-300"
																	: "text-white/50"
														}
													>
														{String(stageMatch[key] ?? "—")}
													</div>
												</div>
											)
										)}
									</div>
								</div>
							) : null}
							<details className="rounded-md border border-white/10 bg-black/20 p-3">
								<summary className="cursor-pointer text-xs text-white/70">
									Full <code className="text-white/85">data</code> object
								</summary>
								<pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-[11px] text-white/70">
									{JSON.stringify(summaryData, null, 2)}
								</pre>
							</details>
						</section>
					) : null}

					{stream && sseEvents.length > 0 ? (
						<section className="rounded-xl border border-white/10 bg-white/5 p-4">
							<h2 className="mb-2 text-lg font-semibold text-white/95">
								SSE events
							</h2>
							<div className="max-h-80 overflow-y-auto rounded-md border border-white/10 bg-black/30 p-2 font-mono text-[11px] text-white/70">
								{sseEvents.map((ev, i) => (
									<div
										key={`${ev.receivedAt}-${i}`}
										className="border-b border-white/5 py-1 last:border-0"
									>
										<span className="text-violet-300/90">{ev.event}</span>
										{" · "}
										<span className="text-white/45">{ev.receivedAt}</span>
										<pre className="mt-0.5 whitespace-pre-wrap break-all text-white/60">
											{typeof ev.data === "string"
												? ev.data
												: JSON.stringify(ev.data, null, 2)}
										</pre>
									</div>
								))}
							</div>
						</section>
					) : null}

					{!stream && jsonResult !== null ? (
						<section className="rounded-xl border border-white/10 bg-white/5 p-4">
							<h2 className="mb-2 text-lg font-semibold text-white/95">
								Response
							</h2>
							<pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-3 text-[11px] text-white/70">
								{JSON.stringify(jsonResult, null, 2)}
							</pre>
						</section>
					) : null}
				</div>
			</div>
		</div>
	);
}
