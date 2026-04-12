"use client";

import {
	ChevronRight,
	FileJson,
	Folder,
	GitCompare,
	Home,
	LayoutDashboard,
	Logs,
	MessageSquareText,
	Plus,
	ScrollText,
	Search,
	Settings,
	Shield,
	Trash2
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "~/components/ui/accordion";
import { usePathConfig } from "~/hooks/use-path-config";

interface FileExplorerProps {
	files: string[];
	selectedFile: string | null;
	onFileSelect: (filename: string) => void;
	selectedPathId: string;
	onPathSelect: (pathId: string) => void;
}

interface ParsedFile {
	filename: string;
	id: string;
	tag: string | null;
}

function parseFilename(filename: string): ParsedFile {
	const stem = filename.replace(/\.json$/i, "");
	const underscoreIdx = stem.indexOf("_");
	if (underscoreIdx === -1) {
		return { filename, id: stem, tag: null };
	}
	const id = stem.slice(0, underscoreIdx);
	const tag = stem.slice(underscoreIdx + 1) || null;
	return { filename, id, tag };
}

function formatTag(tag: string): string {
	return tag.replace(/_/g, " ");
}

function fileMatchesQuery(filename: string, queryLower: string): boolean {
	if (!queryLower) return true;
	const parsed = parseFilename(filename);
	const tagDisplay = parsed.tag ? formatTag(parsed.tag) : "";
	return (
		filename.toLowerCase().includes(queryLower) ||
		parsed.id.toLowerCase().includes(queryLower) ||
		(parsed.tag?.toLowerCase().includes(queryLower) ?? false) ||
		tagDisplay.toLowerCase().includes(queryLower)
	);
}

export function FileExplorer({
	files,
	selectedFile,
	onFileSelect,
	selectedPathId,
	onPathSelect
}: FileExplorerProps) {
	const { pathEntries, enabledPaths, togglePath, addPath, removePath } =
		usePathConfig();

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [newPath, setNewPath] = useState("");

	const groupedFiles = useMemo(() => {
		const groups: Record<string, ParsedFile[]> = {};
		for (const file of files) {
			const parsed = parseFilename(file);
			const id = parsed.id;
			(groups[id] ??= []).push(parsed);
		}
		return groups;
	}, [files]);

	const sortedIds = useMemo(
		() => Object.keys(groupedFiles).sort(),
		[groupedFiles]
	);

	const [openItems, setOpenItems] = useState<string[]>([]);

	const [fileSearchQuery, setFileSearchQuery] = useState("");
	const [searchHighlight, setSearchHighlight] = useState(0);

	const searchFiltered = useMemo(() => {
		const q = fileSearchQuery.trim().toLowerCase();
		if (!q) return null;
		return files
			.filter((f) => fileMatchesQuery(f, q))
			.sort((a, b) => a.localeCompare(b));
	}, [files, fileSearchQuery]);

	useEffect(() => {
		setSearchHighlight(0);
	}, [fileSearchQuery, searchFiltered?.length]);

	const openFileFromSearch = (filename: string) => {
		setFileSearchQuery("");
		onFileSelect(filename);
	};

	const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (searchFiltered === null) return;
		if (e.key === "Escape") {
			e.preventDefault();
			setFileSearchQuery("");
			return;
		}
		if (searchFiltered.length === 0) return;
		if (e.key === "Enter") {
			e.preventDefault();
			const pick = searchFiltered[searchHighlight];
			if (pick) openFileFromSearch(pick);
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSearchHighlight((i) =>
				Math.min(i + 1, searchFiltered.length - 1),
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSearchHighlight((i) => Math.max(i - 1, 0));
		}
	};

	useEffect(() => {
		if (selectedFile) {
			const parsed = parseFilename(selectedFile);
			setOpenItems((prev) => {
				if (prev.includes(parsed.id)) return prev;
				return [...prev, parsed.id];
			});
		}
	}, [selectedFile]);

	const pathname = usePathname();

	const handleAddPath = () => {
		if (newLabel.trim() && newPath.trim()) {
			const id = addPath(newLabel.trim(), newPath.trim());
			setNewLabel("");
			setNewPath("");
			onPathSelect(id);
		}
	};

	return (
		<div className="flex h-screen w-80 flex-col overflow-hidden border-r border-white/10 bg-zinc-950/80 backdrop-blur-md">
			<div className="shrink-0 p-4 pb-2">
				<div className="mb-6 space-y-1">
					<Link
						href={`/?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<Home className="h-4 w-4" />
						Explorer
					</Link>
					<Link
						href={`/dashboard?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/dashboard"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<LayoutDashboard className="h-4 w-4" />
						Dashboard
					</Link>
					<Link
						href={`/admin-api?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/admin-api"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<Shield className="h-4 w-4" />
						Admin API
					</Link>
					<Link
						href={`/prompt-logs?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/prompt-logs"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<MessageSquareText className="h-4 w-4" />
						Prompt Logs
					</Link>
					<Link
						href={`/api-logs?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/api-logs"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<Logs className="h-4 w-4" />
						API Logs
					</Link>
					<Link
						href={`/workflow-llm-prompts?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/workflow-llm-prompts"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<ScrollText className="h-4 w-4" />
						Workflow LLM prompts
					</Link>
					<Link
						href={`/workflows-runs?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/workflows-runs"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<Logs className="h-4 w-4" />
						Workflow Runs
					</Link>
					<Link
						href={`/double-process-new-post?folder=${selectedPathId}`}
						className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
							pathname === "/double-process-new-post"
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
					>
						<GitCompare className="h-4 w-4" />
						Double-process new post
					</Link>
				</div>

				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-lg">Files</h2>
					<button
						type="button"
						onClick={() => setSettingsOpen((o) => !o)}
						className={`rounded-md p-1.5 transition-colors ${
							settingsOpen
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
						title="Path settings"
					>
						<Settings className="h-4 w-4" />
					</button>
				</div>

				{settingsOpen && (
					<div className="mb-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
						<div className="space-y-2">
							{pathEntries.map((entry) => (
								<div
									key={entry.id}
									className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5"
								>
									<button
										type="button"
										onClick={() => togglePath(entry.id)}
										className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
											entry.enabled
												? "border-green-500/50 bg-green-500/20"
												: "border-white/20 bg-white/5"
										}`}
										title={entry.enabled ? "Disable" : "Enable"}
									>
										<span
											className={`h-3 w-3 shrink-0 rounded-full bg-current transition-all ${
												entry.enabled
													? "ml-4 text-green-400"
													: "ml-0.5 text-white/30"
											}`}
										/>
									</button>
									<span
										className="min-w-0 flex-1 truncate text-xs"
										title={entry.path ?? entry.id}
									>
										{entry.label}
									</span>
									{!entry.isBuiltIn && (
										<button
											type="button"
											onClick={() => removePath(entry.id)}
											className="shrink-0 rounded p-1 text-white/50 hover:bg-red-500/20 hover:text-red-400"
											title="Remove path"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									)}
								</div>
							))}
						</div>
						<div className="space-y-2 border-t border-white/10 pt-2">
							<input
								type="text"
								placeholder="Label"
								value={newLabel}
								onChange={(e) => setNewLabel(e.target.value)}
								className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
							/>
							<input
								type="text"
								placeholder="Absolute path"
								value={newPath}
								onChange={(e) => setNewPath(e.target.value)}
								className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
							/>
							<button
								type="button"
								onClick={handleAddPath}
								className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-white/15"
							>
								<Plus className="h-3.5 w-3.5" />
								Add path
							</button>
						</div>
					</div>
				)}

				<div className="flex flex-wrap gap-1 rounded-lg bg-white/5 p-1">
					{enabledPaths.map((entry) => {
						const isSelected = selectedPathId === entry.id;
						return (
							<button
								key={entry.id}
								type="button"
								onClick={() => onPathSelect(entry.id)}
								className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
									isSelected
										? "bg-white/10 text-white shadow-sm"
										: "text-white/50 hover:text-white"
								}`}
							>
								{entry.label}
							</button>
						);
					})}
				</div>

				<div className="mt-3">
					<label className="mb-1.5 block text-xs font-medium text-white/50">
						Find file
					</label>
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
						<input
							type="search"
							placeholder="Search by name, id, or tag…"
							value={fileSearchQuery}
							onChange={(e) => setFileSearchQuery(e.target.value)}
							onKeyDown={handleSearchKeyDown}
							autoComplete="off"
							className="w-full rounded-md border border-white/10 bg-white/5 py-2 pr-2 pl-8 text-xs text-white placeholder:text-white/35 focus:border-white/20 focus:outline-none"
						/>
					</div>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-2 pb-4">
				{searchFiltered !== null ? (
					<div className="space-y-1 pt-1">
						{searchFiltered.length === 0 ? (
							<p className="px-2 py-3 text-center text-xs text-white/40">
								{`No files match "${fileSearchQuery.trim()}".`}
							</p>
						) : (
							searchFiltered.map((filename, idx) => {
								const parsed = parseFilename(filename);
								const isSelected = selectedFile === filename;
								const isHl = idx === searchHighlight;
								const display =
									parsed.tag != null
										? `${parsed.id} · ${formatTag(parsed.tag)}`
										: parsed.id;
								return (
									<button
										key={filename}
										type="button"
										onClick={() => openFileFromSearch(filename)}
										onMouseEnter={() => setSearchHighlight(idx)}
										className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
											isHl
												? "bg-white/15 text-white"
												: isSelected
													? "bg-white/20 text-white"
													: "text-white/70 hover:bg-white/10 hover:text-white"
										}`}
									>
										<FileJson className="h-4 w-4 shrink-0 opacity-50" />
										<span className="min-w-0 flex-1 truncate" title={filename}>
											{display}
										</span>
										<span className="max-w-[40%] shrink-0 truncate text-[10px] text-white/35">
											{filename}
										</span>
									</button>
								);
							})
						)}
					</div>
				) : (
				<Accordion
					type="multiple"
					value={openItems}
					onValueChange={setOpenItems}
					className="w-full space-y-1"
				>
					{sortedIds.map((id) => {
						const items = groupedFiles[id]!;
						if (items.length === 1 && items[0]) {
							const item = items[0];
							const isSelected = selectedFile === item.filename;
							return (
								<div key={id} className="px-2">
									<button
										type="button"
										onClick={() => onFileSelect(item.filename)}
										className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
											isSelected
												? "bg-white/20 text-white"
												: "text-white/70 hover:bg-white/10 hover:text-white"
										}`}
									>
										<FileJson className="h-4 w-4 shrink-0 opacity-50" />
										<span className="truncate" title={item.filename}>
											{item.id}
											{item.tag && (
												<span className="ml-2 text-[10px] opacity-40">
													{formatTag(item.tag)}
												</span>
											)}
										</span>
									</button>
								</div>
							);
						}

						return (
							<AccordionItem
								key={id}
								value={id}
								className="border-none px-2"
							>
								<AccordionTrigger className="group flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white hover:no-underline data-[state=open]:bg-white/5 [&>svg:last-child]:hidden">
									<Folder className="h-4 w-4 shrink-0 opacity-50" />
									<span className="flex-1 truncate text-left">
										{id}
									</span>
									<span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
										{items.length}
									</span>
									<ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
								</AccordionTrigger>
								<AccordionContent className="pb-1 pt-1 ml-4 border-l border-white/10">
									<div className="space-y-1 pl-2">
										{items
											.sort((a, b) =>
												(a.tag ?? a.filename).localeCompare(
													b.tag ?? b.filename
												)
											)
											.map((item) => {
												const isSelected =
													selectedFile === item.filename;
												const displayName = item.tag
													? formatTag(item.tag)
													: item.filename.replace(/\.json$/i, "");

												return (
													<button
														key={item.filename}
														type="button"
														onClick={() =>
															onFileSelect(item.filename)
														}
														className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
															isSelected
																? "bg-white/20 text-white"
																: "text-white/50 hover:bg-white/10 hover:text-white"
														}`}
													>
														<FileJson className="h-3 w-3 shrink-0 opacity-50" />
														<span
															className="truncate"
															title={item.filename}
														>
															{displayName}
														</span>
													</button>
												);
											})}
									</div>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
				)}
			</div>
		</div>
	);
}
