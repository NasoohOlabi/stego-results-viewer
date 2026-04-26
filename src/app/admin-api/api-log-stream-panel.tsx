"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { ADMIN_API_STORAGE_KEY } from "./types";

type ApiLogEntry =
	inferRouterOutputs<AppRouter>["promptLogs"]["getApiEntries"]["entries"][number];

type FailureClass = "transport" | "contract" | "validation" | "other" | null;

type DerivedLogEntry = ApiLogEntry & {
	componentLabel: string;
	timestampMs: number;
	postId: string | null;
	traceId: string | null;
	attemptCurrent: number | null;
	attemptMax: number | null;
	selectedIdx: number | null;
	decodedIndices: number[];
	provider: string | null;
	model: string | null;
	errorKind: string | null;
	httpStatus: number | null;
	retryable: boolean;
	responseSnippet: string | null;
	promptHash: string | null;
	systemPromptHash: string | null;
	failureClass: FailureClass;
	isRetry: boolean;
	isError: boolean;
	isWarning: boolean;
	isTerminal: boolean;
};

type RunSummary = {
	id: string;
	runId: string | null;
	label: string;
	entries: DerivedLogEntry[];
	postCount: number;
	status: "success" | "partial failure" | "failed" | "in progress";
	startedAt: string | null;
	endedAt: string | null;
	durationMs: number | null;
	command: string | null;
	errorCount: number;
	warningCount: number;
	postsFailed: number;
	postsSucceeded: number;
	topErrorKind: string | null;
	postSummaries: PostSummary[];
};

type PostSummary = {
	id: string;
	postId: string;
	entries: DerivedLogEntry[];
	status: "failed" | "warning" | "ok" | "in progress";
	attemptCount: number;
	llmRetryCount: number;
	finalErrorKind: string | null;
	selectedIdx: number | null;
	decodedIndicesLast: number[];
	hadTransportError: boolean;
	hadContractError: boolean;
	hadValidationError: boolean;
	lastMessage: string;
};

type StateLogsPayload = {
	file_logging_enabled: boolean;
	path: string | null;
	bytes: number;
};

function formatTs(ts: string | null): string {
	if (!ts) return "n/a";
	const parsed = Date.parse(ts);
	if (!Number.isFinite(parsed)) return ts;
	return new Date(parsed).toLocaleString();
}

function formatDuration(ms: number | null): string {
	if (typeof ms !== "number" || !Number.isFinite(ms)) return "n/a";
	if (ms < 1000) return `${Math.round(ms)} ms`;
	const seconds = ms / 1000;
	if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
	const minutes = Math.floor(seconds / 60);
	const remSeconds = Math.round(seconds % 60);
	return `${minutes}m ${remSeconds}s`;
}

function statusGroup(value: number | null): "2xx" | "4xx" | "5xx" | "other" {
	if (typeof value !== "number") return "other";
	if (value >= 200 && value < 300) return "2xx";
	if (value >= 400 && value < 500) return "4xx";
	if (value >= 500 && value < 600) return "5xx";
	return "other";
}

function readPersistedAdminApiBase(): string {
	const fallback = "http://localhost:5001/api/v1";
	if (typeof window === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as { baseUrl?: string };
		const baseUrl = parsed.baseUrl?.trim();
		if (baseUrl) return baseUrl.replace(/\/+$/, "");
	} catch {
		// ignore
	}
	return fallback;
}

function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return "-";
	if (n < 1024) return `${Math.round(n)} B`;
	const units = ["KB", "MB", "GB", "TB"] as const;
	let value = n / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

function upsertEntries(
	prev: ApiLogEntry[],
	incoming: ApiLogEntry[],
): ApiLogEntry[] {
	const map = new Map(prev.map((entry) => [entry.id, entry]));
	for (const entry of incoming) {
		map.set(entry.id, entry);
	}
	return Array.from(map.values()).sort((a, b) => {
		const at = Date.parse(a.ts ?? "");
		const bt = Date.parse(b.ts ?? "");
		const safeAt = Number.isFinite(at) ? at : 0;
		const safeBt = Number.isFinite(bt) ? bt : 0;
		if (safeBt !== safeAt) return safeBt - safeAt;
		return b.lineNumber - a.lineNumber;
	});
}

function getEntryTags(entry: ApiLogEntry): string[] {
	const raw = entry.raw;
	const out = new Set<string>();

	const add = (value: unknown) => {
		if (typeof value !== "string") return;
		const trimmed = value.trim();
		if (trimmed) out.add(trimmed);
	};

	add(raw.tag);

	if (Array.isArray(raw.tags)) {
		for (const item of raw.tags) add(item);
	}

	const data = asRecord(raw.data);
	if (data) {
		add(data.tag);
		if (Array.isArray(data.tags)) {
			for (const item of data.tags) add(item);
		}
	}

	return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function mergeTagIdLists(catalogIds: string[], entryTags: Set<string>): string[] {
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const id of catalogIds) {
		if (!seen.has(id)) {
			seen.add(id);
			ordered.push(id);
		}
	}
	const rest = Array.from(entryTags)
		.filter((id) => !seen.has(id))
		.sort((a, b) => a.localeCompare(b));
	return [...ordered, ...rest];
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function readCandidates(raw: Record<string, unknown>): unknown[] {
	const extra = asRecord(raw.extra);
	const data = asRecord(raw.data);
	return [raw, extra, data].filter(Boolean) as Record<string, unknown>[];
}

function pickString(raw: Record<string, unknown>, keys: string[]): string | null {
	for (const source of readCandidates(raw)) {
		for (const key of keys) {
			const value = source[key];
			if (typeof value === "string" && value.trim()) return value.trim();
		}
	}
	return null;
}

function pickNumber(raw: Record<string, unknown>, keys: string[]): number | null {
	for (const source of readCandidates(raw)) {
		for (const key of keys) {
			const value = source[key];
			if (typeof value === "number" && Number.isFinite(value)) return value;
		}
	}
	return null;
}

function pickBoolean(raw: Record<string, unknown>, keys: string[]): boolean | null {
	for (const source of readCandidates(raw)) {
		for (const key of keys) {
			const value = source[key];
			if (typeof value === "boolean") return value;
		}
	}
	return null;
}

function extractMatch(message: string, pattern: RegExp): string | null {
	const match = pattern.exec(message);
	return match?.[1] ?? null;
}

function extractAttempt(message: string): {
	current: number | null;
	max: number | null;
} {
	const slashMatch = /\battempt=(\d+)\/(\d+)\b/i.exec(message);
	if (slashMatch) {
		return {
			current: Number(slashMatch[1]),
			max: Number(slashMatch[2]),
		};
	}
	const singleMatch = /\battempt=(\d+)\b/i.exec(message);
	if (singleMatch) {
		return {
			current: Number(singleMatch[1]),
			max: null,
		};
	}
	return { current: null, max: null };
}

function extractDecodedIndices(message: string): number[] {
	const match = /\bdecoded_indices=\[([^\]]*)\]/i.exec(message);
	if (!match?.[1]) return [];
	return match[1]
		.split(",")
		.map((part) => Number(part.trim()))
		.filter((value) => Number.isFinite(value));
}

function classifyFailure(entry: {
	msg: string;
	errorKind: string | null;
	isError: boolean;
	isWarning: boolean;
}): FailureClass {
	const haystack = `${entry.msg} ${entry.errorKind ?? ""}`.toLowerCase();

	if (
		haystack.includes("validation failed") ||
		haystack.includes("decoded_indices") ||
		haystack.includes("selected_idx") ||
		haystack.includes("mismatch")
	) {
		return "validation";
	}

	if (
		haystack.includes("connectionreseterror") ||
		haystack.includes("remote disconnected") ||
		haystack.includes("remotedisconnected") ||
		haystack.includes("timeout") ||
		haystack.includes("connection error") ||
		haystack.includes("connectionerror") ||
		haystack.includes("http 5") ||
		haystack.includes("5xx")
	) {
		return "transport";
	}

	if (
		haystack.includes("invalid json") ||
		haystack.includes("malformed") ||
		haystack.includes("contract") ||
		haystack.includes("format") ||
		haystack.includes("<|channel|>") ||
		haystack.includes("control token")
	) {
		return "contract";
	}

	if (entry.isError || entry.isWarning) return "other";
	return null;
}

function deriveEntries(entries: ApiLogEntry[]): DerivedLogEntry[] {
	return entries.map((entry) => {
		const msg = entry.msg ?? "";
		const attempt = extractAttempt(msg);
		const errorKind = pickString(entry.raw, ["error_kind", "exception_type", "type"]);
		const retryable = pickBoolean(entry.raw, ["retryable"]) ?? /retry/i.test(msg);
		const componentLabel =
			entry.component ?? entry.logger ?? "unknown component";
		const isError =
			(entry.level ?? "").toLowerCase() === "error" ||
			(entry.status ?? 0) >= 500 ||
			Boolean(errorKind);
		const isWarning =
			(entry.level ?? "").toLowerCase() === "warning" ||
			(entry.level ?? "").toLowerCase() === "warn" ||
			(entry.status ?? 0) >= 400;
		const isRetry =
			entry.event === "llm_request_retry" ||
			retryable ||
			/\bretry\b/i.test(msg);
		const isTerminal =
			entry.event === "workflow_run_end" ||
			entry.event === "llm_request_failed" ||
			/\bsucceeded=false\b/i.test(msg) ||
			/\breason=/i.test(msg) ||
			/\bretries exhausted\b/i.test(msg) ||
			/\bfinal failure\b/i.test(msg);
		const timestampMs = Date.parse(entry.ts ?? "");
		return {
			...entry,
			componentLabel,
			timestampMs: Number.isFinite(timestampMs) ? timestampMs : 0,
			postId:
				pickString(entry.raw, ["post_id"]) ??
				extractMatch(msg, /\bpost_id=([A-Za-z0-9_-]+)\b/i),
			traceId: pickString(entry.raw, ["trace_id"]),
			attemptCurrent: attempt.current,
			attemptMax: attempt.max,
			selectedIdx:
				pickNumber(entry.raw, ["selected_idx"]) ??
				(() => {
					const value = extractMatch(msg, /\bselected_idx=(\d+)\b/i);
					return value ? Number(value) : null;
				})(),
			decodedIndices: extractDecodedIndices(msg),
			provider: pickString(entry.raw, ["provider"]),
			model: pickString(entry.raw, ["model"]),
			errorKind,
			httpStatus: pickNumber(entry.raw, ["http_status"]) ?? entry.status,
			retryable,
			responseSnippet: pickString(entry.raw, ["response_snippet"]),
			promptHash: pickString(entry.raw, ["prompt_hash"]),
			systemPromptHash: pickString(entry.raw, ["system_prompt_hash"]),
			failureClass: classifyFailure({ msg, errorKind, isError, isWarning }),
			isRetry,
			isError,
			isWarning,
			isTerminal,
		};
	});
}

function buildRunSummaries(entries: DerivedLogEntry[]): RunSummary[] {
	const runs = new Map<string, DerivedLogEntry[]>();

	for (const entry of entries) {
		const key = entry.runId ?? "__no_run__";
		const bucket = runs.get(key);
		if (bucket) {
			bucket.push(entry);
		} else {
			runs.set(key, [entry]);
		}
	}

	return Array.from(runs.entries())
		.map(([key, runEntries]) => {
			const ordered = [...runEntries].sort((a, b) => {
				if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
				return a.lineNumber - b.lineNumber;
			});
			const command =
				ordered.find((entry) => entry.command)?.command ?? null;
			const postMap = new Map<string, DerivedLogEntry[]>();
			for (const entry of ordered) {
				if (!entry.postId) continue;
				const bucket = postMap.get(entry.postId);
				if (bucket) {
					bucket.push(entry);
				} else {
					postMap.set(entry.postId, [entry]);
				}
			}
			const postSummaries = Array.from(postMap.entries())
				.map(([postId, postEntries]) => buildPostSummary(postId, postEntries))
				.sort((a, b) => {
					const rank = statusRank(b.status) - statusRank(a.status);
					if (rank !== 0) return rank;
					return b.entries[b.entries.length - 1]?.timestampMs - a.entries[a.entries.length - 1]?.timestampMs;
				});

			const errorCounts = new Map<string, number>();
			for (const entry of ordered) {
				const key = entry.errorKind ?? entry.failureClass ?? null;
				if (!key) continue;
				errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
			}
			const topErrorKind =
				Array.from(errorCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
				null;

			const endEntry = [...ordered]
				.reverse()
				.find((entry) => entry.event === "workflow_run_end" || entry.isTerminal);
			const hasTerminalFailure =
				ordered.some((entry) => entry.isTerminal && entry.failureClass !== null) ||
				ordered.some((entry) => entry.isError);
			const hasWarnings = ordered.some((entry) => entry.isWarning || entry.isRetry);
			const hasEnd = ordered.some((entry) => entry.event === "workflow_run_end");

			let status: RunSummary["status"] = "in progress";
			if (hasEnd && !hasTerminalFailure && !hasWarnings) status = "success";
			else if (hasEnd && !hasTerminalFailure && hasWarnings) status = "partial failure";
			else if (hasTerminalFailure) status = "failed";

			const startedAt = ordered[0]?.ts ?? null;
			const endedAt = endEntry?.ts ?? ordered.at(-1)?.ts ?? null;
			const durationMs =
				startedAt && endedAt
					? Math.max(0, Date.parse(endedAt) - Date.parse(startedAt))
					: null;

			return {
				id: key,
				runId: key === "__no_run__" ? null : key,
				label: key === "__no_run__" ? "No run_id" : key,
				entries: ordered,
				postCount: postSummaries.length,
				status,
				startedAt,
				endedAt,
				durationMs: Number.isFinite(durationMs ?? NaN) ? durationMs : null,
				command,
				errorCount: ordered.filter((entry) => entry.isError).length,
				warningCount: ordered.filter((entry) => entry.isWarning || entry.isRetry).length,
				postsFailed: postSummaries.filter((post) => post.status === "failed").length,
				postsSucceeded: postSummaries.filter((post) => post.status === "ok").length,
				topErrorKind,
				postSummaries,
			};
		})
		.sort((a, b) => {
			const rank = statusRank(b.status) - statusRank(a.status);
			if (rank !== 0) return rank;
			const bt = b.entries[b.entries.length - 1]?.timestampMs ?? 0;
			const at = a.entries[a.entries.length - 1]?.timestampMs ?? 0;
			return bt - at;
		});
}

function buildPostSummary(postId: string, entries: DerivedLogEntry[]): PostSummary {
	const ordered = [...entries].sort((a, b) => {
		if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
		return a.lineNumber - b.lineNumber;
	});
	const attemptCount = ordered.reduce((max, entry) => {
		return Math.max(max, entry.attemptCurrent ?? 0);
	}, 0);
	const selectedIdx =
		[...ordered]
			.reverse()
			.find((entry) => typeof entry.selectedIdx === "number")?.selectedIdx ?? null;
	const decodedIndicesLast =
		[...ordered]
			.reverse()
			.find((entry) => entry.decodedIndices.length > 0)?.decodedIndices ?? [];
	const finalErrorEntry = [...ordered]
		.reverse()
		.find((entry) => entry.isTerminal || entry.isError || entry.failureClass);
	const hadTransportError = ordered.some((entry) => entry.failureClass === "transport");
	const hadContractError = ordered.some((entry) => entry.failureClass === "contract");
	const hadValidationError = ordered.some((entry) => entry.failureClass === "validation");
	let status: PostSummary["status"] = "in progress";
	if (finalErrorEntry?.isTerminal || finalErrorEntry?.isError) status = "failed";
	else if (ordered.some((entry) => entry.isWarning || entry.isRetry)) status = "warning";
	else if (ordered.length > 0) status = "ok";

	return {
		id: postId,
		postId,
		entries: ordered,
		status,
		attemptCount,
		llmRetryCount: ordered.filter((entry) => entry.isRetry).length,
		finalErrorKind:
			finalErrorEntry?.errorKind ??
			finalErrorEntry?.failureClass ??
			null,
		selectedIdx,
		decodedIndicesLast,
		hadTransportError,
		hadContractError,
		hadValidationError,
		lastMessage: ordered.at(-1)?.msg ?? "",
	};
}

function statusRank(
	status: RunSummary["status"] | PostSummary["status"],
): number {
	switch (status) {
		case "failed":
			return 4;
		case "partial failure":
			return 3;
		case "warning":
			return 2;
		case "in progress":
			return 1;
		case "success":
		case "ok":
			return 0;
		default:
			return 0;
	}
}

function getStatusTone(status: RunSummary["status"] | PostSummary["status"]): string {
	switch (status) {
		case "failed":
			return "border-red-500/30 bg-red-500/10 text-red-100";
		case "partial failure":
		case "warning":
			return "border-amber-500/30 bg-amber-500/10 text-amber-100";
		case "success":
		case "ok":
			return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
		case "in progress":
		default:
			return "border-sky-500/30 bg-sky-500/10 text-sky-100";
	}
}

function getFailureTone(failureClass: FailureClass): string {
	switch (failureClass) {
		case "transport":
			return "border-red-500/30 bg-red-500/10 text-red-100";
		case "contract":
			return "border-orange-500/30 bg-orange-500/10 text-orange-100";
		case "validation":
			return "border-amber-500/30 bg-amber-500/10 text-amber-100";
		case "other":
			return "border-zinc-500/30 bg-zinc-500/20 text-zinc-100";
		default:
			return "border-white/10 bg-white/10 text-white/70";
	}
}

function getLevelTone(entry: DerivedLogEntry): string {
	if (entry.isTerminal || entry.isError) return "border-red-500/30 bg-red-500/10 text-red-100";
	if (entry.failureClass === "validation" || entry.isRetry) {
		return "border-amber-500/30 bg-amber-500/10 text-amber-100";
	}
	if (entry.event === "workflow_run_register" || entry.event === "workflow_run_end") {
		return "border-sky-500/30 bg-sky-500/10 text-sky-100";
	}
	return "border-white/10 bg-white/10 text-white/70";
}

function buildEvidenceLine(post: PostSummary): string {
	const parts: string[] = [];
	if (post.hadTransportError) parts.push("transport errors");
	if (post.hadContractError) parts.push("contract failures");
	if (post.hadValidationError) parts.push("validation mismatches");
	if (parts.length === 0) parts.push("no classified failures");
	return `${post.postId} ${post.status} after ${Math.max(post.attemptCount, 1)} attempt(s): ${parts.join(", ")}`;
}

function MetricCard(props: {
	label: string;
	value: string;
	tone?: string;
	hint?: string | null;
}) {
	return (
		<div className={cn("rounded-xl border p-3", props.tone ?? "border-white/10 bg-white/5")}>
			<div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
				{props.label}
			</div>
			<div className="mt-2 text-xl font-semibold text-white">{props.value}</div>
			{props.hint ? (
				<div className="mt-1 text-xs text-white/55">{props.hint}</div>
			) : null}
		</div>
	);
}

export function ApiLogStreamPanel() {
	const [limit, setLimit] = useState("1200");
	const [entries, setEntries] = useState<ApiLogEntry[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedRunId, setSelectedRunId] = useState<string>("all");
	const [selectedPostId, setSelectedPostId] = useState<string>("all");
	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState("all");
	const [componentFilter, setComponentFilter] = useState("all");
	const [methodFilter, setMethodFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [failureFilter, setFailureFilter] = useState("all");
	const [liveEnabled, setLiveEnabled] = useState(true);
	const [onlyErrors, setOnlyErrors] = useState(false);
	const [onlyRetries, setOnlyRetries] = useState(false);
	const [onlyTerminal, setOnlyTerminal] = useState(false);
	const [streamState, setStreamState] = useState<"idle" | "connected" | "error">("idle");
	const [streamError, setStreamError] = useState<string | null>(null);
	const [stateLogsBase, setStateLogsBase] = useState("");
	const [stateLogs, setStateLogs] = useState<StateLogsPayload | null>(null);
	const [stateLogsLoading, setStateLogsLoading] = useState(false);
	const [stateLogsError, setStateLogsError] = useState<string | null>(null);
	const [truncateBusy, setTruncateBusy] = useState(false);
	const [tagCatalog, setTagCatalog] = useState<
		Array<{ id: string; description: string }>
	>([]);
	const [tagCatalogLoading, setTagCatalogLoading] = useState(false);
	const [tagCatalogError, setTagCatalogError] = useState<string | null>(null);
	const [tagFilterSelected, setTagFilterSelected] = useState<string[]>([]);
	const [tagExcludeSelected, setTagExcludeSelected] = useState<string[]>([]);
	const [onlyUntagged, setOnlyUntagged] = useState(false);

	const tagCatalogFetchedOnceRef = useRef(false);
	const stateLogsFetchedOnceRef = useRef(false);

	const numericLimit = Math.max(1, Math.min(Number(limit || "1200"), 5000));

	const {
		data,
		isLoading,
		error,
		refetch: refetchSnapshot,
	} = api.promptLogs.getApiEntries.useQuery(
		{ limit: numericLimit },
		{ refetchOnWindowFocus: false },
	);

	const refreshTagCatalog = useCallback(async () => {
		const base = readPersistedAdminApiBase();
		if (!tagCatalogFetchedOnceRef.current) {
			setTagCatalogLoading(true);
		}
		setTagCatalogError(null);
		try {
			const res = await fetch(`${base}/logging/tags`);
			const json = (await res.json()) as {
				ok?: boolean;
				data?: {
					tags?: Array<{ id?: string; description?: string }>;
					tag_ids?: string[];
				};
				error?: string;
			};
			if (!res.ok || json.ok === false) {
				setTagCatalog([]);
				setTagCatalogError(json.error ?? `HTTP ${res.status}`);
				return;
			}
			const payload = json.data;
			const pairs: Array<{ id: string; description: string }> = [];
			if (Array.isArray(payload?.tags)) {
				for (const row of payload.tags) {
					if (
						row &&
						typeof row.id === "string" &&
						typeof row.description === "string"
					) {
						pairs.push({ id: row.id, description: row.description });
					}
				}
			}
			if (pairs.length > 0) {
				setTagCatalog(pairs);
				return;
			}
			if (Array.isArray(payload?.tag_ids)) {
				setTagCatalog(
					payload.tag_ids
						.filter((id): id is string => typeof id === "string")
						.map((id) => ({ id, description: "" })),
				);
				return;
			}
			setTagCatalog([]);
		} catch (e) {
			setTagCatalog([]);
			setTagCatalogError(e instanceof Error ? e.message : String(e));
		} finally {
			setTagCatalogLoading(false);
			tagCatalogFetchedOnceRef.current = true;
		}
	}, []);

	const refreshStateLogs = useCallback(async () => {
		const base = readPersistedAdminApiBase();
		setStateLogsBase(base);
		if (!stateLogsFetchedOnceRef.current) {
			setStateLogsLoading(true);
		}
		setStateLogsError(null);
		try {
			const res = await fetch(`${base}/state/logs`);
			const json = (await res.json()) as {
				ok?: boolean;
				data?: StateLogsPayload;
				error?: string;
			};
			if (!res.ok || json.ok === false) {
				setStateLogs(null);
				setStateLogsError(json.error ?? `HTTP ${res.status}`);
				return;
			}
			setStateLogs(json.data ?? null);
		} catch (e) {
			setStateLogs(null);
			setStateLogsError(e instanceof Error ? e.message : String(e));
		} finally {
			setStateLogsLoading(false);
			stateLogsFetchedOnceRef.current = true;
		}
	}, []);

	const truncateServerLogFile = useCallback(async () => {
		if (
			!window.confirm(
				"Truncate the API JSONL log file on the server to 0 bytes? This cannot be undone.",
			)
		) {
			return;
		}
		const base = readPersistedAdminApiBase();
		setStateLogsBase(base);
		setTruncateBusy(true);
		setStateLogsError(null);
		try {
			const res = await fetch(`${base}/state/logs`, { method: "DELETE" });
			const json = (await res.json()) as {
				ok?: boolean;
				error?: string;
			};
			if (!res.ok || json.ok === false) {
				setStateLogsError(json.error ?? `HTTP ${res.status}`);
				return;
			}
			await refreshStateLogs();
			void refetchSnapshot();
		} catch (e) {
			setStateLogsError(e instanceof Error ? e.message : String(e));
		} finally {
			setTruncateBusy(false);
		}
	}, [refreshStateLogs, refetchSnapshot]);

	useEffect(() => {
		void refreshStateLogs();
	}, [refreshStateLogs]);

	useEffect(() => {
		void refreshTagCatalog();
	}, [refreshTagCatalog]);

	useEffect(() => {
		const onStorage = (e: StorageEvent) => {
			if (e.key === ADMIN_API_STORAGE_KEY) {
				void refreshStateLogs();
				void refreshTagCatalog();
			}
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [refreshStateLogs, refreshTagCatalog]);

	useEffect(() => {
		if (!data?.entries) return;
		setEntries(data.entries);
	}, [data]);

	useEffect(() => {
		if (!liveEnabled) {
			setStreamState("idle");
			setStreamError(null);
			return;
		}

		const source = new EventSource(`/api/prompt-logs/stream?backfill=${numericLimit}`);
		setStreamState("idle");
		setStreamError(null);

		source.addEventListener("init", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			const initialEntries = Array.isArray(payload.entries) ? payload.entries : [];
			setEntries((prev) => {
				if (initialEntries.length === 0 && prev.length > 0) return prev;
				return initialEntries;
			});
			setStreamState("connected");
		});

		source.addEventListener("append", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			if (!Array.isArray(payload.entries) || payload.entries.length === 0) return;
			setEntries((prev) => upsertEntries(prev, payload.entries ?? []));
			setStreamState("connected");
		});

		source.addEventListener("reset", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			const resetEntries = Array.isArray(payload.entries) ? payload.entries : [];
			setEntries((prev) => {
				if (resetEntries.length === 0 && prev.length > 0) {
					void refetchSnapshot();
					return prev;
				}
				return resetEntries;
			});
			setStreamState("connected");
		});

		source.addEventListener("error", (event) => {
			try {
				const payload = JSON.parse((event as MessageEvent).data) as {
					message?: string;
				};
				setStreamError(payload.message ?? "Stream error");
			} catch {
				setStreamError("Stream disconnected");
			}
			setStreamState("error");
		});

		return () => source.close();
	}, [liveEnabled, numericLimit, refetchSnapshot]);

	const derivedEntries = useMemo(() => deriveEntries(entries), [entries]);

	const levelOptions = useMemo(
		() =>
			Array.from(
				new Set(
					derivedEntries
						.map((entry) => entry.level)
						.filter((value): value is string => Boolean(value)),
				),
			).sort((a, b) => a.localeCompare(b)),
		[derivedEntries],
	);

	const componentOptions = useMemo(
		() =>
			Array.from(new Set(derivedEntries.map((entry) => entry.componentLabel))).sort(
				(a, b) => a.localeCompare(b),
			),
		[derivedEntries],
	);

	const methodOptions = useMemo(
		() =>
			Array.from(
				new Set(
					derivedEntries
						.map((entry) => entry.method)
						.filter((value): value is string => Boolean(value)),
				),
			).sort((a, b) => a.localeCompare(b)),
		[derivedEntries],
	);

	const tagDescriptionById = useMemo(() => {
		const map = new Map<string, string>();
		for (const row of tagCatalog) {
			if (row.description.trim()) map.set(row.id, row.description);
		}
		return map;
	}, [tagCatalog]);

	const tagsByEntryId = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const entry of derivedEntries) {
			map.set(entry.id, getEntryTags(entry));
		}
		return map;
	}, [derivedEntries]);

	const tagChipOptions = useMemo(() => {
		const seenInEntries = new Set<string>();
		for (const tags of tagsByEntryId.values()) {
			for (const tag of tags) seenInEntries.add(tag);
		}
		return mergeTagIdLists(
			tagCatalog.map((tag) => tag.id),
			seenInEntries,
		);
	}, [tagCatalog, tagsByEntryId]);

	const filteredEntries = useMemo(() => {
		const query = search.trim().toLowerCase();
		return derivedEntries.filter((entry) => {
			if (selectedRunId !== "all" && (entry.runId ?? "__no_run__") !== selectedRunId) {
				return false;
			}
			if (selectedPostId !== "all" && entry.postId !== selectedPostId) return false;
			if (levelFilter !== "all" && entry.level !== levelFilter) return false;
			if (componentFilter !== "all" && entry.componentLabel !== componentFilter) {
				return false;
			}
			if (methodFilter !== "all" && entry.method !== methodFilter) return false;
			if (statusFilter !== "all" && statusGroup(entry.status) !== statusFilter) {
				return false;
			}
			if (failureFilter !== "all" && entry.failureClass !== failureFilter) {
				return false;
			}
			if (onlyErrors && !entry.isError && !entry.isTerminal) return false;
			if (onlyRetries && !entry.isRetry) return false;
			if (onlyTerminal && !entry.isTerminal) return false;

			const entryTags = tagsByEntryId.get(entry.id) ?? [];
			if (onlyUntagged) {
				if (entryTags.length > 0) return false;
			} else if (tagFilterSelected.length > 0) {
				const selected = new Set(tagFilterSelected);
				if (!entryTags.some((tag) => selected.has(tag))) return false;
			}

			if (tagExcludeSelected.length > 0) {
				const excluded = new Set(tagExcludeSelected);
				if (entryTags.some((tag) => excluded.has(tag))) return false;
			}

			if (!query) return true;
			const blob = [
				entry.ts ?? "",
				entry.level ?? "",
				entry.componentLabel,
				entry.msg ?? "",
				entry.method ?? "",
				entry.path ?? "",
				entry.event ?? "",
				String(entry.status ?? ""),
				entry.requestId ?? "",
				entry.runId ?? "",
				entry.command ?? "",
				entry.postId ?? "",
				entry.traceId ?? "",
				entry.errorKind ?? "",
				entry.provider ?? "",
				entry.model ?? "",
				...entryTags,
			]
				.join(" ")
				.toLowerCase();
			return blob.includes(query);
		});
	}, [
		componentFilter,
		derivedEntries,
		failureFilter,
		levelFilter,
		methodFilter,
		onlyErrors,
		onlyRetries,
		onlyTerminal,
		onlyUntagged,
		search,
		selectedPostId,
		selectedRunId,
		statusFilter,
		tagExcludeSelected,
		tagFilterSelected,
		tagsByEntryId,
	]);

	const runSummaries = useMemo(() => buildRunSummaries(filteredEntries), [filteredEntries]);

	useEffect(() => {
		if (selectedRunId === "all") return;
		if (!runSummaries.some((run) => run.id === selectedRunId)) {
			setSelectedRunId("all");
		}
	}, [runSummaries, selectedRunId]);

	const selectedRun = useMemo(
		() => runSummaries.find((run) => run.id === selectedRunId) ?? null,
		[runSummaries, selectedRunId],
	);

	useEffect(() => {
		if (!selectedRun) {
			setSelectedPostId("all");
			return;
		}
		if (
			selectedPostId !== "all" &&
			!selectedRun.postSummaries.some((post) => post.postId === selectedPostId)
		) {
			setSelectedPostId("all");
		}
	}, [selectedPostId, selectedRun]);

	const visibleEntries = useMemo(() => {
		const base = [...filteredEntries];
		if (selectedRun) {
			base.sort((a, b) => {
				if (a.timestampMs !== b.timestampMs) return a.timestampMs - b.timestampMs;
				return a.lineNumber - b.lineNumber;
			});
			return base;
		}
		base.sort((a, b) => {
			if (b.timestampMs !== a.timestampMs) return b.timestampMs - a.timestampMs;
			return b.lineNumber - a.lineNumber;
		});
		return base;
	}, [filteredEntries, selectedRun]);

	useEffect(() => {
		if (visibleEntries.length === 0) {
			setSelectedId(null);
			return;
		}
		setSelectedId((current) => {
			if (current && visibleEntries.some((entry) => entry.id === current)) return current;
			const terminal = [...visibleEntries].reverse().find((entry) => entry.isTerminal);
			return terminal?.id ?? visibleEntries[0]?.id ?? null;
		});
	}, [visibleEntries]);

	const selectedEntry = useMemo(
		() => visibleEntries.find((entry) => entry.id === selectedId) ?? null,
		[selectedId, visibleEntries],
	);

	const selectedEntryTags = selectedEntry ? tagsByEntryId.get(selectedEntry.id) ?? [] : [];

	const totals = useMemo(() => {
		const runs = buildRunSummaries(derivedEntries);
		return {
			runCount: runs.length,
			terminalCount: derivedEntries.filter((entry) => entry.isTerminal).length,
			errorCount: derivedEntries.filter((entry) => entry.isError).length,
			warningCount: derivedEntries.filter((entry) => entry.isWarning || entry.isRetry).length,
		};
	}, [derivedEntries]);

	const toggleTagFilter = useCallback((id: string) => {
		setOnlyUntagged(false);
		setTagExcludeSelected((prev) => prev.filter((value) => value !== id));
		setTagFilterSelected((prev) =>
			prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
		);
	}, []);

	const toggleTagExclude = useCallback((id: string) => {
		setOnlyUntagged(false);
		setTagFilterSelected((prev) => prev.filter((value) => value !== id));
		setTagExcludeSelected((prev) =>
			prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
		);
	}, []);

	const clearTagFilter = useCallback(() => {
		setTagFilterSelected([]);
		setTagExcludeSelected([]);
		setOnlyUntagged(false);
	}, []);

	return (
		<section className="space-y-4">
			<div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.9)]">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<h2 className="text-lg font-semibold text-white">Live log triage</h2>
						<p className="max-w-3xl text-sm text-white/55">
							Grouped for fast diagnosis: start from run, narrow to post, and surface the
							final line that explains the failure.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<span
							className={cn(
								"rounded-full border px-3 py-1 text-xs",
								streamState === "connected"
									? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
									: streamState === "error"
										? "border-red-500/30 bg-red-500/10 text-red-100"
										: "border-white/10 bg-white/5 text-white/70",
							)}
						>
							{streamState === "connected"
								? "stream connected"
								: streamState === "error"
									? "stream error"
									: "stream idle"}
						</span>
						<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
							{visibleEntries.length} visible events
						</span>
						{selectedRun ? (
							<span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-100">
								run {selectedRun.label}
							</span>
						) : null}
					</div>
				</div>

				<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					<MetricCard
						label="Loaded Entries"
						value={String(data?.totalEntries ?? derivedEntries.length)}
						hint={`${numericLimit} entry snapshot window`}
					/>
					<MetricCard
						label="Runs In View"
						value={String(totals.runCount)}
						hint={totals.runCount === 1 ? "single active run" : "grouped by run_id"}
					/>
					<MetricCard
						label="Errors + Terminal"
						value={`${totals.errorCount} / ${totals.terminalCount}`}
						tone="border-red-500/20 bg-red-500/8"
						hint="errors first, terminal lines highlighted"
					/>
					<MetricCard
						label="Warnings + Retries"
						value={String(totals.warningCount)}
						tone="border-amber-500/20 bg-amber-500/8"
						hint="retries and recoverable warnings"
					/>
				</div>
			</div>

			<div className="rounded-xl border border-white/10 bg-white/5 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-sm font-semibold text-white/90">Server log file</h2>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							disabled={stateLogsLoading}
							onClick={() => void refreshStateLogs()}
							className="rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs hover:bg-white/15 disabled:opacity-50"
						>
							Refresh from API
						</button>
						<button
							type="button"
							disabled={truncateBusy || stateLogsLoading || !stateLogs?.file_logging_enabled}
							onClick={() => void truncateServerLogFile()}
							className="rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-1.5 text-xs text-rose-100 hover:bg-rose-500/25 disabled:opacity-40"
						>
							Truncate on server
						</button>
					</div>
				</div>
				<p className="mt-1 text-[11px] text-white/50">
					<code className="text-white/70">GET/DELETE /state/logs</code>
					{stateLogsBase ? (
						<>
							{" "}
							- base <code className="text-white/70">{stateLogsBase}</code>
						</>
					) : null}
				</p>
				{stateLogsLoading ? (
					<p className="mt-2 text-xs text-white/55">Loading server log state...</p>
				) : stateLogs ? (
					<dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
							<dt className="text-white/50">File logging</dt>
							<dd className="font-mono text-white/85">
								{stateLogs.file_logging_enabled ? "enabled" : "disabled"}
							</dd>
						</div>
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 sm:col-span-2">
							<dt className="text-white/50">Path</dt>
							<dd className="break-all font-mono text-white/85">{stateLogs.path ?? "-"}</dd>
						</div>
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
							<dt className="text-white/50">On-disk size</dt>
							<dd className="font-mono text-white/85">{formatBytes(stateLogs.bytes)}</dd>
						</div>
					</dl>
				) : null}
				{stateLogsError ? (
					<p className="mt-2 text-xs text-red-200/90">{stateLogsError}</p>
				) : null}
			</div>

			<div className="grid grid-cols-1 gap-4 2xl:grid-cols-[380px_minmax(0,1fr)]">
				<aside className="space-y-4">
					<div className="rounded-xl border border-white/10 bg-white/5 p-4">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-semibold text-white/90">Filters</h3>
							<label className="flex items-center gap-2 text-xs text-white/70">
								<input
									type="checkbox"
									checked={liveEnabled}
									onChange={(e) => setLiveEnabled(e.target.checked)}
								/>
								Live stream
							</label>
						</div>
						<p className="mt-1 text-xs text-white/50">{data?.logFilePath ?? "Loading log path..."}</p>
						<div className="mt-3 grid grid-cols-2 gap-2">
							<input
								value={limit}
								onChange={(e) => setLimit(e.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
								placeholder="snapshot limit"
							/>
							<button
								type="button"
								onClick={() => void refetchSnapshot()}
								className="rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm hover:bg-white/15"
							>
								Reload snapshot
							</button>
						</div>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="mt-3 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="Search run_id, post_id, message, provider..."
						/>
						<div className="mt-3 grid grid-cols-2 gap-2">
							<select
								value={levelFilter}
								onChange={(e) => setLevelFilter(e.target.value)}
								aria-label="Filter logs by level"
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
							>
								<option value="all">All levels</option>
								{levelOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								aria-label="Filter logs by status class"
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
							>
								<option value="all">Any status class</option>
								<option value="2xx">2xx</option>
								<option value="4xx">4xx</option>
								<option value="5xx">5xx</option>
								<option value="other">other</option>
							</select>
							<select
								value={componentFilter}
								onChange={(e) => setComponentFilter(e.target.value)}
								aria-label="Filter logs by component"
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
							>
								<option value="all">All components</option>
								{componentOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
							<select
								value={methodFilter}
								onChange={(e) => setMethodFilter(e.target.value)}
								aria-label="Filter logs by HTTP method"
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
							>
								<option value="all">Any method</option>
								{methodOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
							<select
								value={failureFilter}
								onChange={(e) => setFailureFilter(e.target.value)}
								aria-label="Filter logs by failure class"
								className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
							>
								<option value="all">Any failure class</option>
								<option value="transport">Transport</option>
								<option value="contract">Contract</option>
								<option value="validation">Validation</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setOnlyErrors((value) => !value)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs",
									onlyErrors
										? "border-red-500/30 bg-red-500/10 text-red-100"
										: "border-white/10 bg-white/5 text-white/70",
								)}
							>
								Only errors
							</button>
							<button
								type="button"
								onClick={() => setOnlyRetries((value) => !value)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs",
									onlyRetries
										? "border-amber-500/30 bg-amber-500/10 text-amber-100"
										: "border-white/10 bg-white/5 text-white/70",
								)}
							>
								Only retries
							</button>
							<button
								type="button"
								onClick={() => setOnlyTerminal((value) => !value)}
								className={cn(
									"rounded-full border px-3 py-1 text-xs",
									onlyTerminal
										? "border-sky-500/30 bg-sky-500/10 text-sky-100"
										: "border-white/10 bg-white/5 text-white/70",
								)}
							>
								Only terminal failures
							</button>
						</div>
						<div className="mt-3 text-xs text-white/55">
							{isLoading
								? "Loading..."
								: `${filteredEntries.length} matching events of ${data?.totalEntries ?? derivedEntries.length}`}
						</div>
						{(error || streamError) && (
							<div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-100">
								{error?.message ?? streamError}
							</div>
						)}
					</div>

					<div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<h3 className="text-sm font-semibold text-white/90">Structured tags</h3>
							<div className="flex gap-2">
								<button
									type="button"
									disabled={tagCatalogLoading}
									onClick={() => void refreshTagCatalog()}
									className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15 disabled:opacity-50"
								>
									{tagCatalogLoading ? "Loading..." : "Refresh"}
								</button>
								<button
									type="button"
									disabled={
										tagFilterSelected.length === 0 &&
										tagExcludeSelected.length === 0 &&
										!onlyUntagged
									}
									onClick={clearTagFilter}
									className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15 disabled:opacity-40"
								>
									Clear
								</button>
							</div>
						</div>
						<p className="mt-1 text-[11px] leading-snug text-white/45">
							Tag chips support include-any and exclude-any filtering. Useful for hiding
							noisy payload lines without losing the run timeline.
						</p>
						{tagCatalogError ? (
							<p className="mt-2 text-[11px] text-amber-200/90">
								Catalog error: {tagCatalogError}. Loaded log tags still work.
							</p>
						) : null}
						<label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-white/65">
							<input
								type="checkbox"
								checked={onlyUntagged}
								onChange={(e) => {
									setOnlyUntagged(e.target.checked);
									if (e.target.checked) {
										setTagFilterSelected([]);
										setTagExcludeSelected([]);
									}
								}}
							/>
							Only untagged lines
						</label>
						<div className="mt-3 space-y-3">
							<div>
								<p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
									Include (any)
								</p>
								<div className="mt-1 max-h-28 overflow-y-auto rounded-md border border-white/10 bg-black/25 p-2">
									{tagChipOptions.length === 0 ? (
										<p className="text-[11px] text-white/45">No tags yet.</p>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{tagChipOptions.map((id) => {
												const selected = tagFilterSelected.includes(id);
												return (
													<button
														key={id}
														type="button"
														disabled={onlyUntagged}
														title={tagDescriptionById.get(id) ?? id}
														onClick={() => toggleTagFilter(id)}
														className={cn(
															"rounded-md border px-2 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
															selected
																? "border-violet-400/60 bg-violet-500/30 text-violet-100"
																: "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
														)}
													>
														{id}
													</button>
												);
											})}
										</div>
									)}
								</div>
							</div>
							<div>
								<p className="text-[10px] font-medium uppercase tracking-wide text-white/40">
									Exclude (any)
								</p>
								<div className="mt-1 max-h-28 overflow-y-auto rounded-md border border-white/10 bg-black/25 p-2">
									{tagChipOptions.length === 0 ? (
										<p className="text-[11px] text-white/45">No tags yet.</p>
									) : (
										<div className="flex flex-wrap gap-1.5">
											{tagChipOptions.map((id) => {
												const selected = tagExcludeSelected.includes(id);
												return (
													<button
														key={`exclude-${id}`}
														type="button"
														disabled={onlyUntagged}
														title={tagDescriptionById.get(id) ?? id}
														onClick={() => toggleTagExclude(id)}
														className={cn(
															"rounded-md border px-2 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
															selected
																? "border-rose-400/60 bg-rose-500/25 text-rose-100"
																: "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10",
														)}
													>
														{id}
													</button>
												);
											})}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-xl border border-white/10 bg-white/5 p-4">
						<div className="flex items-center justify-between gap-2">
							<h3 className="text-sm font-semibold text-white/90">Runs</h3>
							<button
								type="button"
								onClick={() => {
									setSelectedRunId("all");
									setSelectedPostId("all");
								}}
								className="text-xs text-white/55 hover:text-white"
							>
								Show all
							</button>
						</div>
						<div className="mt-3 space-y-2">
							{runSummaries.length === 0 ? (
								<div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/55">
									No runs match the current filters.
								</div>
							) : (
								runSummaries.map((run) => (
									<button
										type="button"
										key={run.id}
										onClick={() => {
											setSelectedRunId(run.id);
											setSelectedPostId("all");
										}}
										className={cn(
											"w-full rounded-xl border p-3 text-left transition-colors",
											selectedRunId === run.id
												? "border-cyan-400/40 bg-cyan-500/10"
												: "border-white/10 bg-black/20 hover:bg-white/8",
										)}
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<span className="font-mono text-sm text-white/90">{run.label}</span>
											<span
												className={cn(
													"rounded-full border px-2 py-0.5 text-[11px]",
													getStatusTone(run.status),
												)}
											>
												{run.status}
											</span>
										</div>
										<div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/65">
											<span className="rounded bg-white/10 px-1.5 py-0.5">
												{run.postCount} posts
											</span>
											<span className="rounded bg-white/10 px-1.5 py-0.5">
												{run.errorCount} errors
											</span>
											<span className="rounded bg-white/10 px-1.5 py-0.5">
												{run.warningCount} warnings
											</span>
											{run.command ? (
												<span className="rounded bg-white/10 px-1.5 py-0.5">{run.command}</span>
											) : null}
										</div>
										<div className="mt-2 text-xs text-white/55">
											{formatTs(run.startedAt)} to {formatTs(run.endedAt)} -{" "}
											{formatDuration(run.durationMs)}
										</div>
										{run.topErrorKind ? (
											<div className="mt-1 text-xs text-white/45">
												Top error: <span className="font-mono">{run.topErrorKind}</span>
											</div>
										) : null}
									</button>
								))
							)}
						</div>
					</div>

					{selectedRun ? (
						<div className="rounded-xl border border-white/10 bg-white/5 p-4">
							<div className="flex items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-white/90">Posts in run</h3>
								<button
									type="button"
									onClick={() => setSelectedPostId("all")}
									className="text-xs text-white/55 hover:text-white"
								>
									All posts
								</button>
							</div>
							<div className="mt-3 space-y-2">
								{selectedRun.postSummaries.length === 0 ? (
									<div className="rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/55">
										No post_id values were extracted for this run.
									</div>
								) : (
									selectedRun.postSummaries.map((post) => (
										<button
											type="button"
											key={post.id}
											onClick={() => setSelectedPostId(post.postId)}
											className={cn(
												"w-full rounded-xl border p-3 text-left transition-colors",
												selectedPostId === post.postId
													? "border-cyan-400/40 bg-cyan-500/10"
													: "border-white/10 bg-black/20 hover:bg-white/8",
											)}
										>
											<div className="flex items-center justify-between gap-2">
												<span className="font-mono text-sm text-white/90">{post.postId}</span>
												<span
													className={cn(
														"rounded-full border px-2 py-0.5 text-[11px]",
														getStatusTone(post.status),
													)}
												>
													{post.status}
												</span>
											</div>
											<div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/65">
												<span className="rounded bg-white/10 px-1.5 py-0.5">
													{Math.max(post.attemptCount, 1)} attempts
												</span>
												<span className="rounded bg-white/10 px-1.5 py-0.5">
													{post.llmRetryCount} retries
												</span>
												{typeof post.selectedIdx === "number" ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5">
														selected {post.selectedIdx}
													</span>
												) : null}
											</div>
											<div className="mt-2 text-xs text-white/55">
												{buildEvidenceLine(post)}
											</div>
										</button>
									))
								)}
							</div>
						</div>
					) : null}
				</aside>

				<div className="space-y-4">
					{selectedRun ? (
						<div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
										Selected run
									</div>
									<h3 className="mt-1 font-mono text-lg text-white">{selectedRun.label}</h3>
									<p className="mt-1 text-sm text-white/55">
										Start from the run boundary, then narrow to post-level failures and the
										terminal evidence line.
									</p>
								</div>
								<div
									className={cn(
										"rounded-full border px-3 py-1 text-xs",
										getStatusTone(selectedRun.status),
									)}
								>
									{selectedRun.status}
								</div>
							</div>
							<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<MetricCard
									label="Command"
									value={selectedRun.command ?? "n/a"}
									hint="workflow command"
									tone="border-white/10 bg-white/5"
								/>
								<MetricCard
									label="Posts"
									value={`${selectedRun.postsSucceeded}/${selectedRun.postCount}`}
									hint="succeeded / total"
									tone="border-white/10 bg-white/5"
								/>
								<MetricCard
									label="Errors"
									value={String(selectedRun.errorCount)}
									hint={selectedRun.topErrorKind ? `top: ${selectedRun.topErrorKind}` : null}
									tone="border-red-500/20 bg-red-500/8"
								/>
								<MetricCard
									label="Duration"
									value={formatDuration(selectedRun.durationMs)}
									hint={`${formatTs(selectedRun.startedAt)} to ${formatTs(selectedRun.endedAt)}`}
									tone="border-sky-500/20 bg-sky-500/8"
								/>
							</div>
							{selectedRun.postSummaries.length > 0 ? (
								<div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
									<div className="text-xs font-semibold text-white/85">Collapsed post summary</div>
									<div className="mt-2 space-y-2">
										{selectedRun.postSummaries.slice(0, 4).map((post) => (
											<div
												key={`summary-${post.id}`}
												className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
											>
												{buildEvidenceLine(post)}
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
					) : null}

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
						<div className="rounded-xl border border-white/10 bg-white/5 p-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h3 className="text-sm font-semibold text-white/90">
									{selectedRun ? "Run timeline" : "Event stream"}
								</h3>
								<div className="text-xs text-white/55">
									{selectedRun
										? "chronological order inside the selected run"
										: "newest events first"}
								</div>
							</div>
							<div className="mt-3 max-h-[920px] space-y-2 overflow-y-auto pr-1">
								{visibleEntries.map((entry) => {
									const selected = entry.id === selectedId;
									const rowTags = tagsByEntryId.get(entry.id) ?? [];
									return (
										<button
											type="button"
											key={entry.id}
											onClick={() => setSelectedId(entry.id)}
											className={cn(
												"w-full rounded-xl border p-3 text-left transition-colors",
												selected
													? "border-cyan-400/40 bg-cyan-500/10"
													: "border-white/10 bg-black/20 hover:bg-white/8",
											)}
										>
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div className="flex flex-wrap gap-1.5 text-[11px]">
													<span className={cn("rounded-full border px-2 py-0.5", getLevelTone(entry))}>
														{entry.level ?? "n/a"}
													</span>
													<span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white/70">
														{entry.componentLabel}
													</span>
													{entry.failureClass ? (
														<span
															className={cn(
																"rounded-full border px-2 py-0.5",
																getFailureTone(entry.failureClass),
															)}
														>
															{entry.failureClass}
														</span>
													) : null}
													{entry.isRetry ? (
														<span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-100">
															retry
														</span>
													) : null}
													{entry.isTerminal ? (
														<span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-100">
															terminal
														</span>
													) : null}
													<span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white/60">
														L{entry.lineNumber}
													</span>
												</div>
												<div className="text-[11px] text-white/50">{formatTs(entry.ts)}</div>
											</div>

											<div className="mt-2 text-sm leading-6 text-white/90">
												{entry.msg || "(empty message)"}
											</div>

											<div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-white/60">
												{entry.runId ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">
														run {entry.runId}
													</span>
												) : null}
												{entry.postId ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">
														post {entry.postId}
													</span>
												) : null}
												{entry.event ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5">{entry.event}</span>
												) : null}
												{typeof entry.attemptCurrent === "number" ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5">
														attempt {entry.attemptCurrent}
														{typeof entry.attemptMax === "number" ? `/${entry.attemptMax}` : ""}
													</span>
												) : null}
												{typeof entry.selectedIdx === "number" ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5">
														selected {entry.selectedIdx}
													</span>
												) : null}
												{entry.decodedIndices.length > 0 ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5">
														decoded [{entry.decodedIndices.join(", ")}]
													</span>
												) : null}
												{entry.errorKind ? (
													<span className="rounded bg-white/10 px-1.5 py-0.5 font-mono">
														{entry.errorKind}
													</span>
												) : null}
												{rowTags.slice(0, 4).map((tag) => (
													<span
														key={`${entry.id}-${tag}`}
														title={tagDescriptionById.get(tag) ?? tag}
														className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-violet-100/90"
													>
														{tag}
													</span>
												))}
											</div>
										</button>
									);
								})}
								{!isLoading && visibleEntries.length === 0 ? (
									<div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/55">
										No logs match the current filters.
									</div>
								) : null}
							</div>
						</div>

						<div className="rounded-xl border border-white/10 bg-white/5 p-4">
							{selectedEntry ? (
								<div className="space-y-4">
									<div>
										<div className="flex flex-wrap gap-2 text-xs">
											<span className="rounded bg-white/10 px-2 py-1">
												{formatTs(selectedEntry.ts)}
											</span>
											<span className="rounded bg-white/10 px-2 py-1">
												{selectedEntry.level ?? "n/a"}
											</span>
											<span className="rounded bg-white/10 px-2 py-1">
												{selectedEntry.componentLabel}
											</span>
										</div>
										<div className="mt-3 text-sm text-white/90">{selectedEntry.msg || "(empty)"}</div>
									</div>

									<div className="grid gap-2 text-xs sm:grid-cols-2">
										<div className="rounded-lg border border-white/10 bg-black/20 p-3">
											<div className="text-[11px] uppercase tracking-wide text-white/45">
												Failure class
											</div>
											<div className="mt-2 text-sm text-white/90">
												{selectedEntry.failureClass ?? "not classified"}
											</div>
										</div>
										<div className="rounded-lg border border-white/10 bg-black/20 p-3">
											<div className="text-[11px] uppercase tracking-wide text-white/45">
												Terminal evidence
											</div>
											<div className="mt-2 text-sm text-white/90">
												{selectedEntry.isTerminal ? "yes" : "no"}
											</div>
										</div>
										<div className="rounded-lg border border-white/10 bg-black/20 p-3">
											<div className="text-[11px] uppercase tracking-wide text-white/45">
												Provider / model
											</div>
											<div className="mt-2 text-sm text-white/90">
												{selectedEntry.provider ?? "n/a"} / {selectedEntry.model ?? "n/a"}
											</div>
										</div>
										<div className="rounded-lg border border-white/10 bg-black/20 p-3">
											<div className="text-[11px] uppercase tracking-wide text-white/45">
												Run / post
											</div>
											<div className="mt-2 text-sm text-white/90">
												{selectedEntry.runId ?? "n/a"} / {selectedEntry.postId ?? "n/a"}
											</div>
										</div>
									</div>

									<div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/75">
										<div className="mb-2 text-[11px] uppercase tracking-wide text-white/45">
											Extracted fields
										</div>
										<div className="grid gap-2 sm:grid-cols-2">
											<div>trace_id: {selectedEntry.traceId ?? "n/a"}</div>
											<div>request_id: {selectedEntry.requestId ?? "n/a"}</div>
											<div>
												attempt:{" "}
												{typeof selectedEntry.attemptCurrent === "number"
													? `${selectedEntry.attemptCurrent}${typeof selectedEntry.attemptMax === "number" ? `/${selectedEntry.attemptMax}` : ""}`
													: "n/a"}
											</div>
											<div>selected_idx: {selectedEntry.selectedIdx ?? "n/a"}</div>
											<div>decoded_indices: {selectedEntry.decodedIndices.join(", ") || "n/a"}</div>
											<div>error_kind: {selectedEntry.errorKind ?? "n/a"}</div>
											<div>http_status: {selectedEntry.httpStatus ?? "n/a"}</div>
											<div>retryable: {selectedEntry.retryable ? "true" : "false"}</div>
											<div>prompt_hash: {selectedEntry.promptHash ?? "n/a"}</div>
											<div>system_prompt_hash: {selectedEntry.systemPromptHash ?? "n/a"}</div>
										</div>
									</div>

									{selectedEntry.responseSnippet ? (
										<div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
											<div className="mb-2 text-[11px] uppercase tracking-wide text-orange-100/70">
												Last response snippet
											</div>
											<pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs text-orange-50/90">
												{selectedEntry.responseSnippet}
											</pre>
										</div>
									) : null}

									{selectedEntryTags.length > 0 ? (
										<div className="flex flex-wrap gap-1.5">
											{selectedEntryTags.map((tag) => (
												<span
													key={tag}
													title={tagDescriptionById.get(tag) ?? tag}
													className="rounded-md border border-violet-500/30 bg-violet-500/15 px-2 py-1 font-mono text-xs text-violet-100/90"
												>
													{tag}
												</span>
											))}
										</div>
									) : null}

									<div className="rounded-lg border border-white/10 bg-black/20 p-3">
										<div className="mb-2 text-[11px] uppercase tracking-wide text-white/45">
											Raw JSON
										</div>
										<pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs text-white/75">
											{JSON.stringify(selectedEntry.raw, null, 2)}
										</pre>
									</div>
								</div>
							) : (
								<div className="flex h-full min-h-[400px] items-center justify-center text-sm text-white/50">
									Select a log event to inspect its derived fields and raw payload.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
