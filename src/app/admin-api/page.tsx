"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type ReactNode } from "react";
import { ObjectInspector } from "react-inspector";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type WorkflowRunMode = "dedicated" | "generic";

const ARTIFACT_STEP_OPTIONS = [
	"filter-url-unresolved",
	"filter-researched",
	"angles-step",
	"final-step"
] as const;
type ArtifactStep = (typeof ARTIFACT_STEP_OPTIONS)[number];

const DEFAULT_WORKFLOW_COMMANDS = [
	"data-load",
	"research",
	"gen-angles",
	"stego",
	"decode",
	"gen-terms",
	"full"
];

interface ApiResponseView {
	status: "idle" | "loading" | "success" | "error";
	endpoint: string;
	method: HttpMethod;
	request: {
		url: string;
		path: string;
		query: Record<string, string | number | boolean | undefined> | null;
		body: unknown;
	} | null;
	data: unknown;
}

interface StreamEventView {
	event: string;
	data: unknown;
	rawData: string;
	id?: string;
	retry?: number;
	receivedAt: string;
}

interface StreamEventDisplayItem {
	type: "event" | "heartbeat-group";
	event?: StreamEventView;
	heartbeats?: StreamEventView[];
}

type ApiToolId =
	| "service"
	| "cache-admin"
	| "state-filesystem"
	| "artifacts-workflows"
	| "kv-store"
	| "search-tools";

interface ApiWorkspaceTab {
	id: string;
	apiToolId: ApiToolId;
	response: ApiResponseView;
}

const API_TOOL_OPTIONS: Array<{ id: ApiToolId; label: string }> = [
	{ id: "service", label: "Service" },
	{ id: "cache-admin", label: "Cache Admin" },
	{ id: "state-filesystem", label: "State Filesystem" },
	{ id: "artifacts-workflows", label: "Artifacts + Workflows" },
	{ id: "kv-store", label: "KV Store" },
	{ id: "search-tools", label: "Search Tools" }
];

function getApiToolLabel(apiToolId: ApiToolId): string {
	return (
		API_TOOL_OPTIONS.find((option) => option.id === apiToolId)?.label ?? "API"
	);
}

function createIdleResponse(): ApiResponseView {
	return {
		status: "idle",
		endpoint: "",
		method: "GET",
		request: null,
		data: null
	};
}

function toPrettyJson(value: unknown): string {
	if (typeof value === "string") {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
	return JSON.stringify(value, null, 2);
}

function parseJsonOrText(value: string): unknown {
	if (!value) return null;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseStructuredJsonString(value: string): unknown {
	const trimmed = value.trim();
	if (!trimmed) return value;

	const looksStructured =
		(trimmed.startsWith("{") && trimmed.endsWith("}")) ||
		(trimmed.startsWith("[") && trimmed.endsWith("]")) ||
		(trimmed.startsWith('"{') && trimmed.endsWith('}"')) ||
		(trimmed.startsWith('"[') && trimmed.endsWith(']"'));

	if (!looksStructured) return value;

	try {
		return JSON.parse(trimmed);
	} catch {
		return value;
	}
}

function normalizeForInspector(value: unknown, depth = 0): unknown {
	if (depth > 8) return value;

	if (typeof value === "string") {
		const parsed = parseStructuredJsonString(value);
		return parsed === value
			? value
			: normalizeForInspector(parsed, depth + 1);
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForInspector(item, depth + 1));
	}

	if (isRecord(value)) {
		const normalizedEntries = Object.entries(value).map(
			([key, entryValue]) => [
				key,
				normalizeForInspector(entryValue, depth + 1)
			]
		);
		return Object.fromEntries(normalizedEntries);
	}

	return value;
}

function renderInspectorValue(value: unknown): ReactNode {
	const normalized = normalizeForInspector(value);
	if (normalized === null || normalized === undefined) {
		return <span className="text-white/60">No response yet.</span>;
	}

	if (typeof normalized !== "object") {
		return (
			<pre className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-white/80">
				{String(normalized)}
			</pre>
		);
	}

	return (
		<div className="overflow-auto text-xs leading-relaxed">
			<ObjectInspector
				data={normalized}
				theme="chromeDark"
				expandLevel={2}
			/>
		</div>
	);
}

function isSsePayload(value: unknown): value is { events: StreamEventView[] } {
	return isRecord(value) && Array.isArray(value.events);
}

function isHeartbeatEvent(event: StreamEventView): boolean {
	if (event.event === "heartbeat") return true;
	if (!isRecord(event.data)) return false;
	return event.data.event === "heartbeat";
}

function getHeartbeatElapsedMs(event: StreamEventView): number | null {
	if (!isRecord(event.data)) return null;
	const elapsed = event.data.elapsed_ms;
	return typeof elapsed === "number" && Number.isFinite(elapsed)
		? elapsed
		: null;
}

function buildStreamEventItems(
	events: StreamEventView[],
	options: { includeHeartbeats: boolean; searchText: string }
): StreamEventDisplayItem[] {
	const normalizedSearch = options.searchText.trim().toLowerCase();
	const toSearchBlob = (event: StreamEventView) =>
		`${event.event} ${event.rawData} ${toPrettyJson(event.data)}`.toLowerCase();
	const bySearch = (event: StreamEventView) =>
		!normalizedSearch || toSearchBlob(event).includes(normalizedSearch);

	const filtered = events.filter((event) => {
		if (!options.includeHeartbeats && isHeartbeatEvent(event)) return false;
		return bySearch(event);
	});

	const items: StreamEventDisplayItem[] = [];
	let heartbeatBuffer: StreamEventView[] = [];

	for (const event of filtered) {
		if (isHeartbeatEvent(event)) {
			heartbeatBuffer.push(event);
			continue;
		}
		if (heartbeatBuffer.length > 0) {
			items.push({ type: "heartbeat-group", heartbeats: heartbeatBuffer });
			heartbeatBuffer = [];
		}
		items.push({ type: "event", event });
	}

	if (heartbeatBuffer.length > 0) {
		items.push({ type: "heartbeat-group", heartbeats: heartbeatBuffer });
	}

	return items;
}

function parseSseEvent(rawBlock: string): StreamEventView | null {
	const lines = rawBlock.split(/\n/);
	const dataLines: string[] = [];
	let event = "message";
	let id: string | undefined;
	let retry: number | undefined;

	for (const line of lines) {
		if (!line || line.startsWith(":")) continue;
		const colonIdx = line.indexOf(":");
		const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
		let value = colonIdx === -1 ? "" : line.slice(colonIdx + 1);
		if (value.startsWith(" ")) value = value.slice(1);

		switch (field) {
			case "event":
				event = value || "message";
				break;
			case "data":
				dataLines.push(value);
				break;
			case "id":
				id = value;
				break;
			case "retry": {
				const parsed = Number.parseInt(value, 10);
				if (Number.isFinite(parsed)) retry = parsed;
				break;
			}
			default:
				break;
		}
	}

	const rawData = dataLines.join("\n");
	if (!rawData && !id && retry === undefined && event === "message")
		return null;

	return {
		event,
		id,
		retry,
		rawData,
		data: parseJsonOrText(rawData),
		receivedAt: new Date().toISOString()
	};
}

function getWorkflowTemplate(command: string): string {
	switch (command) {
		case "data-load":
			return '{\n  "count": 3,\n  "offset": 0,\n  "batch_size": 10\n}';
		case "research":
		case "gen-angles":
			return '{\n  "count": 3,\n  "offset": 0\n}';
		case "stego":
			return '{\n  "payload": "hello world",\n  "tag": "manual"\n}';
		case "decode":
			return '{\n  "stego_text": "sample stego text",\n  "angles": [1, 2, 3],\n  "few_shots": []\n}';
		case "gen-terms":
			return '{\n  "post_title": "Sample title",\n  "post_text": "Sample text"\n}';
		case "full":
			return '{\n  "start_step": "filter-url-unresolved",\n  "count": 3\n}';
		default:
			return '{\n  "count": 3\n}';
	}
}

function extractWorkflowCommands(payload: unknown): string[] {
	const asRecord = (value: unknown): Record<string, unknown> | null => {
		if (!value || typeof value !== "object" || Array.isArray(value))
			return null;
		return value as Record<string, unknown>;
	};
	const toStringArray = (value: unknown): string[] => {
		if (!Array.isArray(value)) return [];
		return value.filter((item): item is string => typeof item === "string");
	};

	const root = asRecord(payload);
	const data = root ? asRecord(root.data) : null;
	const keys = ["commands", "pipelines", "workflows"];

	for (const source of [root, data]) {
		if (!source) continue;
		for (const key of keys) {
			const parsed = toStringArray(source[key]);
			if (parsed.length > 0) return [...new Set(parsed)];
		}
	}

	const directArray = toStringArray(payload);
	if (directArray.length > 0) return [...new Set(directArray)];

	return [];
}

function DashboardAdminContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath }
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [tabs, setTabs] = useState<ApiWorkspaceTab[]>([
		{
			id: "tab-1",
			apiToolId: "service",
			response: createIdleResponse()
		}
	]);
	const [activeTabId, setActiveTabId] = useState("tab-1");

	const [cacheTarget, setCacheTarget] = useState("all");
	const [fsPath, setFsPath] = useState("metrics");
	const [fsRecursive, setFsRecursive] = useState(false);
	const [fsLimit, setFsLimit] = useState("100");
	const [jsonReadPath, setJsonReadPath] = useState(
		"metrics/divergence_metrics_latest.json"
	);
	const [jsonWritePath, setJsonWritePath] = useState(
		"metrics/manual_write.json"
	);
	const [jsonWriteBody, setJsonWriteBody] = useState(
		'{\n  "hello": "world"\n}'
	);
	const [artifactStep, setArtifactStep] = useState<ArtifactStep>(
		"filter-url-unresolved"
	);
	const [artifactFilename, setArtifactFilename] = useState("example.json");
	const [artifactPostFile, setArtifactPostFile] = useState("");
	const [artifactTag, setArtifactTag] = useState("");
	const [workflowBody, setWorkflowBody] = useState(
		getWorkflowTemplate("data-load")
	);
	const [workflowName, setWorkflowName] = useState("data-load");
	const [workflowRunMode, setWorkflowRunMode] =
		useState<WorkflowRunMode>("dedicated");
	const [workflowCommands, setWorkflowCommands] = useState<string[]>(
		DEFAULT_WORKFLOW_COMMANDS
	);
	const [kvKey, setKvKey] = useState("test_key");
	const [kvValue, setKvValue] = useState(
		'{\n  "value": {\n    "ok": true\n  }\n}'
	);
	const [kvLimit, setKvLimit] = useState("20");
	const [kvOffset, setKvOffset] = useState("0");
	const [searchQuery, setSearchQuery] = useState("steganography");
	const [searchProvider, setSearchProvider] = useState("bing");
	const [copyErrorReportState, setCopyErrorReportState] = useState<
		"idle" | "copied" | "failed"
	>("idle");
	const [showHeartbeatEvents, setShowHeartbeatEvents] = useState(false);
	const [streamSearchText, setStreamSearchText] = useState("");

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
	const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
	const activeTabResponse = activeTab?.response ?? createIdleResponse();
	const ssePayload = isSsePayload(activeTabResponse.data)
		? activeTabResponse.data
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

	const updateTabResponse = (tabId: string, response: ApiResponseView) => {
		setTabs((prevTabs) =>
			prevTabs.map((tab) => (tab.id === tabId ? { ...tab, response } : tab))
		);
	};

	const callApi = async (
		method: HttpMethod,
		path: string,
		query?: Record<string, string | number | boolean | undefined>,
		body?: unknown,
		tabId = activeTabId
	): Promise<{ ok: boolean; payload: unknown } | null> => {
		const qs = new URLSearchParams();
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined && value !== "") qs.set(key, String(value));
			}
		}

		const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
		const requestPayload = {
			url,
			path,
			query: query ?? null,
			body: body ?? null
		};
		setCopyErrorReportState("idle");
		updateTabResponse(tabId, {
			status: "loading",
			endpoint: url,
			method,
			request: requestPayload,
			data: null
		});

		try {
			const res = await fetch(url, {
				method,
				headers: {
					"Content-Type": "application/json"
				},
				body: body === undefined ? undefined : JSON.stringify(body)
			});
			const contentType = res.headers.get("content-type") ?? "";

			if (contentType.includes("text/event-stream")) {
				const stream = res.body;
				if (!stream) {
					updateTabResponse(tabId, {
						status: "error",
						endpoint: url,
						method,
						request: requestPayload,
						data: {
							httpStatus: res.status,
							httpStatusText: res.statusText,
							message: "SSE response did not include a readable body."
						}
					});
					return { ok: false, payload: null };
				}

				const reader = stream.getReader();
				const decoder = new TextDecoder();
				const events: StreamEventView[] = [];
				const maxEvents = 300;
				let buffer = "";
				let sawEventError = false;

				const pushEvent = (event: StreamEventView) => {
					if (events.length >= maxEvents) events.shift();
					events.push(event);
					if (event.event === "error") sawEventError = true;
					updateTabResponse(tabId, {
						status: sawEventError ? "error" : "loading",
						endpoint: url,
						method,
						request: requestPayload,
						data: {
							httpStatus: res.status,
							httpStatusText: res.statusText,
							contentType,
							streaming: true,
							complete: false,
							eventCount: events.length,
							lastEvent: event,
							events
						}
					});
				};

				const flushBufferEvents = () => {
					let separatorIndex = buffer.indexOf("\n\n");
					while (separatorIndex >= 0) {
						const rawBlock = buffer
							.slice(0, separatorIndex)
							.replace(/\r/g, "");
						buffer = buffer.slice(separatorIndex + 2);
						const parsed = parseSseEvent(rawBlock);
						if (parsed) pushEvent(parsed);
						separatorIndex = buffer.indexOf("\n\n");
					}
				};

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					flushBufferEvents();
				}

				buffer += decoder.decode();
				buffer = buffer.replace(/\r/g, "");
				if (buffer.trim()) {
					const parsed = parseSseEvent(buffer);
					if (parsed) pushEvent(parsed);
				}

				const finalPayload = {
					httpStatus: res.status,
					httpStatusText: res.statusText,
					contentType,
					streaming: true,
					complete: true,
					eventCount: events.length,
					events,
					finishedAt: new Date().toISOString()
				};
				const success = res.ok && !sawEventError;
				updateTabResponse(tabId, {
					status: success ? "success" : "error",
					endpoint: url,
					method,
					request: requestPayload,
					data: finalPayload
				});
				return {
					ok: success,
					payload: finalPayload
				};
			}

			const text = await res.text();
			const parsed = parseJsonOrText(text);

			updateTabResponse(tabId, {
				status: res.ok ? "success" : "error",
				endpoint: url,
				method,
				request: requestPayload,
				data: {
					httpStatus: res.status,
					httpStatusText: res.statusText,
					payload: parsed
				}
			});
			return {
				ok: res.ok,
				payload: parsed
			};
		} catch (error) {
			updateTabResponse(tabId, {
				status: "error",
				endpoint: url,
				method,
				request: requestPayload,
				data: {
					message: "Request failed",
					error: error instanceof Error ? error.message : String(error)
				}
			});
			return null;
		}
	};

	const setTabError = (
		tabId: string,
		endpoint: string,
		method: HttpMethod,
		message: string,
		request: ApiResponseView["request"] = null
	) => {
		setCopyErrorReportState("idle");
		updateTabResponse(tabId, {
			status: "error",
			endpoint,
			method,
			request,
			data: { message }
		});
	};

	const copyActiveErrorReport = async () => {
		if (activeTabResponse.status !== "error") return;

		const payload = {
			generatedAt: new Date().toISOString(),
			request: activeTabResponse.request ?? {
				url: activeTabResponse.endpoint,
				path: "",
				query: null,
				body: null
			},
			response: activeTabResponse.data
		};

		try {
			await navigator.clipboard.writeText(toPrettyJson(payload));
			setCopyErrorReportState("copied");
		} catch {
			setCopyErrorReportState("failed");
		}
	};

	const addNewTab = () => {
		const nextId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setTabs((prevTabs) => [
			...prevTabs,
			{
				id: nextId,
				apiToolId: "service",
				response: createIdleResponse()
			}
		]);
		setActiveTabId(nextId);
	};

	const closeTab = (tabId: string) => {
		if (tabs.length <= 1) return;
		const closingIndex = tabs.findIndex((tab) => tab.id === tabId);
		const nextTabs = tabs.filter((tab) => tab.id !== tabId);
		setTabs(nextTabs);

		if (activeTabId === tabId) {
			const nextActive =
				nextTabs[Math.max(0, closingIndex - 1)]?.id ?? nextTabs[0]?.id;
			if (nextActive) setActiveTabId(nextActive);
		}
	};

	const updateTabApiTool = (tabId: string, apiToolId: ApiToolId) => {
		setTabs((prevTabs) =>
			prevTabs.map((tab) =>
				tab.id === tabId
					? {
							...tab,
							apiToolId,
							response: createIdleResponse()
						}
					: tab
			)
		);
	};

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const renderActiveToolPanel = (tab: ApiWorkspaceTab): ReactNode => {
		switch (tab.apiToolId) {
			case "service":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">Service</h2>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/health",
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								GET /health
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/state/steps",
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								GET /state/steps
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/state/paths",
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								GET /state/paths
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"POST",
										"/admin/kv/migrate",
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
							>
								POST /admin/kv/migrate
							</button>
						</div>
					</section>
				);
			case "cache-admin":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">Cache Admin</h2>
						<div className="flex gap-2">
							<select
								title="Cache clear target"
								value={cacheTarget}
								onChange={(e) => setCacheTarget(e.target.value)}
								className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								<option value="all">all</option>
								<option value="flask">flask</option>
								<option value="url">url</option>
								<option value="angles">angles</option>
							</select>
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/admin/cache/stats",
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								Stats
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"POST",
										"/admin/cache/clear",
										undefined,
										{ target: cacheTarget },
										tab.id
									)
								}
								className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							>
								Clear
							</button>
						</div>
					</section>
				);
			case "state-filesystem":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">State Filesystem</h2>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<input
								value={fsPath}
								onChange={(e) => setFsPath(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="path"
							/>
							<input
								value={fsLimit}
								onChange={(e) => setFsLimit(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="limit"
							/>
							<label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
								<input
									type="checkbox"
									checked={fsRecursive}
									onChange={(e) => setFsRecursive(e.target.checked)}
								/>
								recursive
							</label>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/state/fs/list",
										{
											path: fsPath,
											recursive: fsRecursive,
											limit: fsLimit
										},
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								List
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"DELETE",
										"/state/fs/delete",
										{ path: fsPath, recursive: fsRecursive },
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							>
								Delete
							</button>
						</div>

						<input
							value={jsonReadPath}
							onChange={(e) => setJsonReadPath(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="read json path"
						/>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/state/fs/read-json",
									{ path: jsonReadPath },
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							Read JSON
						</button>

						<input
							value={jsonWritePath}
							onChange={(e) => setJsonWritePath(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="write json path"
						/>
						<textarea
							title="JSON body for write-json"
							placeholder='{"hello":"world"}'
							value={jsonWriteBody}
							onChange={(e) => setJsonWriteBody(e.target.value)}
							className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
						/>
						<button
							type="button"
							onClick={() => {
								try {
									callApi(
										"POST",
										"/state/fs/write-json",
										undefined,
										{
											path: jsonWritePath,
											data: JSON.parse(jsonWriteBody),
											overwrite: true
										},
										tab.id
									);
								} catch {
									setTabError(
										tab.id,
										`${base}/state/fs/write-json`,
										"POST",
										"Invalid JSON body for write-json"
									);
								}
							}}
							className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
						>
							Write JSON
						</button>
					</section>
				);
			case "artifacts-workflows":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">
							Artifacts + Workflows
						</h2>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<select
								title="Artifact step"
								value={artifactStep}
								onChange={(e) =>
									setArtifactStep(e.target.value as ArtifactStep)
								}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								{ARTIFACT_STEP_OPTIONS.map((step) => (
									<option key={step} value={step}>
										{step}
									</option>
								))}
							</select>
							<input
								value={artifactTag}
								onChange={(e) => setArtifactTag(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="tag (optional)"
							/>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										"/artifacts/posts",
										{
											step: artifactStep,
											count: 20,
											offset: 0,
											tag: artifactTag || undefined
										},
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								List posts
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"POST",
										"/artifacts/object",
										{
											step: artifactStep,
											filename: artifactFilename
										},
										{ hello: "world" },
										tab.id
									)
								}
								className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
							>
								Save object
							</button>
						</div>
						<input
							value={artifactPostFile}
							onChange={(e) => setArtifactPostFile(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="post filename for /artifacts/post"
						/>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/artifacts/post",
									{ step: artifactStep, post: artifactPostFile },
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							Get artifact post
						</button>

						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<select
								title="Workflow endpoint"
								value={workflowName}
								onChange={(e) => {
									const next = e.target.value;
									setWorkflowName(next);
									setWorkflowBody(getWorkflowTemplate(next));
								}}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								{workflowCommands.map((command) => (
									<option key={command} value={command}>
										{command}
									</option>
								))}
							</select>
							<select
								title="Workflow run mode"
								value={workflowRunMode}
								onChange={(e) =>
									setWorkflowRunMode(e.target.value as WorkflowRunMode)
								}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								<option value="dedicated">{`POST /workflows/${workflowName}`}</option>
								<option value="generic">POST /workflows/run</option>
							</select>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<button
								type="button"
								onClick={async () => {
									const result = await callApi(
										"GET",
										"/workflows/pipelines",
										undefined,
										undefined,
										tab.id
									);
									if (!result?.ok) return;
									const extracted = extractWorkflowCommands(
										result.payload
									);
									if (extracted.length > 0) {
										setWorkflowCommands(extracted);
										if (!extracted.includes(workflowName)) {
											const next = extracted[0]!;
											setWorkflowName(next);
											setWorkflowBody(getWorkflowTemplate(next));
										}
									}
								}}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								Load pipelines
							</button>
							<button
								type="button"
								onClick={() =>
									setWorkflowBody(getWorkflowTemplate(workflowName))
								}
								className="rounded-md bg-violet-500/20 px-3 py-2 text-sm hover:bg-violet-500/30"
							>
								Use template
							</button>
							<button
								type="button"
								onClick={() => {
									try {
										const parsed = JSON.parse(
											workflowBody
										) as unknown;
										if (
											workflowRunMode === "generic" &&
											(!parsed ||
												typeof parsed !== "object" ||
												Array.isArray(parsed))
										) {
											setTabError(
												tab.id,
												`${base}/workflows/run`,
												"POST",
												"Generic workflow body must be a JSON object"
											);
											return;
										}

										if (workflowRunMode === "generic") {
											callApi(
												"POST",
												"/workflows/run",
												undefined,
												{
													command: workflowName,
													...(parsed as Record<string, unknown>)
												},
												tab.id
											);
											return;
										}

										callApi(
											"POST",
											`/workflows/${workflowName}`,
											undefined,
											parsed,
											tab.id
										);
									} catch {
										setTabError(
											tab.id,
											workflowRunMode === "generic"
												? `${base}/workflows/run`
												: `${base}/workflows/${workflowName}`,
											"POST",
											"Invalid JSON workflow body"
										);
									}
								}}
								className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
							>
								Run workflow
							</button>
						</div>
						<textarea
							title="Workflow request body JSON"
							placeholder='{"count":3}'
							value={workflowBody}
							onChange={(e) => setWorkflowBody(e.target.value)}
							className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
						/>
					</section>
				);
			case "kv-store":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">KV Store</h2>
						<div className="grid grid-cols-2 gap-2">
							<input
								value={kvLimit}
								onChange={(e) => setKvLimit(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="limit"
							/>
							<input
								value={kvOffset}
								onChange={(e) => setKvOffset(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="offset"
							/>
						</div>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/kv",
									{ limit: kvLimit, offset: kvOffset },
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							List KV
						</button>

						<input
							value={kvKey}
							onChange={(e) => setKvKey(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="key"
						/>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<button
								type="button"
								onClick={() =>
									callApi(
										"GET",
										`/kv/${encodeURIComponent(kvKey)}`,
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								Get
							</button>
							<button
								type="button"
								onClick={() => {
									try {
										callApi(
											"PUT",
											`/kv/${encodeURIComponent(kvKey)}`,
											undefined,
											JSON.parse(kvValue),
											tab.id
										);
									} catch {
										setTabError(
											tab.id,
											`${base}/kv/${encodeURIComponent(kvKey)}`,
											"PUT",
											"Invalid JSON for KV value body"
										);
									}
								}}
								className="rounded-md bg-amber-500/20 px-3 py-2 text-sm hover:bg-amber-500/30"
							>
								Put
							</button>
							<button
								type="button"
								onClick={() =>
									callApi(
										"DELETE",
										`/kv/${encodeURIComponent(kvKey)}`,
										undefined,
										undefined,
										tab.id
									)
								}
								className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							>
								Delete
							</button>
						</div>
						<textarea
							title="KV PUT request body JSON"
							placeholder='{"value":{"ok":true}}'
							value={kvValue}
							onChange={(e) => setKvValue(e.target.value)}
							className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
						/>
					</section>
				);
			case "search-tools":
				return (
					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<h2 className="text-lg font-semibold">Search Tools</h2>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<select
								title="Search provider"
								value={searchProvider}
								onChange={(e) => setSearchProvider(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								<option value="news">news</option>
								<option value="ollama">ollama</option>
								<option value="bing">bing</option>
								<option value="google">google</option>
							</select>
							<input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="query"
							/>
						</div>
						<button
							type="button"
							onClick={() => {
								const query =
									searchProvider === "bing" ||
									searchProvider === "google"
										? { query: searchQuery, first: 0, count: 5 }
										: { query: searchQuery };
								callApi(
									"GET",
									`/tools/search/${searchProvider}`,
									query,
									undefined,
									tab.id
								);
							}}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							Run search
						</button>
					</section>
				);
			default:
				return null;
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

			<div className="flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="space-y-2">
						<h1 className="text-3xl font-bold">Admin API Console</h1>
						<p className="text-sm text-white/50">
							Open APIs in tabs, run calls, compare responses.
						</p>
						<div className="rounded-lg border border-white/10 bg-white/5 p-3">
							<label className="text-xs text-white/60">
								Backend Base URL
							</label>
							<input
								value={baseUrl}
								onChange={(e) => setBaseUrl(e.target.value)}
								className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="http://localhost:5001/api/v1"
							/>
						</div>
					</header>

					<div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							{tabs.map((tab, index) => (
								<div
									key={tab.id}
									className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
										tab.id === activeTabId
											? "border-blue-400/60 bg-blue-500/20"
											: "border-white/10 bg-black/20"
									}`}
								>
									<button
										type="button"
										onClick={() => setActiveTabId(tab.id)}
										className="text-sm hover:text-blue-200"
									>
										Tab {index + 1}: {getApiToolLabel(tab.apiToolId)}
									</button>
									<button
										type="button"
										onClick={() => closeTab(tab.id)}
										disabled={tabs.length === 1}
										className="rounded px-1 text-xs text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
										title="Close tab"
									>
										x
									</button>
								</div>
							))}
							<button
								type="button"
								onClick={addNewTab}
								className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
							>
								+ New Tab
							</button>
						</div>

						{activeTab ? (
							<div className="space-y-4">
								<div className="rounded-lg border border-white/10 bg-black/20 p-3">
									<label className="text-xs text-white/60">
										API in this tab
									</label>
									<select
										title="API in active tab"
										value={activeTab.apiToolId}
										onChange={(e) =>
											updateTabApiTool(
												activeTab.id,
												e.target.value as ApiToolId
											)
										}
										className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
									>
										{API_TOOL_OPTIONS.map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</select>
								</div>
								{renderActiveToolPanel(activeTab)}
							</div>
						) : null}
					</div>

					<section className="rounded-xl border border-white/10 bg-black/30 p-4">
						<div className="mb-2 flex items-center justify-between">
							<h2 className="text-lg font-semibold">
								Active Tab Response
							</h2>
							<div className="flex items-center gap-2">
								{activeTabResponse.status === "error" ? (
									<button
										type="button"
										onClick={copyActiveErrorReport}
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
												activeTabResponse.data as Record<
													string,
													unknown
												>
											).httpStatus,
											httpStatusText: (
												activeTabResponse.data as Record<
													string,
													unknown
												>
											).httpStatusText,
											contentType: (
												activeTabResponse.data as Record<
													string,
													unknown
												>
											).contentType,
											streaming: (
												activeTabResponse.data as Record<
													string,
													unknown
												>
											).streaming,
											complete: (
												activeTabResponse.data as Record<
													string,
													unknown
												>
											).complete,
											eventCount: ssePayload.events.length,
											finishedAt: (
												activeTabResponse.data as Record<
													string,
													unknown
												>
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
													{(lastHeartbeatElapsed / 1000).toFixed(
														1
													)}
													s
												</span>
											) : null}
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<label className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/70">
												<input
													type="checkbox"
													checked={showHeartbeatEvents}
													onChange={(e) =>
														setShowHeartbeatEvents(
															e.target.checked
														)
													}
												/>
												Show heartbeat events
											</label>
											<input
												value={streamSearchText}
												onChange={(e) =>
													setStreamSearchText(e.target.value)
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
													const firstHeartbeat =
														item.heartbeats?.[0];
													const lastHeartbeat =
														item.heartbeats?.[
															(item.heartbeats?.length ?? 1) - 1
														];
													const firstElapsed = firstHeartbeat
														? getHeartbeatElapsedMs(
																firstHeartbeat
															)
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
												return (
													<div
														key={`${event.receivedAt}-${index}`}
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
														</div>
														{renderInspectorValue(event.data)}
													</div>
												);
											})
										)}
									</div>
								</>
							) : (
								renderInspectorValue(activeTabResponse.data)
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

export default function AdminApiPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DashboardAdminContent />
		</Suspense>
	);
}
