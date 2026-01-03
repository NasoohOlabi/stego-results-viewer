"use client";

import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useState } from "react";
import { ParsedView } from "./parsed-view";

interface CodeViewerProps {
	content: string | null;
	filename: string | null;
}

function formatJSON(content: string): string {
	try {
		const parsed = JSON.parse(content);
		return JSON.stringify(parsed, null, 2);
	} catch {
		// If it's not valid JSON, return as-is
		return content;
	}
}

function parseJSON(content: string): unknown | null {
	try {
		return JSON.parse(content);
	} catch {
		return null;
	}
}

export function CodeViewer({ content, filename }: CodeViewerProps) {
	const [viewMode, setViewMode] = useState<"raw" | "parsed">("raw");

	const formattedContent = useMemo(() => {
		if (!content) return null;
		return formatJSON(content);
	}, [content]);

	const parsedData = useMemo(() => {
		if (!content) return null;
		return parseJSON(content);
	}, [content]);

	const isJSON = parsedData !== null;

	if (!content || !filename) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="text-white/50">Select a file to view its content</p>
			</div>
		);
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			<div className="shrink-0 border-b border-white/10 px-4 py-2">
				<div className="flex items-center justify-between">
					<h3 className="font-medium text-sm text-white">{filename}</h3>
					{isJSON && (
						<div className="flex items-center gap-2">
							<span className="text-xs text-white/50">Raw</span>
							<button
								type="button"
								onClick={() =>
									setViewMode(viewMode === "raw" ? "parsed" : "raw")
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
									viewMode === "parsed" ? "bg-white/40" : "bg-white/10"
								}`}
								role="switch"
								aria-checked={viewMode === "parsed" ? "true" : "false"}
								aria-label="Toggle view mode"
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
										viewMode === "parsed"
											? "translate-x-6"
											: "translate-x-1"
									}`}
								/>
							</button>
							<span className="text-xs text-white/50">Parsed</span>
						</div>
					)}
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				{viewMode === "raw" ? (
					<CodeMirror
						value={formattedContent ?? content}
						extensions={[json()]}
						theme={oneDark}
						editable={false}
						height="100%"
						className="h-full"
						basicSetup={{
							lineNumbers: true,
							foldGutter: true,
							dropCursor: false,
							allowMultipleSelections: false,
							syntaxHighlighting: true
						}}
					/>
				) : (
					<ParsedView data={parsedData!} filename={filename} />
				)}
			</div>
		</div>
	);
}
