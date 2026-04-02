"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

function formatTimestamp(timestamp: string | null): string {
	if (!timestamp) return "Unknown time";
	const parsed = Date.parse(timestamp);
	if (!Number.isFinite(parsed)) return timestamp;
	return new Date(parsed).toLocaleString();
}

function PromptLogsContent() {
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

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath }
	);

	const [selectedLogFile, setSelectedLogFile] = useState("all");
	const [searchText, setSearchText] = useState("");
	const [scopeFilter, setScopeFilter] = useState("all");
	const [providerFilter, setProviderFilter] = useState("all");
	const [modelFilter, setModelFilter] = useState("all");
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

	const { data, isLoading, error } = api.promptLogs.getEntries.useQuery({
		fileName: selectedLogFile
	});

	const entries = data?.entries ?? [];
	const logFileOptions = data?.availableFiles ?? [];

	useEffect(() => {
		if (selectedLogFile === "all") return;
		const exists = logFileOptions.some((file) => file.fileName === selectedLogFile);
		if (!exists) setSelectedLogFile("all");
	}, [logFileOptions, selectedLogFile]);

	const scopeOptions = useMemo(() => {
		return Array.from(
			new Set(entries.map((entry) => entry.scope).filter((value): value is string => !!value))
		).sort((a, b) => a.localeCompare(b));
	}, [entries]);

	const providerOptions = useMemo(() => {
		return Array.from(
			new Set(entries.map((entry) => entry.provider).filter((value): value is string => !!value))
		).sort((a, b) => a.localeCompare(b));
	}, [entries]);

	const modelOptions = useMemo(() => {
		return Array.from(
			new Set(entries.map((entry) => entry.model).filter((value): value is string => !!value))
		).sort((a, b) => a.localeCompare(b));
	}, [entries]);

	const filteredEntries = useMemo(() => {
		const normalizedSearch = searchText.trim().toLowerCase();
		return entries.filter((entry) => {
			if (scopeFilter !== "all" && entry.scope !== scopeFilter) return false;
			if (providerFilter !== "all" && entry.provider !== providerFilter) return false;
			if (modelFilter !== "all" && entry.model !== modelFilter) return false;

			if (!normalizedSearch) return true;
			const searchBlob = [
				entry.timestamp ?? "",
				entry.scope ?? "",
				entry.provider ?? "",
				entry.model ?? "",
				entry.sourceFileName ?? "",
				entry.userPrompt ?? "",
				entry.systemMessage ?? "",
				entry.assistantResponse ?? "",
				entry.userPromptPreview ?? "",
				entry.systemMessagePreview ?? "",
				entry.assistantResponsePreview ?? ""
			]
				.join(" ")
				.toLowerCase();
			return searchBlob.includes(normalizedSearch);
		});
	}, [entries, modelFilter, providerFilter, scopeFilter, searchText]);

	useEffect(() => {
		if (filteredEntries.length === 0) {
			setSelectedEntryId(null);
			return;
		}
		if (!selectedEntryId || !filteredEntries.some((entry) => entry.id === selectedEntryId)) {
			setSelectedEntryId(filteredEntries[0]!.id);
		}
	}, [filteredEntries, selectedEntryId]);

	const selectedEntry = filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null;

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
			<div className="flex min-w-0 flex-1">
				<div className="flex w-[430px] shrink-0 flex-col border-r border-white/10 bg-zinc-950/70">
					<div className="space-y-3 border-b border-white/10 p-4">
						<h1 className="font-semibold text-xl">Prompt Logs</h1>
						<p className="text-sm text-white/60">
							{data?.logDirectory ?? "Loading log directory..."}
						</p>
						<select
							value={selectedLogFile}
							onChange={(event) => setSelectedLogFile(event.target.value)}
							aria-label="Select prompt log file"
							className="w-full rounded-md border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm"
						>
							<option value="all">All prompt logs</option>
							{logFileOptions.map((file) => (
								<option key={file.fileName} value={file.fileName}>
									{file.dateLabel} - {file.fileName}
								</option>
							))}
						</select>
						<input
							type="text"
							value={searchText}
							onChange={(event) => setSearchText(event.target.value)}
							placeholder="Search prompts, model, provider..."
							className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm placeholder:text-white/40"
						/>
						<div className="grid grid-cols-1 gap-2">
							<select
								value={scopeFilter}
								onChange={(event) => setScopeFilter(event.target.value)}
								aria-label="Filter by scope"
								className="rounded-md border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm"
							>
								<option value="all">All scopes</option>
								{scopeOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
							<select
								value={providerFilter}
								onChange={(event) => setProviderFilter(event.target.value)}
								aria-label="Filter by provider"
								className="rounded-md border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm"
							>
								<option value="all">All providers</option>
								{providerOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
							<select
								value={modelFilter}
								onChange={(event) => setModelFilter(event.target.value)}
								aria-label="Filter by model"
								className="rounded-md border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm"
							>
								<option value="all">All models</option>
								{modelOptions.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>
						<div className="text-xs text-white/50">
							Showing {filteredEntries.length} of {data?.totalEntries ?? 0}
							{(data?.warnings.length ?? 0) > 0 ? ` (${data?.warnings.length} warnings)` : ""}
						</div>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto p-2">
						{isLoading ? (
							<div className="p-3 text-sm text-white/60">Loading prompt logs...</div>
						) : error ? (
							<div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
								Failed to load prompt logs: {error.message}
							</div>
						) : filteredEntries.length === 0 ? (
							<div className="p-3 text-sm text-white/60">No entries match your filters.</div>
						) : (
							<div className="space-y-2">
								{filteredEntries.map((entry) => {
									const isSelected = entry.id === selectedEntryId;
									return (
										<button
											key={entry.id}
											type="button"
											onClick={() => setSelectedEntryId(entry.id)}
											className={`w-full rounded-lg border p-3 text-left transition-colors ${
												isSelected
													? "border-blue-400/70 bg-blue-500/10"
													: "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
											}`}
										>
											<div className="mb-1 text-xs text-white/60">
												{formatTimestamp(entry.timestamp)}
											</div>
											<div className="mb-2 flex flex-wrap gap-1 text-[11px]">
												<span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-100">
													{entry.sourceFileName}
												</span>
												<span className="rounded bg-white/10 px-2 py-0.5">
													{entry.provider ?? "unknown provider"}
												</span>
												<span className="rounded bg-white/10 px-2 py-0.5">
													{entry.model ?? "unknown model"}
												</span>
												<span className="rounded bg-white/10 px-2 py-0.5">
													{entry.scope ?? "unknown scope"}
												</span>
											</div>
											<div className="line-clamp-2 text-sm text-white/90">
												{entry.userPromptPreview || "(empty user prompt)"}
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</div>
				<div className="min-w-0 flex-1 overflow-y-auto p-6">
					{selectedEntry ? (
						<div className="mx-auto max-w-5xl space-y-4">
							<header className="space-y-2">
								<h2 className="font-semibold text-2xl">Prompt Details</h2>
								<div className="flex flex-wrap gap-2 text-xs text-white/80">
									<span className="rounded bg-white/10 px-2 py-1">
										{formatTimestamp(selectedEntry.timestamp)}
									</span>
									<span className="rounded bg-blue-500/20 px-2 py-1 text-blue-100">
										File: {selectedEntry.sourceFileName}
									</span>
									<span className="rounded bg-white/10 px-2 py-1">
										Provider: {selectedEntry.provider ?? "n/a"}
									</span>
									<span className="rounded bg-white/10 px-2 py-1">
										Model: {selectedEntry.model ?? "n/a"}
									</span>
									<span className="rounded bg-white/10 px-2 py-1">
										Scope: {selectedEntry.scope ?? "n/a"}
									</span>
									<span className="rounded bg-white/10 px-2 py-1">
										Temp: {selectedEntry.temperature ?? "n/a"}
									</span>
									<span className="rounded bg-white/10 px-2 py-1">
										Max tokens: {selectedEntry.maxTokens ?? "n/a"}
									</span>
								</div>
							</header>

							<section className="rounded-xl border border-white/10 bg-white/3 p-4">
								<h3 className="mb-2 font-medium text-sm text-white/70 uppercase tracking-wide">
									User Prompt
								</h3>
								<pre className="max-h-[360px] overflow-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-white/90">
									{selectedEntry.userPrompt || "(empty)"}
								</pre>
							</section>

							<section className="rounded-xl border border-white/10 bg-white/3 p-4">
								<h3 className="mb-2 font-medium text-sm text-white/70 uppercase tracking-wide">
									System Message
								</h3>
								<pre className="max-h-[360px] overflow-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-white/90">
									{selectedEntry.systemMessage || "(empty)"}
								</pre>
							</section>

							<section className="rounded-xl border border-white/10 bg-white/3 p-4">
								<h3 className="mb-2 font-medium text-sm text-white/70 uppercase tracking-wide">
									Assistant Response
								</h3>
								<pre className="max-h-[360px] overflow-auto whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-white/90">
									{selectedEntry.assistantResponse || "(empty)"}
								</pre>
							</section>

							<section className="rounded-xl border border-white/10 bg-white/3 p-4">
								<h3 className="mb-2 font-medium text-sm text-white/70 uppercase tracking-wide">
									Raw JSON
								</h3>
								<pre className="max-h-[280px] overflow-auto whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-white/75">
									{JSON.stringify(selectedEntry.raw, null, 2)}
								</pre>
							</section>
						</div>
					) : (
						<div className="flex h-full items-center justify-center text-white/50">
							Select a prompt entry to inspect details.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function PromptLogsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<PromptLogsContent />
		</Suspense>
	);
}
