"use client";

import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { api } from "~/trpc/react";

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

function upsertEntries(prev: ApiLogEntry[], incoming: ApiLogEntry[]): ApiLogEntry[] {
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
	const [streamState, setStreamState] = useState<"idle" | "connected" | "error">(
		"idle"
	);
	const [streamError, setStreamError] = useState<string | null>(null);

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

		const source = new EventSource(`/api/prompt-logs/stream?backfill=${numericLimit}`);
		setStreamState("idle");
		setStreamError(null);

		source.addEventListener("init", (event) => {
			const payload = JSON.parse((event as MessageEvent).data) as {
				entries?: ApiLogEntry[];
			};
			setEntries(Array.isArray(payload.entries) ? payload.entries : []);
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
			setEntries(Array.isArray(payload.entries) ? payload.entries : []);
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
					entries.map((entry) => entry.level).filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const loggerOptions = useMemo(
		() =>
			Array.from(
				new Set(
					entries.map((entry) => entry.logger).filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const methodOptions = useMemo(
		() =>
			Array.from(
				new Set(
					entries.map((entry) => entry.method).filter((value): value is string => !!value)
				)
			).sort((a, b) => a.localeCompare(b)),
		[entries]
	);

	const filteredEntries = useMemo(() => {
		const q = search.trim().toLowerCase();
		return entries.filter((entry) => {
			if (levelFilter !== "all" && entry.level !== levelFilter) return false;
			if (loggerFilter !== "all" && entry.logger !== loggerFilter) return false;
			if (methodFilter !== "all" && entry.method !== methodFilter) return false;
			if (statusFilter !== "all" && statusGroup(entry.status) !== statusFilter) return false;
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
				entry.command ?? ""
			]
				.join(" ")
				.toLowerCase();
			return blob.includes(q);
		});
	}, [entries, levelFilter, loggerFilter, methodFilter, search, statusFilter]);

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

	const selected = filteredEntries.find((entry) => entry.id === selectedId) ?? null;

	return (
		<section className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-white/5 p-4 xl:grid-cols-[460px_minmax(0,1fr)]">
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
				<p className="text-xs text-white/55">{data?.logFilePath ?? "Loading log path..."}</p>
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

				<div className="text-xs text-white/55">
					{isLoading
						? "Loading..."
						: `${filteredEntries.length} of ${data?.totalEntries ?? entries.length} entries`}
					{streamState === "connected" ? " - stream connected" : ""}
					{streamState === "error" ? " - stream error" : ""}
				</div>
				{(error || streamError) && (
					<div className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-100">
						{error?.message ?? streamError}
					</div>
				)}
				<div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
					{filteredEntries.map((entry) => {
						const selectedRow = selectedId === entry.id;
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
								</div>
								<div className="line-clamp-2 text-sm text-white/90">
									{entry.msg || "(empty message)"}
								</div>
								<div className="mt-1 truncate text-[11px] text-white/55">
									{entry.logger ?? "unknown logger"} - {formatTs(entry.ts)}
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
						<div className="rounded-md border border-white/10 bg-black/30 p-3">
							<div className="mb-1 text-xs text-white/60 uppercase">Message</div>
							<pre className="max-h-[180px] overflow-auto whitespace-pre-wrap text-sm text-white/90">
								{selected.msg || "(empty)"}
							</pre>
						</div>
						<div className="rounded-md border border-white/10 bg-black/30 p-3">
							<div className="mb-1 text-xs text-white/60 uppercase">Raw JSON</div>
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
		</section>
	);
}
