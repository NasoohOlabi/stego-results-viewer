import { readFile } from "fs/promises";

export const API_LOG_FILE_PATH = "D:/Master/code/stego-side-wing/logs/api.jsonl";

export type ApiLogEntry = {
	id: string;
	lineNumber: number;
	ts: string | null;
	level: string | null;
	logger: string | null;
	msg: string;
	event: string | null;
	method: string | null;
	path: string | null;
	status: number | null;
	durationMs: number | null;
	requestId: string | null;
	runId: string | null;
	command: string | null;
	mode: string | null;
	action: string | null;
	component: string | null;
	raw: Record<string, unknown>;
};

type ParseWarning = { lineNumber: number; reason: string };

function toObject(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function toStringOrNull(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseApiLogLine(rawLine: string, lineNumber: number): ApiLogEntry | null {
	const trimmed = rawLine.trim();
	if (!trimmed) return null;

	let parsedUnknown: unknown;
	try {
		parsedUnknown = JSON.parse(trimmed);
	} catch {
		return null;
	}

	const parsed = toObject(parsedUnknown);
	if (!parsed) return null;

	const ts = toStringOrNull(parsed.ts);
	const level = toStringOrNull(parsed.level);
	const logger = toStringOrNull(parsed.logger);
	const msg = toStringOrNull(parsed.msg) ?? "";
	const event = toStringOrNull(parsed.event);
	const method = toStringOrNull(parsed.method);
	const path = toStringOrNull(parsed.path);
	const status = toNumberOrNull(parsed.status);
	const durationMs = toNumberOrNull(parsed.duration_ms);
	const requestId = toStringOrNull(parsed.request_id);
	const runId = toStringOrNull(parsed.run_id);
	const command = toStringOrNull(parsed.command);
	const mode = toStringOrNull(parsed.mode);
	const action = toStringOrNull(parsed.action);
	const component = toStringOrNull(parsed.component);

	return {
		id: `${lineNumber}:${ts ?? "no-ts"}`,
		lineNumber,
		ts,
		level,
		logger,
		msg,
		event,
		method,
		path,
		status,
		durationMs,
		requestId,
		runId,
		command,
		mode,
		action,
		component,
		raw: parsed
	};
}

export function compareApiLogEntriesDesc(a: ApiLogEntry, b: ApiLogEntry): number {
	const at = Date.parse(a.ts ?? "");
	const bt = Date.parse(b.ts ?? "");
	const safeAt = Number.isFinite(at) ? at : 0;
	const safeBt = Number.isFinite(bt) ? bt : 0;
	if (safeBt !== safeAt) return safeBt - safeAt;
	return b.lineNumber - a.lineNumber;
}

export function parseApiLogContent(content: string): {
	entries: ApiLogEntry[];
	warnings: ParseWarning[];
	totalLines: number;
} {
	const lines = content.split(/\r?\n/);
	const entries: ApiLogEntry[] = [];
	const warnings: ParseWarning[] = [];

	for (let i = 0; i < lines.length; i += 1) {
		const lineNumber = i + 1;
		const rawLine = lines[i];
		if (!rawLine || !rawLine.trim()) continue;
		const parsed = parseApiLogLine(rawLine, lineNumber);
		if (!parsed) {
			warnings.push({ lineNumber, reason: "Invalid JSON log line" });
			continue;
		}
		entries.push(parsed);
	}

	entries.sort(compareApiLogEntriesDesc);
	return { entries, warnings, totalLines: lines.length };
}

export async function readApiLogSnapshot(limit = 1000): Promise<{
	entries: ApiLogEntry[];
	warnings: ParseWarning[];
	totalLines: number;
	totalEntries: number;
}> {
	const content = await readFile(API_LOG_FILE_PATH, "utf-8");
	const parsed = parseApiLogContent(content);
	const safeLimit = Math.max(1, Math.min(limit, 5000));

	return {
		entries: parsed.entries.slice(0, safeLimit),
		warnings: parsed.warnings,
		totalLines: parsed.totalLines,
		totalEntries: parsed.entries.length
	};
}
