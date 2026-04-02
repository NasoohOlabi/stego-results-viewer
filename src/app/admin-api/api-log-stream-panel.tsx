"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";
import { ADMIN_API_STORAGE_KEY } from "./types";

type ApiLogEntry =
	inferRouterOutputs<AppRouter>["promptLogs"]["getApiEntries"]["entries"][number];

function formatTs(ts: string | null): string {
	if (!ts) return "n/a";
	const parsed = Date.parse(ts);
	if (!Number.isFinite(parsed)) return ts;
	return new Date(parsed).toLocaleString();
}

function statusGroup(value: number | null): "2xx" | "4xx" | "5xx" | "other" {
	if (typeof value !== "number") return "other";
	if (value >= 200 && value < 300) return "2xx";
	if (value >= 400 && value < 500) return "4xx";
	if (value >= 500 && value < 600) return "5xx";
	return "other";
}

type StateLogsPayload = {
	file_logging_enabled: boolean;
	path: string | null;
	bytes: number;
};

function readPersistedAdminApiBase(): string {
	const fallback = "http://localhost:5001/api/v1";
	if (typeof window === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as { baseUrl?: string };
		const b = parsed.baseUrl?.trim();
		if (b) return b.replace(/\/+$/, "");
	} catch {
		/* ignore */
	}
	return fallback;
}

function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return "—";
	if (n < 1024) return `${Math.round(n)} B`;
	const units = ["KB", "MB", "GB", "TB"] as const;
	let v = n / 1024;
	let u = 0;
	while (v >= 1024 && u < units.length - 1) {
		v /= 1024;
		u += 1;
	}
	return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[u]}`;
}

function upsertEntries(
	prev: ApiLogEntry[],
	incoming: ApiLogEntry[]
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

/** Structured log tags from JSONL (`tag`, `tags[]`, or nested `data`). */
function getEntryTags(entry: ApiLogEntry): string[] {
	const raw = entry.raw;
	const out = new Set<string>();

	const add = (value: unknown) => {
		if (typeof value === "string") {
			const t = value.trim();
			if (t) out.add(t);
		}
	};

	add(raw.tag);

	const top = raw.tags;
	if (Array.isArray(top)) {
		for (const item of top) add(item);
	}

	const data = raw.data;
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const d = data as Record<string, unknown>;
		add(d.tag);
		const nested = d.tags;
		if (Array.isArray(nested)) {
			for (const item of nested) add(item);
		}
	}

	return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function mergeTagIdLists(
	catalogIds: string[],
	entryTags: Set<string>
): string[] {
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

export function ApiLogStreamPanel() {
	const [limit, setLimit] = useState("1200");
	const [entries, setEntries] = useState<ApiLogEntry[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState("all");
	const [loggerFilter, setLoggerFilter] = useState("all");
	const [methodFilter, setMethodFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [liveEnabled, setLiveEnabled] = useState(true);
	const [streamState, setStreamState] = useState<
		"idle" | "connected" | "error"
	>("idle");
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
	const [onlyUntagged, setOnlyUntagged] = useState(false);

	const numericLimit = Math.max(1, Math.min(Number(limit || "1200"), 5000));

	const {
		data,
		isLoading,
		error,
		refetch: refetchSnapshot
	} = api.promptLogs.getApiEntries.useQuery(
		{ limit: numericLimit },
		{ refetchOnWindowFocus: false }
	);

	const refreshTagCatalog = useCallback(async () => {
		const base = readPersistedAdminApiBase();
		setTagCatalogLoading(true);
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
			const data = json.data;
			const fromPairs: Array<{ id: string; description: string }> = [];
			if (Array.isArray(data?.tags)) {
				for (const row of data.tags) {
					if (
						row &&
						typeof row.id === "string" &&
						typeof row.description === "string"
					) {
						fromPairs.push({ id: row.id, description: row.description });
					}
				}
			}
			if (fromPairs.length > 0) {
				setTagCatalog(fromPairs);
				return;
			}
			const ids = data?.tag_ids;
			if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
				setTagCatalog(ids.map((id) => ({ id, description: "" })));
				return;
			}
			setTagCatalog([]);
		} catch (e) {
			setTagCatalog([]);
			setTagCatalogError(e instanceof Error ? e.message : String(e));
		} finally {
			setTagCatalogLoading(false);
		}
	}, []);

	const refreshStateLogs = useCallback(async () => {
		const base = readPersistedAdminApiBase();
		setStateLogsBase(base);
		setStateLogsLoading(true);
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
		}
	}, []);

	const truncateServerLogFile = useCallback(async () => {
		if (
			!window.confirm(
				"Truncate the API JSONL log file on the server to 0 bytes? This cannot be undone."
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
		setSelectedId((current) =>
			current && data.entries.some((entry) => entry.id === current)
				? current
				: (data.entries[0]?.id ?? null)
		);
	}, [data]);

	useEffect(() => {
		if (!liveEnabled) {
			setStreamState("idle");
			setStreamError(null);
			return;
		}

		const source = new EventSource(
			`/api/prompt-logs/stream?backfill=${numericLimit}`
		);
		setStreamState("idle");
		setStreamError(null);

		source.addEventListener("init", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			const initialEntries = Array.isArray(payload.entries)
				? payload.entries
				: [];
			setEntries((prev) => {
				// Keep the snapshot if stream init has no backfill yet.
				if (initialEntries.length === 0 && prev.length > 0) return prev;
				return initialEntries;
			});
			setStreamState("connected");
		});

		source.addEventListener("append", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			if (!Array.isArray(payload.entries) || payload.entries.length === 0)
				return;
			setEntries((prev) => upsertEntries(prev, payload.entries ?? []));
			setStreamState("connected");
		});

		source.addEventListener("reset", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			const resetEntries = Array.isArray(payload.entries)
				? payload.entries
				: [];
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
	}, [liveEnabled, numericLimit]);

	const levelOptions = useMemo(
		() =>
			Array.from(
				new Set(
					entries
						.map((entry) => entry.level)
						.filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const loggerOptions = useMemo(
		() =>
			Array.from(
				new Set(
					entries
						.map((entry) => entry.logger)
						.filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const methodOptions = useMemo(
		() =>
			Array.from(
				new Set(
					entries
						.map((entry) => entry.method)
						.filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const tagDescriptionById = useMemo(() => {
		const m = new Map<string, string>();
		for (const row of tagCatalog) {
			if (row.description.trim()) m.set(row.id, row.description);
		}
		return m;
	}, [tagCatalog]);

	const tagsByEntryId = useMemo(() => {
		const m = new Map<string, string[]>();
		for (const entry of entries) {
			m.set(entry.id, getEntryTags(entry));
		}
		return m;
	}, [entries]);

	const tagChipOptions = useMemo(() => {
		const seenInEntries = new Set<string>();
		for (const tags of tagsByEntryId.values()) {
			for (const t of tags) seenInEntries.add(t);
		}
		const catalogIds = tagCatalog.map((t) => t.id);
		return mergeTagIdLists(catalogIds, seenInEntries);
	}, [tagCatalog, tagsByEntryId]);

	const filteredEntries = useMemo(() => {
		const q = search.trim().toLowerCase();
		return entries.filter((entry) => {
			if (levelFilter !== "all" && entry.level !== levelFilter) return false;
			if (loggerFilter !== "all" && entry.logger !== loggerFilter)
				return false;
			if (methodFilter !== "all" && entry.method !== methodFilter)
				return false;
			if (
				statusFilter !== "all" &&
				statusGroup(entry.status) !== statusFilter
			)
				return false;

			const entryTags = tagsByEntryId.get(entry.id) ?? [];
			if (onlyUntagged) {
				if (entryTags.length > 0) return false;
			} else if (tagFilterSelected.length > 0) {
				const selected = new Set(tagFilterSelected);
				const hit = entryTags.some((t) => selected.has(t));
				if (!hit) return false;
			}

			if (!q) return true;
			const blob = [
				entry.ts ?? "",
				entry.level ?? "",
				entry.logger ?? "",
				entry.msg ?? "",
				entry.method ?? "",
				entry.path ?? "",
				entry.event ?? "",
				String(entry.status ?? ""),
				entry.requestId ?? "",
				entry.runId ?? "",
				entry.command ?? "",
				...entryTags
			]
				.join(" ")
				.toLowerCase();
			return blob.includes(q);
		});
	}, [
		entries,
		levelFilter,
		loggerFilter,
		methodFilter,
		onlyUntagged,
		search,
		statusFilter,
		tagFilterSelected,
		tagsByEntryId
	]);

	const toggleTagFilter = useCallback((id: string) => {
		setOnlyUntagged(false);
		setTagFilterSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
		);
	}, []);

	const clearTagFilter = useCallback(() => {
		setTagFilterSelected([]);
		setOnlyUntagged(false);
	}, []);

	useEffect(() => {
		if (filteredEntries.length === 0) {
			setSelectedId(null);
			return;
		}
		setSelectedId((current) =>
			current && filteredEntries.some((entry) => entry.id === current)
				? current
				: filteredEntries[0]!.id
		);
	}, [filteredEntries]);

	const selected =
		filteredEntries.find((entry) => entry.id === selectedId) ?? null;

	return (
		<section className="space-y-4">
			<div className="rounded-xl border border-white/10 bg-white/5 p-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-sm font-semibold text-white/90">
						Server log file
					</h2>
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
							disabled={
								truncateBusy ||
								stateLogsLoading ||
								!stateLogs?.file_logging_enabled
							}
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
							· base{" "}
							<code className="text-white/70">{stateLogsBase}</code>{" "}
							(from Admin API console storage)
						</>
					) : null}
				</p>
				{stateLogsLoading ? (
					<p className="mt-2 text-xs text-white/55">
						Loading server log state…
					</p>
				) : stateLogs ? (
					<dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
							<dt className="text-white/50">File logging</dt>
							<dd className="font-mono text-white/85">
								{stateLogs.file_logging_enabled
									? "enabled"
									: "disabled"}
							</dd>
						</div>
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5 sm:col-span-2">
							<dt className="text-white/50">Path</dt>
							<dd className="break-all font-mono text-white/85">
								{stateLogs.path ?? "—"}
							</dd>
						</div>
						<div className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
							<dt className="text-white/50">On-disk size</dt>
							<dd className="font-mono text-white/85">
								{formatBytes(stateLogs.bytes)}
							</dd>
						</div>
					</dl>
				) : null}
				{stateLogsError ? (
					<p className="mt-2 text-xs text-red-200/90">{stateLogsError}</p>
				) : null}
			</div>
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-2">
						<label className="flex items-center gap-2 text-xs text-white/70">
							<input
								type="checkbox"
								checked={liveEnabled}
								onChange={(e) => setLiveEnabled(e.target.checked)}
							/>
							Stream
						</label>
					</div>
					<p className="text-xs text-white/55">
						{data?.logFilePath ?? "Loading log path..."}
					</p>
					<div className="grid grid-cols-2 gap-2">
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
							Reload Snapshot
						</button>
					</div>
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						placeholder="Search message, path, run id..."
					/>
					<div className="grid grid-cols-2 gap-2">
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
							value={loggerFilter}
							onChange={(e) => setLoggerFilter(e.target.value)}
							aria-label="Filter logs by logger"
							className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm"
						>
							<option value="all">All loggers</option>
							{loggerOptions.map((value) => (
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
					</div>

					<div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-xs font-medium text-white/75">
								Structured tags
							</span>
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									disabled={tagCatalogLoading}
									onClick={() => void refreshTagCatalog()}
									className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15 disabled:opacity-50"
								>
									{tagCatalogLoading
										? "Loading catalog…"
										: "Refresh catalog"}
								</button>
								<button
									type="button"
									disabled={
										tagFilterSelected.length === 0 && !onlyUntagged
									}
									onClick={clearTagFilter}
									className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] hover:bg-white/15 disabled:opacity-40"
								>
									Clear tag filter
								</button>
							</div>
						</div>
						<p className="text-[11px] leading-snug text-white/45">
							Uses{" "}
							<code className="text-white/60">GET /logging/tags</code>{" "}
							for order and descriptions (hover a chip). Click chips to
							show lines that match{" "}
							<span className="text-white/55">any</span> selected tag.
						</p>
						{tagCatalogError ? (
							<p className="text-[11px] text-amber-200/90">
								Catalog: {tagCatalogError} — chips still include tags
								seen in loaded lines.
							</p>
						) : null}
						<label className="flex cursor-pointer items-center gap-2 text-xs text-white/65">
							<input
								type="checkbox"
								checked={onlyUntagged}
								onChange={(e) => {
									setOnlyUntagged(e.target.checked);
									if (e.target.checked) setTagFilterSelected([]);
								}}
							/>
							Only untagged lines
						</label>
						<div className="max-h-36 overflow-y-auto rounded-md border border-white/10 bg-black/25 p-2">
							{tagChipOptions.length === 0 ? (
								<p className="text-[11px] text-white/45">
									No tag ids yet — load logs or fix catalog fetch.
								</p>
							) : (
								<div className="flex flex-wrap gap-1.5">
									{tagChipOptions.map((id) => {
										const on = tagFilterSelected.includes(id);
										const desc = tagDescriptionById.get(id);
										return (
											<button
												key={id}
												type="button"
												disabled={onlyUntagged}
												title={desc || id}
												onClick={() => toggleTagFilter(id)}
												className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
													on
														? "border-violet-400/60 bg-violet-500/30 text-violet-100"
														: "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
												}`}
											>
												{id}
											</button>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className="text-xs text-white/55">
						{isLoading
							? "Loading..."
							: `${filteredEntries.length} of ${data?.totalEntries ?? entries.length} entries`}
						{onlyUntagged ? " · untagged only" : null}
						{!onlyUntagged && tagFilterSelected.length > 0
							? ` · tags: ${tagFilterSelected.join(", ")}`
							: null}
						{streamState === "connected" ? " · stream connected" : ""}
						{streamState === "error" ? " · stream error" : ""}
					</div>
					{(error || streamError) && (
						<div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-100">
							{error?.message ?? streamError}
						</div>
					)}
					<div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
						{filteredEntries.map((entry) => {
							const selectedRow = selectedId === entry.id;
							const rowTags = tagsByEntryId.get(entry.id) ?? [];
							const maxTagPills = 4;
							const tagPills = rowTags.slice(0, maxTagPills);
							const tagOverflow =
								rowTags.length > maxTagPills
									? rowTags.length - maxTagPills
									: 0;
							return (
								<button
									type="button"
									key={entry.id}
									onClick={() => setSelectedId(entry.id)}
									className={`w-full rounded-md border p-2 text-left ${
										selectedRow
											? "border-cyan-400/50 bg-cyan-500/10"
											: "border-white/10 bg-white/5 hover:bg-white/10"
									}`}
								>
									<div className="mb-1 flex flex-wrap gap-1 text-[11px] text-white/70">
										<span className="rounded bg-white/10 px-1.5 py-0.5">
											{entry.level ?? "n/a"}
										</span>
										<span className="rounded bg-white/10 px-1.5 py-0.5">
											{entry.method ?? "method?"}
										</span>
										<span className="rounded bg-white/10 px-1.5 py-0.5">
											{entry.status ?? "status?"}
										</span>
										<span className="rounded bg-white/10 px-1.5 py-0.5">
											L{entry.lineNumber}
										</span>
										{tagPills.map((tid) => (
											<span
												key={tid}
												title={tagDescriptionById.get(tid) ?? tid}
												className="rounded bg-violet-500/25 px-1.5 py-0.5 font-mono text-violet-100/95"
											>
												{tid}
											</span>
										))}
										{tagOverflow > 0 ? (
											<span className="rounded bg-white/10 px-1.5 py-0.5 text-white/55">
												+{tagOverflow}
											</span>
										) : null}
									</div>
									<div className="line-clamp-2 text-sm text-white/90">
										{entry.msg || "(empty message)"}
									</div>
									<div className="mt-1 truncate text-[11px] text-white/55">
										{entry.logger ?? "unknown logger"} -{" "}
										{formatTs(entry.ts)}
									</div>
								</button>
							);
						})}
						{!isLoading && filteredEntries.length === 0 && (
							<div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white/60">
								No logs match your filters.
							</div>
						)}
					</div>
				</div>

				<div className="min-h-[420px] rounded-lg border border-white/10 bg-black/20 p-4">
					{selected ? (
						<div className="space-y-3">
							<div className="flex flex-wrap gap-2 text-xs">
								<span className="rounded bg-white/10 px-2 py-1">
									{formatTs(selected.ts)}
								</span>
								<span className="rounded bg-white/10 px-2 py-1">
									{selected.level ?? "n/a"}
								</span>
								<span className="rounded bg-white/10 px-2 py-1">
									{selected.logger ?? "n/a"}
								</span>
								<span className="rounded bg-white/10 px-2 py-1">
									{selected.method ?? "n/a"} {selected.path ?? ""}
								</span>
								<span className="rounded bg-white/10 px-2 py-1">
									Status: {selected.status ?? "n/a"}
								</span>
								<span className="rounded bg-white/10 px-2 py-1">
									Duration: {selected.durationMs ?? "n/a"} ms
								</span>
							</div>
							{(tagsByEntryId.get(selected.id) ?? []).length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									{(tagsByEntryId.get(selected.id) ?? []).map(
										(tid) => (
											<span
												key={tid}
												title={tagDescriptionById.get(tid) ?? tid}
												className="rounded-md border border-violet-500/30 bg-violet-500/15 px-2 py-1 font-mono text-xs text-violet-100/90"
											>
												{tid}
											</span>
										)
									)}
								</div>
							) : null}
							<div className="rounded-md border border-white/10 bg-black/30 p-3">
								<div className="mb-1 text-xs text-white/60 uppercase">
									Message
								</div>
								<pre className="max-h-[180px] overflow-auto whitespace-pre-wrap text-sm text-white/90">
									{selected.msg || "(empty)"}
								</pre>
							</div>
							<div className="rounded-md border border-white/10 bg-black/30 p-3">
								<div className="mb-1 text-xs text-white/60 uppercase">
									Raw JSON
								</div>
								<pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-xs text-white/75">
									{JSON.stringify(selected.raw, null, 2)}
								</pre>
							</div>
						</div>
					) : (
						<div className="flex h-full items-center justify-center text-sm text-white/50">
							Select a log line to inspect details.
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
