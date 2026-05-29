"use client";

import {
	ChevronRight,
	FileJson,
	Folder,
	Home,
	LayoutDashboard,
	Logs,
	MessageSquareText,
	Plus,
	RadioTower,
	Scale,
	Search,
	Settings,
	Shield,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
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

function compactPathLabel(label: string) {
	return label
		.replace("pareto_security_retry_rating_", "retry_")
		.replace("actual_workload_e2e_", "workload_")
		.replace(" output-results", "");
}

const primaryRoutes = [
	{ href: "/", label: "Explorer", icon: Home },
	{ href: "/stego-process", label: "Stego Process", icon: RadioTower },
	{ href: "/overnight-findings", label: "Overnight Findings", icon: LayoutDashboard },
	{ href: "/zlg-comparison", label: "ZLG Comparison", icon: Scale },
	{ href: "/admin-api", label: "Admin API", icon: Shield },
	{ href: "/workflows-runs", label: "Workflow Runs", icon: Logs },
] as const;

const secondaryRoutes = [
	{ href: "/prompt-logs", label: "Prompt Logs", icon: MessageSquareText },
	{ href: "/api-logs", label: "API Logs", icon: Logs },
] as const;

export function FileExplorer({
	files,
	selectedFile,
	onFileSelect,
	selectedPathId,
	onPathSelect,
}: FileExplorerProps) {
	const { pathEntries, enabledPaths, togglePath, addPath, removePath } =
		usePathConfig();

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newLabel, setNewLabel] = useState("");
	const [newPath, setNewPath] = useState("");
	const [openItems, setOpenItems] = useState<string[]>([]);
	const [fileSearchQuery, setFileSearchQuery] = useState("");
	const [searchHighlight, setSearchHighlight] = useState(0);

	const groupedFiles = useMemo(() => {
		const groups: Record<string, ParsedFile[]> = {};
		for (const file of files) {
			const parsed = parseFilename(file);
			const existing = groups[parsed.id] ?? [];
			existing.push(parsed);
			groups[parsed.id] = existing;
		}
		return groups;
	}, [files]);

	const sortedIds = useMemo(
		() => Object.keys(groupedFiles).sort(),
		[groupedFiles],
	);

	const searchFiltered = useMemo(() => {
		const q = fileSearchQuery.trim().toLowerCase();
		if (!q) return null;
		return files
			.filter((file) => fileMatchesQuery(file, q))
			.sort((a, b) => a.localeCompare(b));
	}, [files, fileSearchQuery]);

	useEffect(() => {
		if (!selectedFile) return;
		const parsed = parseFilename(selectedFile);
		setOpenItems((prev) =>
			prev.includes(parsed.id) ? prev : [...prev, parsed.id],
		);
	}, [selectedFile]);

	const pathname = usePathname();

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
			setSearchHighlight((i) => Math.min(i + 1, searchFiltered.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSearchHighlight((i) => Math.max(i - 1, 0));
		}
	};

	const handleAddPath = () => {
		if (!newLabel.trim() || !newPath.trim()) return;
		const id = addPath(newLabel.trim(), newPath.trim());
		setNewLabel("");
		setNewPath("");
		onPathSelect(id);
	};

	return (
		<div className="flex h-screen w-80 flex-col overflow-hidden border-white/10 border-r bg-zinc-950/80 backdrop-blur-md">
			<div className="shrink-0 p-4 pb-2">
				<div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
					<p className="font-medium text-[11px] text-emerald-300/80 uppercase tracking-[0.18em]">
						Stego Results Viewer
					</p>
					<h2 className="mt-1 font-semibold text-sm text-white">
						Artifacts, metrics, workflows
					</h2>
					<p className="mt-1 text-white/55 text-xs leading-5">
						Use Overnight Findings for current metrics and Explorer for JSON.
					</p>
				</div>

				<div className="mb-3">
					<p className="mb-2 px-1 font-medium text-[11px] text-white/35 uppercase tracking-[0.18em]">
						Main
					</p>
					<div className="space-y-1">
						{primaryRoutes.map(({ href, label, icon: Icon }) => {
							const target =
								href === "/"
									? `/?folder=${selectedPathId}`
									: `${href}?folder=${selectedPathId}`;
							const isActive = pathname === href;
							return (
								<Link
									className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
										isActive
											? "bg-white/10 text-white"
											: "text-white/55 hover:bg-white/5 hover:text-white"
									}`}
									href={target}
									key={href}
								>
									<Icon className="h-4 w-4" />
									{label}
								</Link>
							);
						})}
					</div>
				</div>

				<div className="mb-4">
					<p className="mb-2 px-1 font-medium text-[11px] text-white/35 uppercase tracking-[0.18em]">
						Extra
					</p>
					<div className="space-y-1">
						{secondaryRoutes.map(({ href, label, icon: Icon }) => {
							const isActive = pathname === href;
							return (
								<Link
									className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
										isActive
											? "bg-white/10 text-white"
											: "text-white/45 hover:bg-white/5 hover:text-white"
									}`}
									href={`${href}?folder=${selectedPathId}`}
									key={href}
								>
									<Icon className="h-4 w-4" />
									{label}
								</Link>
							);
						})}
					</div>
				</div>

				<div className="mb-3 flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-lg">Files</h2>
						<p className="text-white/40 text-xs">
							Grouped by post or artifact id
						</p>
					</div>
					<button
						className={`rounded-md p-1.5 transition-colors ${
							settingsOpen
								? "bg-white/10 text-white"
								: "text-white/50 hover:bg-white/5 hover:text-white"
						}`}
						onClick={() => setSettingsOpen((open) => !open)}
						title="Path settings"
						type="button"
					>
						<Settings className="h-4 w-4" />
					</button>
				</div>

				{settingsOpen ? (
					<div className="mb-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
						<p className="text-[11px] text-white/55 leading-5">
							Built-in paths are shortcuts. Custom entries must be absolute
							paths.
						</p>
						<div className="space-y-2">
							{pathEntries.map((entry) => (
								<div
									className="flex items-center gap-2 rounded-md bg-white/5 px-2 py-1.5"
									key={entry.id}
								>
									<button
										className={`flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
											entry.enabled
												? "border-green-500/50 bg-green-500/20"
												: "border-white/20 bg-white/5"
										}`}
										onClick={() => togglePath(entry.id)}
										title={entry.enabled ? "Disable" : "Enable"}
										type="button"
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
									{typeof entry.fileCount === "number" ? (
										<span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/45">
											{entry.fileCount}
										</span>
									) : null}
									{!entry.isBuiltIn && !entry.isGenerated ? (
										<button
											className="shrink-0 rounded p-1 text-white/50 hover:bg-red-500/20 hover:text-red-400"
											onClick={() => removePath(entry.id)}
											title="Remove path"
											type="button"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									) : null}
								</div>
							))}
						</div>
						<div className="space-y-2 border-white/10 border-t pt-2">
							<input
								className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white text-xs placeholder:text-white/40"
								onChange={(e) => setNewLabel(e.target.value)}
								placeholder="Label"
								type="text"
								value={newLabel}
							/>
							<input
								className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white text-xs placeholder:text-white/40"
								onChange={(e) => setNewPath(e.target.value)}
								placeholder="Absolute path"
								type="text"
								value={newPath}
							/>
							<button
								className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 px-2 py-1.5 font-medium text-xs transition-colors hover:bg-white/15"
								onClick={handleAddPath}
								type="button"
							>
								<Plus className="h-3.5 w-3.5" />
								Add path
							</button>
						</div>
					</div>
				) : null}

				<div className="space-y-1.5">
					<label
						className="block font-medium text-white/50 text-xs"
						htmlFor="result-source"
					>
						Result source
					</label>
					<select
						className="w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-2 text-white text-xs focus:border-white/20 focus:outline-none"
						id="result-source"
						onChange={(event) => onPathSelect(event.target.value)}
						title={
							enabledPaths.find((entry) => entry.id === selectedPathId)?.path ??
							selectedPathId
						}
						value={selectedPathId}
					>
						{enabledPaths.map((entry) => (
							<option key={entry.id} value={entry.id}>
								{compactPathLabel(entry.label)}
								{typeof entry.fileCount === "number"
									? ` (${entry.fileCount})`
									: ""}
							</option>
						))}
					</select>
				</div>

				<div className="mt-3">
					<label
						className="mb-1.5 block font-medium text-white/50 text-xs"
						htmlFor="file-search"
					>
						Find file
					</label>
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
						<input
							autoComplete="off"
							className="w-full rounded-md border border-white/10 bg-white/5 py-2 pr-2 pl-8 text-white text-xs placeholder:text-white/35 focus:border-white/20 focus:outline-none"
							id="file-search"
							onChange={(e) => {
								setFileSearchQuery(e.target.value);
								setSearchHighlight(0);
							}}
							onKeyDown={handleSearchKeyDown}
							placeholder="Search by name, id, or tag..."
							type="search"
							value={fileSearchQuery}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-2 pb-4">
				{searchFiltered !== null ? (
					<div className="space-y-1 pt-1">
						{searchFiltered.length === 0 ? (
							<p className="px-2 py-3 text-center text-white/40 text-xs">
								{`No files match "${fileSearchQuery.trim()}".`}
							</p>
						) : (
							searchFiltered.map((filename, idx) => {
								const parsed = parseFilename(filename);
								const isSelected = selectedFile === filename;
								const isHighlighted = idx === searchHighlight;
								const display =
									parsed.tag != null
										? `${parsed.id} - ${formatTag(parsed.tag)}`
										: parsed.id;
								return (
									<button
										className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
											isHighlighted
												? "bg-white/15 text-white"
												: isSelected
													? "bg-white/20 text-white"
													: "text-white/70 hover:bg-white/10 hover:text-white"
										}`}
										key={filename}
										onClick={() => openFileFromSearch(filename)}
										onMouseEnter={() => setSearchHighlight(idx)}
										type="button"
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
					<>
						<div className="px-3 pb-2 text-[11px] text-white/35">
							{files.length} file{files.length === 1 ? "" : "s"}
						</div>
						<Accordion
							className="w-full space-y-1"
							onValueChange={setOpenItems}
							type="multiple"
							value={openItems}
						>
							{sortedIds.map((id) => {
								const items = groupedFiles[id] ?? [];
								if (items.length === 1 && items[0]) {
									const item = items[0];
									const isSelected = selectedFile === item.filename;
									return (
										<div className="px-2" key={id}>
											<button
												className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
													isSelected
														? "bg-white/20 text-white"
														: "text-white/70 hover:bg-white/10 hover:text-white"
												}`}
												onClick={() => onFileSelect(item.filename)}
												type="button"
											>
												<FileJson className="h-4 w-4 shrink-0 opacity-50" />
												<span className="truncate" title={item.filename}>
													{item.id}
													{item.tag ? (
														<span className="ml-2 text-[10px] opacity-40">
															{formatTag(item.tag)}
														</span>
													) : null}
												</span>
											</button>
										</div>
									);
								}

								return (
									<AccordionItem
										className="border-none px-2"
										key={id}
										value={id}
									>
										<AccordionTrigger className="group flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white hover:no-underline data-[state=open]:bg-white/5 [&>svg:last-child]:hidden">
											<Folder className="h-4 w-4 shrink-0 opacity-50" />
											<span className="flex-1 truncate text-left">{id}</span>
											<span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
												{items.length}
											</span>
											<ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
										</AccordionTrigger>
										<AccordionContent className="ml-4 border-white/10 border-l pt-1 pb-1">
											<div className="space-y-1 pl-2">
												{items
													.sort((a, b) =>
														(a.tag ?? a.filename).localeCompare(
															b.tag ?? b.filename,
														),
													)
													.map((item) => {
														const isSelected = selectedFile === item.filename;
														const displayName = item.tag
															? formatTag(item.tag)
															: item.filename.replace(/\.json$/i, "");

														return (
															<button
																className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
																	isSelected
																		? "bg-white/20 text-white"
																		: "text-white/50 hover:bg-white/10 hover:text-white"
																}`}
																key={item.filename}
																onClick={() => onFileSelect(item.filename)}
																type="button"
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
					</>
				)}
			</div>
		</div>
	);
}
