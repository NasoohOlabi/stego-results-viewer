import type {
	ApiResponseView,
	StreamEventDisplayItem,
	StreamEventView,
	TriggerAnglesMode,
	WorkflowRunBatchRow,
	WorkflowRunStructuredModel,
	WorkflowRunTimelineRow,
} from "./types";

export function escapeBashSingleQuoted(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

/** Human-readable duration for request/stream timers (ms → "12.3s" or "2m 05s"). */
export function formatElapsedMs(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "0.0s";
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	const m = Math.floor(ms / 60_000);
	const s = Math.floor((ms % 60_000) / 1000);
	return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** Bash-friendly curl for the last captured request (matches fetch Content-Type / JSON body rules). */
export function buildCurlBash(response: ApiResponseView): string {
	const { method, request, endpoint } = response;
	const url = (request?.url ?? endpoint ?? "").trim();
	if (!url) return "";

	const body = request?.body;
	const parts: string[] = [
		"curl",
		"-sS",
		"-X",
		method,
		escapeBashSingleQuoted(url),
	];

	if (method !== "GET" && body !== undefined) {
		parts.push("-H", escapeBashSingleQuoted("Content-Type: application/json"));
		parts.push("-d", escapeBashSingleQuoted(JSON.stringify(body)));
	}

	return parts.join(" ");
}

export function formatResponseForClipboard(response: ApiResponseView): string {
	return toPrettyJson(response.data);
}

export function buildCopyRequestAndResponseText(
	response: ApiResponseView,
): string {
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
		return parsed === value ? value : normalizeForInspector(parsed, depth + 1);
	}

	if (Array.isArray(value)) {
		return value.map((item) => normalizeForInspector(item, depth + 1));
	}

	if (isRecord(value)) {
		const normalizedEntries = Object.entries(value).map(([key, entryValue]) => [
			key,
			normalizeForInspector(entryValue, depth + 1),
		]);
		return Object.fromEntries(normalizedEntries);
	}

	return value;
}

export function isSsePayload(
	value: unknown,
): value is { events: StreamEventView[] } {
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
	options: { includeHeartbeats: boolean; searchText: string },
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
		receivedAt: new Date().toISOString(),
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
		case "receiver":
			return '{\n  "post": {},\n  "sender_user_id": "sender-id",\n  "stream": false,\n  "use_cache": false\n}';
		case "stego-receiver-live":
			return '{\n  "sender_user_id": "sender-id",\n  "post_id": "",\n  "stream": true,\n  "list_offset": 1\n}';
		case "double-process-new-post":
			return '{\n  "stream": true,\n  "allow_angles_fallback": false\n}';
		case "batch-angles-determinism":
			return '{\n  "post_ids": ["example-post-id"],\n  "step": "angles-step",\n  "stream": false\n}';
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

/** Builds POST bodies for `/workflows/gen-angles` or `/workflows/stego-receiver-live` (both run gen_angles on the receiver path). */
export function buildTriggerAnglesRequest(input: {
	mode: TriggerAnglesMode;
	genAnglesCount: string;
	genAnglesOffset: string;
	genAnglesStream: boolean;
	stegoReceiverLiveSenderUserId: string;
	stegoReceiverLivePostId: string;
	stegoReceiverLivePayload: string;
	stegoReceiverLiveTag: string;
	stegoReceiverLiveListOffset: string;
	stegoReceiverLiveSimulationRoot: string;
	stegoReceiverLiveCompressedBitstring: string;
	stegoReceiverLiveAllowFallback: boolean;
	stegoReceiverLiveMaxPaddingBits: string;
	stegoReceiverLiveMaxPostAttempts: string;
	stegoReceiverLiveStream: boolean;
}): { path: string; body: Record<string, unknown> } | { error: string } {
	if (input.mode === "gen-angles") {
		const countRaw = input.genAnglesCount.trim();
		const offsetRaw = input.genAnglesOffset.trim();
		const count = countRaw === "" ? 1 : Number.parseInt(countRaw, 10);
		const offset = offsetRaw === "" ? 0 : Number.parseInt(offsetRaw, 10);
		if (!Number.isInteger(count) || count < 0) {
			return { error: "count must be a non-negative integer" };
		}
		if (!Number.isInteger(offset) || offset < 0) {
			return { error: "offset must be a non-negative integer" };
		}
		return {
			path: "/workflows/gen-angles",
			body: {
				count,
				offset,
				stream: input.genAnglesStream,
			},
		};
	}

	const sender = input.stegoReceiverLiveSenderUserId.trim();
	if (!sender) {
		return { error: "sender_user_id is required" };
	}

	const body: Record<string, unknown> = {
		sender_user_id: sender,
		stream: input.stegoReceiverLiveStream,
		allow_fallback: input.stegoReceiverLiveAllowFallback,
	};

	const pid = input.stegoReceiverLivePostId.trim();
	if (pid) body.post_id = pid;

	const payload = parseStegoPayloadInput(input.stegoReceiverLivePayload);
	if (payload !== undefined) body.payload = payload;

	const tag = input.stegoReceiverLiveTag.trim();
	if (tag) body.tag = tag;

	const lo = input.stegoReceiverLiveListOffset.trim();
	if (lo.length > 0) {
		const n = Number(lo);
		if (!Number.isInteger(n)) {
			return { error: "list_offset must be an integer" };
		}
		body.list_offset = n;
	}

	const sim = input.stegoReceiverLiveSimulationRoot.trim();
	if (sim) body.simulation_root = sim;

	const cbs = input.stegoReceiverLiveCompressedBitstring.trim();
	if (cbs) body.compressed_bitstring = cbs;

	const mpb = input.stegoReceiverLiveMaxPaddingBits.trim();
	if (mpb.length > 0) {
		const n = Number(mpb);
		if (!Number.isInteger(n) || n < 0) {
			return { error: "max_padding_bits must be a non-negative integer" };
		}
		body.max_padding_bits = n;
	}

	const mpa = input.stegoReceiverLiveMaxPostAttempts.trim();
	if (mpa.length > 0) {
		const n = Number(mpa);
		if (!Number.isInteger(n) || n < 1) {
			return { error: "max_post_attempts must be an integer ≥ 1" };
		}
		body.max_post_attempts = n;
	}

	return { path: "/workflows/stego-receiver-live", body };
}

/** Split newline- or comma-separated post ids; trims and drops empties. */
export function parsePostIdsFromMultiline(raw: string): string[] {
	return raw
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
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
	data: unknown,
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
	/** `null` when rerun did not complete or could not be compared (not a simple mismatch). */
	matches: boolean | null;
	changed_keys: string[];
	comparison?: string;
	comparison_note?: string;
	error?: string | null;
}

export interface ValidatePostResultView {
	post_id: string;
	valid: boolean;
	/** e.g. `live_protocol_replay` */
	mode?: string;
	validation_outcome?: string;
	validation_explanation?: string;
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
	data: unknown,
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
		const matchesOk = matches === null || typeof matches === "boolean";
		if (
			typeof step !== "string" ||
			!matchesOk ||
			!Array.isArray(changed) ||
			!changed.every((c) => typeof c === "string")
		) {
			continue;
		}
		const comparison =
			typeof entry.comparison === "string" ? entry.comparison : undefined;
		const comparison_note =
			typeof entry.comparison_note === "string"
				? entry.comparison_note
				: undefined;
		const err = entry.error;
		const error = err === null || typeof err === "string" ? err : undefined;
		steps[key] = {
			step,
			matches,
			changed_keys: changed,
			...(comparison !== undefined ? { comparison } : {}),
			...(comparison_note !== undefined ? { comparison_note } : {}),
			...(error !== undefined ? { error } : {}),
		};
	}
	const mode = typeof inner.mode === "string" ? inner.mode : undefined;
	const validation_outcome =
		typeof inner.validation_outcome === "string"
			? inner.validation_outcome
			: undefined;
	const validation_explanation =
		typeof inner.validation_explanation === "string"
			? inner.validation_explanation
			: undefined;
	return {
		post_id: inner.post_id,
		valid: inner.valid,
		mode,
		validation_outcome,
		validation_explanation,
		steps,
	};
}

/** Human-readable byte size for log file stats. */
export function formatBytes(n: number): string {
	if (!Number.isFinite(n)) return String(n);
	if (n < 0) return `${n} B`;
	if (n < 1024) return `${n} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let v = n / 1024;
	let u = 0;
	while (v >= 1024 && u < units.length - 1) {
		v /= 1024;
		u++;
	}
	const digits = v >= 100 || u === 0 ? 0 : v >= 10 ? 1 : 2;
	return `${v.toFixed(digits)} ${units[u]}`;
}

/** Parsed `data` from GET /state/logs. */
export interface StateLogsView {
	file_logging_enabled: boolean;
	path: string | null;
	bytes: number;
}

export function extractStateLogsFromAdminResponse(
	data: unknown,
): StateLogsView | null {
	if (!isRecord(data)) return null;
	const payload = data.payload;
	if (!isRecord(payload) || payload.ok !== true) return null;
	const inner = payload.data;
	if (!isRecord(inner)) return null;
	if (typeof inner.file_logging_enabled !== "boolean") return null;
	const path = inner.path;
	if (path !== null && typeof path !== "string") return null;
	const bytes = inner.bytes;
	if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
	return { file_logging_enabled: inner.file_logging_enabled, path, bytes };
}

export function isStateLogsEndpoint(active: {
	method: string;
	endpoint: string;
	request: { path: string } | null;
}): boolean {
	if (active.method !== "GET") return false;
	if (active.request?.path === "/state/logs") return true;
	return active.endpoint.includes("/state/logs");
}

export interface LoggingTagRow {
	id: string;
	description: string;
}

export interface LoggingTagsView {
	tags: LoggingTagRow[];
	tag_ids: string[];
}

export function extractLoggingTagsFromAdminResponse(
	data: unknown,
): LoggingTagsView | null {
	if (!isRecord(data)) return null;
	const payload = data.payload;
	if (!isRecord(payload) || payload.ok !== true) return null;
	const inner = payload.data;
	if (!isRecord(inner)) return null;
	const tagsRaw = inner.tags;
	if (!Array.isArray(tagsRaw)) return null;
	const tags: LoggingTagRow[] = [];
	for (const item of tagsRaw) {
		if (!isRecord(item)) continue;
		if (typeof item.id !== "string" || typeof item.description !== "string")
			continue;
		tags.push({ id: item.id, description: item.description });
	}
	const tagIdsRaw = inner.tag_ids;
	const tag_ids =
		Array.isArray(tagIdsRaw) && tagIdsRaw.every((x) => typeof x === "string")
			? (tagIdsRaw as string[])
			: tags.map((t) => t.id);
	return { tags, tag_ids };
}

export function isLoggingTagsEndpoint(active: {
	method: string;
	endpoint: string;
	request: { path: string } | null;
}): boolean {
	if (active.method !== "GET") return false;
	if (active.request?.path === "/logging/tags") return true;
	return active.endpoint.includes("/logging/tags");
}

export function isWorkflowRunEndpoint(active: {
	method: string;
	endpoint: string;
	request: { path: string } | null;
}): boolean {
	if (active.method !== "POST") return false;
	if (active.request?.path === "/workflows/run") return true;
	return active.endpoint.includes("/workflows/run");
}

const STOPPED_REASON_LABELS: Record<string, string> = {
	max_posts_reached: "Max posts reached",
	no_unprocessed_posts: "No unprocessed posts",
	user_cancelled: "Cancelled",
};

export function labelStoppedReason(reason: string): string {
	const t = reason.trim();
	if (!t) return "";
	return STOPPED_REASON_LABELS[t] ?? t.replace(/_/g, " ");
}

function unwrapWorkflowResultPayload(
	data: unknown,
): { command: string; result: unknown } | null {
	if (!isRecord(data)) return null;
	const cmd = data.command;
	const res = data.result;
	if (typeof cmd === "string" && "result" in data) {
		return { command: cmd, result: res };
	}
	return null;
}

export function extractWorkflowRunSyncResult(data: unknown): {
	command: string;
	result: unknown;
} | null {
	if (!isRecord(data)) return null;
	const payload = data.payload;
	if (!isRecord(payload) || payload.ok !== true) return null;
	const inner = payload.data;
	if (!isRecord(inner)) return null;
	const cmd = inner.command;
	if (typeof cmd !== "string" || !("result" in inner)) return null;
	return { command: cmd, result: inner.result };
}

function collectPostIdsFromResult(result: unknown): string[] {
	if (!isRecord(result)) return [];
	const ids = new Set<string>();
	if (typeof result.post_id === "string" && result.post_id)
		ids.add(result.post_id);
	if (result.run_all === true && Array.isArray(result.results)) {
		for (const item of result.results) {
			if (!isRecord(item)) continue;
			if (typeof item.post_id === "string" && item.post_id)
				ids.add(item.post_id);
			const post = item.post;
			if (isRecord(post) && typeof post.id === "string" && post.id)
				ids.add(post.id);
		}
	}
	return [...ids];
}

function extractStegoTextFromResult(result: unknown): string | null {
	if (!isRecord(result)) return null;
	const t = result.stego_text;
	if (typeof t === "string" && t.length > 0) return t;
	if (result.run_all === true && Array.isArray(result.results)) {
		const texts: string[] = [];
		for (const item of result.results) {
			if (!isRecord(item)) continue;
			const st = item.stego_text;
			if (typeof st === "string" && st.length > 0) texts.push(st);
		}
		if (texts.length === 0) return null;
		return texts.join("\n\n---\n\n");
	}
	return null;
}

function summarizeResultIntoModel(
	base: Pick<
		WorkflowRunStructuredModel,
		| "outcome"
		| "command"
		| "run_id"
		| "resultPayload"
		| "errorMessage"
		| "errorDetails"
		| "lastHeartbeatActivity"
	>,
	command: string | undefined,
	result: unknown,
	sseMeta: {
		timeline: WorkflowRunTimelineRow[];
		batchRows: WorkflowRunBatchRow[];
		logMessages: string[];
	},
): WorkflowRunStructuredModel {
	const cmd = command ?? base.command;
	const postIds = collectPostIdsFromResult(result);
	const stegoText = cmd === "stego" ? extractStegoTextFromResult(result) : null;
	let summaryLine = "";
	let runAll = false;
	let stoppedReason: string | undefined;
	let stoppedReasonLabel: string | undefined;
	let processedCount: number | undefined;
	let succeededCount: number | undefined;
	let failedCount: number | undefined;

	if (isRecord(result)) {
		if (result.run_all === true) runAll = true;
		if (typeof result.stopped_reason === "string") {
			stoppedReason = result.stopped_reason;
			stoppedReasonLabel = labelStoppedReason(result.stopped_reason);
		}
		const pc = result.processed_count;
		const sc = result.succeeded_count;
		const fc = result.failed_count;
		if (typeof pc === "number" && Number.isFinite(pc)) processedCount = pc;
		if (typeof sc === "number" && Number.isFinite(sc)) succeededCount = sc;
		if (typeof fc === "number" && Number.isFinite(fc)) failedCount = fc;

		const succ = result.succeeded;
		if (typeof succ === "boolean") {
			summaryLine = succ ? "Succeeded" : "Failed";
		} else if (runAll && typeof processedCount === "number") {
			summaryLine = `Batch: ${processedCount} processed`;
			if (
				typeof succeededCount === "number" &&
				typeof failedCount === "number"
			) {
				summaryLine += ` (${succeededCount} ok, ${failedCount} failed)`;
			}
		} else {
			summaryLine = cmd ? `Command: ${cmd}` : "Completed";
		}
		const err = result.error;
		if (typeof err === "string" && err.trim()) {
			summaryLine = succ === false ? `Failed: ${err}` : summaryLine;
		}
	} else {
		summaryLine = cmd ? `Command: ${cmd}` : "Completed";
	}

	let finalOutcome = base.outcome;
	if (isRecord(result)) {
		if (result.succeeded === false && result.run_all !== true) {
			finalOutcome = "error";
		}
		const pc = result.processed_count;
		const fc = result.failed_count;
		if (
			result.run_all === true &&
			typeof pc === "number" &&
			typeof fc === "number" &&
			pc > 0 &&
			fc === pc
		) {
			finalOutcome = "error";
		}
	}

	return {
		...base,
		outcome: finalOutcome,
		command: cmd,
		resultPayload: result,
		postIds,
		stegoText,
		summaryLine,
		runAll,
		stoppedReason,
		stoppedReasonLabel,
		processedCount,
		succeededCount,
		failedCount,
		timeline: sseMeta.timeline,
		batchRows: sseMeta.batchRows,
		logMessages: sseMeta.logMessages,
	};
}

export function buildWorkflowRunStructuredModel(
	events: StreamEventView[],
): WorkflowRunStructuredModel {
	const timeline: WorkflowRunTimelineRow[] = [];
	const batchRows = new Map<string, WorkflowRunBatchRow>();
	const logMessages: string[] = [];
	let lastHeartbeatActivity: string | null = null;
	let runId: string | undefined;
	let commandFromResult: string | undefined;
	let unwrappedResult: unknown | null = null;
	let errorMessage: string | undefined;
	let errorDetails: unknown;
	let sawError = false;
	let sawDone = false;

	for (const ev of events) {
		if (ev.event === "heartbeat") {
			if (isRecord(ev.data)) {
				const act = ev.data.activity;
				if (typeof act === "string" && act.trim())
					lastHeartbeatActivity = act.trim();
			}
			continue;
		}
		if (ev.event === "status") {
			if (isRecord(ev.data)) {
				const rid = ev.data.run_id;
				if (typeof rid === "string") runId = rid;
			}
			continue;
		}
		if (ev.event === "log") {
			if (typeof ev.data === "string") logMessages.push(ev.data);
			else if (isRecord(ev.data) && typeof ev.data.message === "string")
				logMessages.push(ev.data.message);
			else logMessages.push(toPrettyJson(ev.data));
			continue;
		}
		if (ev.event === "progress" && isRecord(ev.data)) {
			const inner = ev.data.event;
			const at = ev.receivedAt;
			if (inner === "stage_start") {
				const stage = ev.data.stage;
				const postId =
					typeof ev.data.post_id === "string" ? ev.data.post_id : undefined;
				const label =
					typeof stage === "string" ? `Running ${stage}…` : "Running stego…";
				timeline.push({
					kind: "stage_start",
					at,
					label,
					detail: postId ? `post ${postId}` : undefined,
					post_id: postId,
				});
			} else if (inner === "stage_progress") {
				const postId =
					typeof ev.data.post_id === "string" ? ev.data.post_id : "";
				const pc = ev.data.processed_count;
				const processed =
					typeof pc === "number" && Number.isFinite(pc) ? pc : 0;
				const succeeded = ev.data.succeeded === true;
				const rc = ev.data.retry_count;
				const retry =
					typeof rc === "number" && Number.isFinite(rc) ? rc : undefined;
				if (postId) {
					batchRows.set(postId, {
						post_id: postId,
						processed_count: processed,
						succeeded,
						retry_count: retry,
					});
				}
				timeline.push({
					kind: "stage_progress",
					at,
					label: postId
						? `${postId}: ${succeeded ? "ok" : "fail"}`
						: "Progress",
					post_id: postId || undefined,
					succeeded,
					retry_count: retry,
					processed_count: processed,
				});
			} else if (inner === "stage_done") {
				const sr = ev.data.stopped_reason;
				const stoppedReason = typeof sr === "string" ? sr : undefined;
				timeline.push({
					kind: "stage_done",
					at,
					label: "Finished",
					detail: stoppedReason ? labelStoppedReason(stoppedReason) : undefined,
					stopped_reason: stoppedReason,
					succeeded_count:
						typeof ev.data.succeeded_count === "number"
							? ev.data.succeeded_count
							: undefined,
					failed_count:
						typeof ev.data.failed_count === "number"
							? ev.data.failed_count
							: undefined,
					processed_count:
						typeof ev.data.processed_count === "number"
							? ev.data.processed_count
							: undefined,
				});
			}
			continue;
		}
		if (ev.event === "result") {
			const unwrapped = unwrapWorkflowResultPayload(ev.data);
			if (unwrapped) {
				commandFromResult = unwrapped.command;
				unwrappedResult = unwrapped.result;
			} else {
				unwrappedResult = ev.data;
			}
			continue;
		}
		if (ev.event === "error") {
			sawError = true;
			if (isRecord(ev.data)) {
				const err = ev.data.error;
				if (typeof err === "string") errorMessage = err;
				else errorMessage = toPrettyJson(ev.data);
				errorDetails = ev.data;
			} else {
				errorMessage = String(ev.data);
				errorDetails = ev.data;
			}
			continue;
		}
		if (ev.event === "done") {
			sawDone = true;
		}
	}

	let outcome: "pending" | "success" | "error" = "pending";
	if (sawError) outcome = "error";
	else if (unwrappedResult !== null) outcome = "success";
	else if (sawDone && !sawError) outcome = "success";

	const base: Pick<
		WorkflowRunStructuredModel,
		| "outcome"
		| "command"
		| "run_id"
		| "resultPayload"
		| "errorMessage"
		| "errorDetails"
		| "lastHeartbeatActivity"
	> = {
		outcome,
		command: commandFromResult,
		run_id: runId,
		resultPayload: unwrappedResult,
		errorMessage,
		errorDetails,
		lastHeartbeatActivity,
	};

	if (unwrappedResult !== null && !sawError) {
		return summarizeResultIntoModel(base, commandFromResult, unwrappedResult, {
			timeline,
			batchRows: [...batchRows.values()],
			logMessages,
		});
	}

	if (sawError) {
		return {
			...base,
			outcome: "error",
			summaryLine: errorMessage ?? "Error",
			postIds: [],
			stegoText: null,
			runAll: false,
			timeline,
			batchRows: [...batchRows.values()],
			logMessages,
		};
	}

	return {
		...base,
		outcome: "pending",
		summaryLine: "Waiting for result…",
		postIds: [],
		stegoText: null,
		runAll: false,
		timeline,
		batchRows: [...batchRows.values()],
		logMessages,
	};
}

export function buildWorkflowRunStructuredModelFromSync(
	command: string,
	result: unknown,
): WorkflowRunStructuredModel {
	const base: Pick<
		WorkflowRunStructuredModel,
		| "outcome"
		| "command"
		| "run_id"
		| "resultPayload"
		| "errorMessage"
		| "errorDetails"
		| "lastHeartbeatActivity"
	> = {
		outcome: "success",
		command,
		run_id: undefined,
		resultPayload: result,
		errorMessage: undefined,
		errorDetails: undefined,
		lastHeartbeatActivity: null,
	};
	return summarizeResultIntoModel(base, command, result, {
		timeline: [],
		batchRows: [],
		logMessages: [],
	});
}
