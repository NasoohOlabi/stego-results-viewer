"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { ChevronRight, FileJson, Folder } from "lucide-react";

interface FileExplorerProps {
	files: string[];
	selectedFile: string | null;
	onFileSelect: (filename: string) => void;
	selectedFolder: "side-wing" | "local";
	onFolderSelect: (folder: "side-wing" | "local") => void;
}

interface ParsedFile {
	filename: string;
	id: string;
	version: string | null;
	description: string | null;
	timestamp: string | null;
}

function parseFilename(filename: string): ParsedFile {
	// Pattern: ID_version_VERSION_DESCRIPTION[_TIMESTAMP].json
	const match = filename.match(
		/^([a-z0-9]+)_version_(\d+)_+(.+?)(?:_(\d{10,}))?\.json$/,
	);
	if (!match) {
		return {
			filename,
			id: filename.replace(".json", ""),
			version: null,
			description: null,
			timestamp: null,
		};
	}
	return {
		filename,
		id: match[1]!,
		version: match[2]!,
		description: match[3]!,
		timestamp: match[4] || null,
	};
}

export function FileExplorer({
	files,
	selectedFile,
	onFileSelect,
	selectedFolder,
	onFolderSelect,
}: FileExplorerProps) {
	const groupedFiles = useMemo(() => {
		const groups: Record<string, ParsedFile[]> = {};
		for (const file of files) {
			const parsed = parseFilename(file);
			if (!groups[parsed.id]) {
				groups[parsed.id] = [];
			}
			groups[parsed.id].push(parsed);
		}
		return groups;
	}, [files]);

	const sortedIds = useMemo(() => Object.keys(groupedFiles).sort(), [groupedFiles]);

	const [openItems, setOpenItems] = useState<string[]>([]);

	// Open the group containing the selected file when it changes
	useEffect(() => {
		if (selectedFile) {
			const parsed = parseFilename(selectedFile);
			setOpenItems((prev) => {
				if (prev.includes(parsed.id)) return prev;
				return [...prev, parsed.id];
			});
		}
	}, [selectedFile]);

	return (
		<div className="flex h-screen w-80 flex-col overflow-hidden border-r border-white/10 bg-zinc-950/80 backdrop-blur-md">
			<div className="shrink-0 p-4 pb-2">
				<h2 className="mb-4 font-semibold text-lg">Files</h2>
				<div className="flex rounded-lg bg-white/5 p-1">
					<button
						type="button"
						onClick={() => onFolderSelect("side-wing")}
						className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
							selectedFolder === "side-wing"
								? "bg-white/10 text-white shadow-sm"
								: "text-white/50 hover:text-white"
						}`}
					>
						Side Wing
					</button>
					<button
						type="button"
						onClick={() => onFolderSelect("local")}
						className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
							selectedFolder === "local"
								? "bg-white/10 text-white shadow-sm"
								: "text-white/50 hover:text-white"
						}`}
					>
						Local
					</button>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto px-2 pb-4">
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
											{item.version && (
												<span className="ml-2 text-[10px] opacity-40">
													v{item.version}
												</span>
											)}
										</span>
									</button>
								</div>
							);
						}

						return (
							<AccordionItem key={id} value={id} className="border-none px-2">
								<AccordionTrigger className="group flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white hover:no-underline [&[data-state=open]]:bg-white/5 [&>svg:last-child]:hidden">
									<Folder className="h-4 w-4 shrink-0 opacity-50" />
									<span className="flex-1 truncate text-left">{id}</span>
									<span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px]">
										{items.length}
									</span>
									<ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-90" />
								</AccordionTrigger>
								<AccordionContent className="pb-1 pt-1 ml-4 border-l border-white/10">
									<div className="space-y-1 pl-2">
										{items
											.sort((a, b) => {
												// Sort by version, then by timestamp
												if (a.version !== b.version) {
													return (a.version || "").localeCompare(b.version || "");
												}
												return (a.timestamp || "").localeCompare(b.timestamp || "");
											})
											.map((item) => {
												const isSelected = selectedFile === item.filename;
												const displayName = item.timestamp
													? `${item.version ? `v${item.version} - ` : ""}${new Date(
															Number(item.timestamp),
														).toLocaleString([], {
															month: "short",
															day: "numeric",
															hour: "2-digit",
															minute: "2-digit",
														})}`
													: item.version
														? `v${item.version}`
														: item.filename;

												return (
													<button
														key={item.filename}
														type="button"
														onClick={() => onFileSelect(item.filename)}
														className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
															isSelected
																? "bg-white/20 text-white"
																: "text-white/50 hover:bg-white/10 hover:text-white"
														}`}
													>
														<FileJson className="h-3 w-3 shrink-0 opacity-50" />
														<span className="truncate" title={item.filename}>
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
			</div>
		</div>
	);
}
