import type {
	ApiResponseView,
	StreamEventDisplayItem,
	StreamEventView
} from "./types";

export function escapeBashSingleQuoted(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

/** Bash-friendly curl for the last captured request (matches fetch Content-Type / JSON body rules). */
export function buildCurlBash(response: ApiResponseView): string {
	const { method, request, endpoint } = response;
	const url = (request?.url ?? endpoint ?? "").trim();
	if (!url) return "";

	const body = request?.body;
	const parts: string[] = ["curl", "-sS", "-X", method, escapeBashSingleQuoted(url)];

	if (method !== "GET" && body !== undefined) {
		parts.push("-H", escapeBashSingleQuoted("Content-Type: application/json"));
		parts.push("-d", escapeBashSingleQuoted(JSON.stringify(body)));
	}

	return parts.join(" ");
}

export function formatResponseForClipboard(response: ApiResponseView): string {
	return toPrettyJson(response.data);
}

export function buildCopyRequestAndResponseText(response: ApiResponseView): string {
	const curl = buildCurlBash(response);
	const resp = formatResponseForClipboard(response);
	const blocks: string[] = [];
	if (curl) {
		blocks.push("# Request (curl bash)", curl);
	}
	if (response.status !== "idle") {
		if (blocks.length) blocks.push("", "---", "");
		blocks.push("# Response", resp);
	}
	return blocks.join("\n");
}

export function toPrettyJson(value: unknown): string {
	if (typeof value === "string") {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
	return JSON.stringify(value, null, 2);
}

export function parseJsonOrText(value: string): unknown {
	if (!value) return null;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseStructuredJsonString(value: string): unknown {
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

export function normalizeForInspector(value: unknown, depth = 0): unknown {
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

export function isSsePayload(value: unknown): value is { events: StreamEventView[] } {
	return isRecord(value) && Array.isArray(value.events);
}

export function isHeartbeatEvent(event: StreamEventView): boolean {
	if (event.event === "heartbeat") return true;
	if (!isRecord(event.data)) return false;
	return event.data.event === "heartbeat";
}

export function getHeartbeatElapsedMs(event: StreamEventView): number | null {
	if (!isRecord(event.data)) return null;
	const elapsed = event.data.elapsed_ms;
	return typeof elapsed === "number" && Number.isFinite(elapsed)
		? elapsed
		: null;
}

export function buildStreamEventItems(
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

export function parseSseEvent(rawBlock: string): StreamEventView | null {
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

export function getWorkflowTemplate(command: string): string {
	switch (command) {
		case "data-load":
			return '{\n  "count": 3,\n  "offset": 0,\n  "batch_size": 10\n}';
		case "research":
		case "gen-angles":
			return '{\n  "count": 3,\n  "offset": 0\n}';
		case "stego":
			return '{\n  "post_id": "",\n  "list_offset": 0,\n  "run_all": false\n}';
		case "decode":
			return '{\n  "stego_text": "sample stego text",\n  "angles": [1, 2, 3],\n  "few_shots": []\n}';
		case "gen-terms":
			return '{\n  "post_id": "example-post-id",\n  "post_title": "Sample title",\n  "post_text": "Sample text"\n}';
		case "validate-post":
			return '{\n  "post_id": "example-post-id",\n  "stream": false\n}';
		case "full":
			return '{\n  "start_step": "filter-url-unresolved",\n  "count": 3\n}';
		default:
			return '{\n  "count": 3\n}';
	}
}

/** Empty → omit (use JSON body or API default). Otherwise JSON if valid, else raw string. */
export function parseStegoPayloadInput(raw: string): unknown | undefined {
	const t = raw.trim();
	if (!t) return undefined;
	try {
		return JSON.parse(t) as unknown;
	} catch {
		return t;
	}
}

export function getWorkflowRunAllTemplate(command: string): string {
	if (command === "stego") {
		return '{\n  "post_id": "",\n  "list_offset": 0,\n  "run_all": true\n}';
	}
	return getWorkflowTemplate(command);
}

/** Row shape from GET /workflows/runs (`data.runs` entries). */
export interface WorkflowRunRow {
	id: string;
	command: string;
	mode: string;
	started_at: number;
	elapsed_ms: number;
}

/** Parses Admin Console JSON response body (`data.payload` = API envelope). */
export function extractWorkflowRunsFromAdminResponse(
	data: unknown
): { runs: WorkflowRunRow[]; count: number } | null {
	if (!isRecord(data)) return null;
	const payload = data.payload;
	if (!isRecord(payload)) return null;
	if (payload.ok !== true) return null;
	const inner = payload.data;
	if (!isRecord(inner)) return null;
	const runsRaw = inner.runs;
	if (!Array.isArray(runsRaw)) return null;
	const runs: WorkflowRunRow[] = [];
	for (const item of runsRaw) {
		if (!isRecord(item)) continue;
		const id = item.id;
		const command = item.command;
		const mode = item.mode;
		const started_at = item.started_at;
		const elapsed_ms = item.elapsed_ms;
		if (
			typeof id !== "string" ||
			typeof command !== "string" ||
			typeof mode !== "string" ||
			typeof started_at !== "number" ||
			typeof elapsed_ms !== "number"
		) {
			continue;
		}
		runs.push({ id, command, mode, started_at, elapsed_ms });
	}
	const count =
		typeof inner.count === "number" && Number.isFinite(inner.count)
			? inner.count
			: runs.length;
	return { runs, count };
}

export function isWorkflowRunsEndpoint(active: {
	endpoint: string;
	request: { path: string } | null;
}): boolean {
	if (active.request?.path === "/workflows/runs") return true;
	return active.endpoint.includes("/workflows/runs");
}

/** Step summary from POST /workflows/validate-post `data.steps`. */
export interface ValidatePostStepSummary {
	step: string;
	matches: boolean;
	changed_keys: string[];
}

export interface ValidatePostResultView {
	post_id: string;
	valid: boolean;
	steps: Record<string, ValidatePostStepSummary>;
}

export function isValidatePostEndpoint(active: {
	endpoint: string;
	request: { path: string } | null;
}): boolean {
	if (active.request?.path === "/workflows/validate-post") return true;
	return active.endpoint.includes("/workflows/validate-post");
}

/** Parses validate-post result from non-SSE admin response (`data.payload` = API envelope). */
export function extractValidatePostFromAdminResponse(
	data: unknown
): ValidatePostResultView | null {
	if (!isRecord(data)) return null;
	const payload = data.payload;
	if (!isRecord(payload) || payload.ok !== true) return null;
	const inner = payload.data;
	if (!isRecord(inner)) return null;
	if (typeof inner.post_id !== "string" || typeof inner.valid !== "boolean")
		return null;
	const stepsRaw = inner.steps;
	if (!isRecord(stepsRaw)) return null;
	const steps: Record<string, ValidatePostStepSummary> = {};
	for (const [key, entry] of Object.entries(stepsRaw)) {
		if (!isRecord(entry)) continue;
		const step = entry.step;
		const matches = entry.matches;
		const changed = entry.changed_keys;
		if (
			typeof step !== "string" ||
			typeof matches !== "boolean" ||
			!Array.isArray(changed) ||
			!changed.every((c) => typeof c === "string")
		) {
			continue;
		}
		steps[key] = {
			step,
			matches,
			changed_keys: changed
		};
	}
	return { post_id: inner.post_id, valid: inner.valid, steps };
}
