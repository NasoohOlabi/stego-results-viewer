"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { renderInspectorValue } from "~/app/admin-api/inspector-response";
import {
	ADMIN_API_STORAGE_KEY,
	type StreamEventView,
} from "~/app/admin-api/types";
import { PrepQuotaStructuredResponse } from "~/app/admin-api/prep-quota-structured-response";
import {
	buildPrepQuotaStructuredModel,
	extractPrepQuotaFromAdminResponse,
	parseJsonOrText,
	parseSseEvent,
	parseStegoPayloadInput,
} from "~/app/admin-api/utils";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

const ENDPOINT_PATH = "/workflows/prep-until-google-quota-then-stego";

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
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
			{state === "copied" ? "Copied" : state === "error" ? "Failed" : label}
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
			) : null}
			{labels[status]}
		</span>
	);
}

export function PrepUntilGoogleQuotaThenStegoContent() {
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
	const [tag, setTag] = useState("version_42");
	const [batchCount, setBatchCount] = useState("1");
	const [batchSize, setBatchSize] = useState("5");
	const [payloadInput, setPayloadInput] = useState("");
	const [stream, setStream] = useState(true);
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
			// ignore malformed storage
		}
	}, []);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
	const requestUrl = `${base}${ENDPOINT_PATH}`;

	const requestBody = useMemo<Record<string, unknown> | null>(() => {
		const trimmedTag = tag.trim();
		if (!trimmedTag) return null;
		const parsedBatchCount =
			batchCount.trim() === "" ? 1 : Number.parseInt(batchCount.trim(), 10);
		const parsedBatchSize =
			batchSize.trim() === "" ? 5 : Number.parseInt(batchSize.trim(), 10);
		if (!Number.isInteger(parsedBatchCount) || parsedBatchCount < 1) return null;
		if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 1) return null;
		const body: Record<string, unknown> = {
			tag: trimmedTag,
			batch_count: parsedBatchCount,
			batch_size: parsedBatchSize,
			stream,
		};
		const payload = parseStegoPayloadInput(payloadInput);
		if (payload !== undefined) body.payload = payload;
		return body;
	}, [tag, batchCount, batchSize, payloadInput, stream]);

	const curlCommand = useMemo(
		() => buildCurl(requestUrl, requestBody ?? { tag: tag.trim() || "" }),
		[requestUrl, requestBody, tag],
	);

	const sseModel = useMemo(
		() => (sseEvents.length > 0 ? buildPrepQuotaStructuredModel(sseEvents) : null),
		[sseEvents],
	);
	const syncModel = useMemo(
		() => (jsonResult !== null ? extractPrepQuotaFromAdminResponse(jsonResult) : null),
		[jsonResult],
	);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const run = async () => {
		const trimmedTag = tag.trim();
		if (!trimmedTag) {
			setStatus("error");
			setErrorMessage("tag is required");
			return;
		}
		const body = requestBody;
		if (!body) {
			setStatus("error");
			setErrorMessage("batch_count and batch_size must be integers >= 1");
			return;
		}

		setStatus("loading");
		setErrorMessage(null);
		setJsonResult(null);
		setSseEvents([]);

		try {
			if (stream) {
				const events: StreamEventView[] = [];
				const { ok } = await readSsePost(requestUrl, body, (event) => {
					events.push(event);
					setSseEvents([...events]);
				});
				setSseEvents(events);
				setStatus(ok ? "success" : "error");
				if (!ok) {
					const lastError = [...events]
						.reverse()
						.find((event) => event.event === "error");
					if (lastError && isRecord(lastError.data)) {
						setErrorMessage(
							typeof lastError.data.message === "string"
								? lastError.data.message
								: "Workflow execution failed",
						);
					} else {
						setErrorMessage("SSE stream reported an error.");
					}
				}
				return;
			}

			const res = await fetch(requestUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const text = await res.text();
			const parsed = parseJsonOrText(text);
			setJsonResult(parsed);

			if (!res.ok) {
				setStatus("error");
				if (isRecord(parsed) && typeof parsed.error === "string") {
					setErrorMessage(parsed.error);
				} else if (
					isRecord(parsed) &&
					typeof parsed.message === "string"
				) {
					setErrorMessage(parsed.message);
				} else {
					setErrorMessage(`HTTP ${res.status}`);
				}
				return;
			}

			setStatus("success");
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error ? error.message : "Request failed",
			);
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
				<div className="relative border-white/10 border-b bg-linear-to-br from-cyan-900/20 via-transparent to-violet-900/10 px-8 py-8">
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
					<div className="relative mx-auto max-w-5xl">
						<div className="mb-1 flex items-center gap-2 font-semibold text-[11px] text-cyan-400/80 uppercase tracking-widest">
							<span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
							Workflow
						</div>
						<h1 className="font-bold text-3xl tracking-tight">
							Prep Until Google Quota Then Stego
						</h1>
						<p className="mt-2 max-w-3xl text-sm text-white/55 leading-relaxed">
							Dedicated page for{" "}
							<code className="rounded bg-white/10 px-1 py-0.5 text-white/85">
								POST {ENDPOINT_PATH}
							</code>
							. It runs prep batches of{" "}
							<code className="text-white/80">data-load → research → gen-angles</code>,
							treats Google quota as the handoff signal, and then switches into
							recursive stego processing for a required{" "}
							<code className="text-white/80">tag</code>.
						</p>
					</div>
				</div>

				<div className="mx-auto max-w-5xl space-y-5 px-8 py-8">
					<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
						<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
							<div className="flex items-center gap-2">
								<span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-[10px] text-cyan-300 uppercase tracking-wider">
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
									htmlFor="prep-quota-base-url"
								>
									Base URL
								</label>
								<input
									className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
									id="prep-quota-base-url"
									onChange={(e) => setBaseUrl(e.target.value)}
									placeholder="http://localhost:5001/api/v1"
									value={baseUrl}
								/>
							</div>

							<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
								<div className="md:col-span-1">
									<label
										className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
										htmlFor="prep-quota-tag"
									>
										tag
									</label>
									<input
										className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
										id="prep-quota-tag"
										onChange={(e) => setTag(e.target.value)}
										placeholder="version_42"
										value={tag}
									/>
								</div>
								<div>
									<label
										className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
										htmlFor="prep-quota-batch-count"
									>
										batch_count
									</label>
									<input
										className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
										id="prep-quota-batch-count"
										inputMode="numeric"
										onChange={(e) => setBatchCount(e.target.value)}
										placeholder="1"
										value={batchCount}
									/>
								</div>
								<div>
									<label
										className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
										htmlFor="prep-quota-batch-size"
									>
										batch_size
									</label>
									<input
										className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/85 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
										id="prep-quota-batch-size"
										inputMode="numeric"
										onChange={(e) => setBatchSize(e.target.value)}
										placeholder="5"
										value={batchSize}
									/>
								</div>
							</div>

							<div>
								<label
									className="mb-1.5 block font-semibold text-[10px] text-white/45 uppercase tracking-wide"
									htmlFor="prep-quota-payload"
								>
									payload (optional)
								</label>
								<textarea
									className="min-h-24 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white/85 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
									id="prep-quota-payload"
									onChange={(e) => setPayloadInput(e.target.value)}
									placeholder='hello world or {"campaign":"sample"}'
									value={payloadInput}
								/>
							</div>

							<div className="flex flex-wrap gap-5">
								<label className="flex cursor-pointer items-center gap-2.5 text-sm">
									<input
										checked={stream}
										className="h-4 w-4 accent-cyan-500"
										onChange={(e) => setStream(e.target.checked)}
										type="checkbox"
									/>
									<span className="text-white/75">
										<code className="rounded bg-white/10 px-1 text-cyan-300">
											stream
										</code>
										<span className="ml-1.5 text-[11px] text-white/40">
											milestone SSE
										</span>
									</span>
								</label>
							</div>

							<div className="flex items-center gap-3">
								<button
									className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-semibold text-sm text-white shadow-lg shadow-cyan-900/30 transition-all hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={status === "loading"}
									onClick={() => void run()}
									type="button"
								>
									{status === "loading" ? "Running..." : "Run workflow"}
								</button>
								<StatusPill status={status} />
							</div>
						</div>
					</section>

					{errorMessage ? (
						<div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
							{errorMessage}
						</div>
					) : null}

					{sseModel ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3 p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<h2 className="font-semibold text-sm text-white/90">
									Structured result
								</h2>
								<CopyButton
									label="Copy events JSON"
									text={JSON.stringify(
										sseEvents.map((event) => ({
											event: event.event,
											receivedAt: event.receivedAt,
											data: event.data,
										})),
										null,
										2,
									)}
								/>
							</div>
							<PrepQuotaStructuredResponse
								loading={status === "loading"}
								model={sseModel}
							/>
						</section>
					) : null}

					{syncModel ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3 p-4">
							<div className="mb-3 flex items-center justify-between gap-3">
								<h2 className="font-semibold text-sm text-white/90">
									Structured result
								</h2>
								<CopyButton
									label="Copy JSON"
									text={JSON.stringify(jsonResult, null, 2)}
								/>
							</div>
							<PrepQuotaStructuredResponse loading={false} model={syncModel} />
						</section>
					) : null}

					{stream && sseEvents.length > 0 ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
							<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
								<h2 className="font-semibold text-sm text-white/90">
									Event stream
								</h2>
								<span className="rounded bg-white/10 px-2 py-1 text-[11px] text-white/65">
									{sseEvents.length} events
								</span>
							</div>
							<div className="space-y-3 p-4">
								{sseEvents
									.slice()
									.reverse()
									.map((event, index) => (
										<div
											className="rounded-lg border border-white/10 bg-black/20 p-3"
											key={`${event.receivedAt}-${index}`}
										>
											<div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
												<span className="rounded bg-cyan-500/20 px-2 py-0.5 font-semibold text-cyan-200">
													{event.event}
												</span>
												{isRecord(event.data) &&
												typeof event.data.event === "string" ? (
													<span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/65">
														{event.data.event}
													</span>
												) : null}
												<span className="text-white/45">
													{new Date(event.receivedAt).toLocaleTimeString()}
												</span>
											</div>
											{renderInspectorValue(event.data)}
										</div>
									))}
							</div>
						</section>
					) : null}

					{!stream && jsonResult !== null ? (
						<section className="overflow-hidden rounded-xl border border-white/10 bg-white/3">
							<div className="flex items-center justify-between border-white/8 border-b px-4 py-3">
								<h2 className="font-semibold text-sm text-white/90">
									Raw response
								</h2>
								<CopyButton
									label="Copy JSON"
									text={JSON.stringify(jsonResult, null, 2)}
								/>
							</div>
							<div className="p-4">{renderInspectorValue(jsonResult)}</div>
						</section>
					) : null}
				</div>
			</div>
		</div>
	);
}
