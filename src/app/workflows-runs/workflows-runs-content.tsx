"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

interface WorkflowRunRow {
	id: string;
	command: string;
	mode: string;
	started_at: number;
	elapsed_ms: number;
}

interface WorkflowRunsEnvelope {
	ok?: boolean;
	data?: {
		runs?: unknown;
		count?: unknown;
	};
	message?: string;
}

function normalizeRuns(payload: unknown): { runs: WorkflowRunRow[]; count: number } {
	const envelope = payload as WorkflowRunsEnvelope | null;
	const runsRaw = envelope?.data?.runs;
	if (!Array.isArray(runsRaw)) return { runs: [], count: 0 };

	const runs: WorkflowRunRow[] = [];
	for (const item of runsRaw) {
		if (!item || typeof item !== "object") continue;
		const run = item as Record<string, unknown>;
		if (
			typeof run.id === "string" &&
			typeof run.command === "string" &&
			typeof run.mode === "string" &&
			typeof run.started_at === "number" &&
			typeof run.elapsed_ms === "number"
		) {
			runs.push({
				id: run.id,
				command: run.command,
				mode: run.mode,
				started_at: run.started_at,
				elapsed_ms: run.elapsed_ms
			});
		}
	}

	const countValue = envelope?.data?.count;
	const count =
		typeof countValue === "number" && Number.isFinite(countValue)
			? countValue
			: runs.length;
	return { runs, count };
}

function formatElapsed(ms: number): string {
	const clamped = Math.max(0, Math.floor(ms));
	const totalSeconds = Math.floor(clamped / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

function formatStartedAt(unixSeconds: number): string {
	if (!Number.isFinite(unixSeconds)) return "n/a";
	return new Date(unixSeconds * 1000).toLocaleString();
}

export function WorkflowsRunsContent() {
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
	const [runs, setRuns] = useState<WorkflowRunRow[]>([]);
	const [activeCount, setActiveCount] = useState(0);
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
		"idle"
	);
	const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [autoRefreshMs, setAutoRefreshMs] = useState(5000);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("admin-api-console:v1");
			if (!raw) return;
			const parsed = JSON.parse(raw) as { baseUrl?: unknown };
			if (typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
				setBaseUrl(parsed.baseUrl.trim());
			}
		} catch {
			// Ignore malformed local storage payload.
		}
	}, []);

	const loadRuns = async () => {
		setStatus("loading");
		setErrorMessage(null);
		try {
			const response = await fetch(`${base}/workflows/runs`, {
				method: "GET",
				headers: { "Content-Type": "application/json" }
			});
			const payload = (await response.json()) as unknown;
			if (!response.ok) {
				const envelope = payload as WorkflowRunsEnvelope | null;
				const message = envelope?.message ?? `HTTP ${response.status}`;
				throw new Error(message);
			}

			const parsed = normalizeRuns(payload);
			setRuns(parsed.runs.sort((a, b) => b.started_at - a.started_at));
			setActiveCount(parsed.count);
			setLastUpdatedAt(new Date().toISOString());
			setStatus("success");
		} catch (error) {
			setStatus("error");
			setErrorMessage(error instanceof Error ? error.message : "Request failed");
		}
	};

	useEffect(() => {
		void loadRuns();
		if (autoRefreshMs <= 0) return;
		const timerId = window.setInterval(() => {
			void loadRuns();
		}, autoRefreshMs);
		return () => window.clearInterval(timerId);
	}, [base, autoRefreshMs]);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
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
				<div className="mx-auto max-w-7xl space-y-4">
					<header className="space-y-2">
						<h1 className="text-3xl font-bold">Workflow Runs</h1>
						<p className="text-sm text-white/55">
							Dedicated view for <code>GET /workflows/runs</code> showing
							currently running pipelines.
						</p>
					</header>

					<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
						<div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
							<input
								value={baseUrl}
								onChange={(event) => setBaseUrl(event.target.value)}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="http://localhost:5001/api/v1"
							/>
							<select
								value={String(autoRefreshMs)}
								onChange={(event) => setAutoRefreshMs(Number(event.target.value))}
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								title="Auto-refresh interval"
							>
								<option value="0">Auto refresh: Off</option>
								<option value="2000">Auto refresh: 2s</option>
								<option value="5000">Auto refresh: 5s</option>
								<option value="10000">Auto refresh: 10s</option>
							</select>
							<button
								type="button"
								onClick={() => void loadRuns()}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								Refresh now
							</button>
						</div>
						<div className="text-xs text-white/60">
							Status:{" "}
							<span className="font-medium text-white/85">
								{status === "loading"
									? "Loading..."
									: status === "error"
										? "Error"
										: status === "success"
											? "Ready"
											: "Idle"}
							</span>
							{" · "}
							Active count:{" "}
							<span className="font-medium text-white/85">{activeCount}</span>
							{lastUpdatedAt
								? ` · Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
								: ""}
						</div>
						{errorMessage ? (
							<div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
								Failed to load workflow runs: {errorMessage}
							</div>
						) : null}
					</section>

					<section className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
						<div className="overflow-x-auto">
							<table className="min-w-full text-sm">
								<thead className="bg-white/10 text-left text-xs uppercase tracking-wide text-white/60">
									<tr>
										<th className="px-4 py-3">Run ID</th>
										<th className="px-4 py-3">Command</th>
										<th className="px-4 py-3">Mode</th>
										<th className="px-4 py-3">Started</th>
										<th className="px-4 py-3">Elapsed</th>
									</tr>
								</thead>
								<tbody>
									{runs.length === 0 ? (
										<tr>
											<td
												className="px-4 py-6 text-white/60"
												colSpan={5}
											>
												No running pipelines right now.
											</td>
										</tr>
									) : (
										runs.map((run) => (
											<tr
												key={run.id}
												className="border-t border-white/10 text-white/90"
											>
												<td className="px-4 py-3 font-mono text-xs">
													{run.id}
												</td>
												<td className="px-4 py-3">{run.command}</td>
												<td className="px-4 py-3">{run.mode}</td>
												<td className="px-4 py-3">
													{formatStartedAt(run.started_at)}
												</td>
												<td className="px-4 py-3">
													{formatElapsed(run.elapsed_ms)}
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
