"use client";

import { useState } from "react";

interface JsonTreeRendererProps {
	data: unknown;
	hideMessage?: boolean;
	filename?: string | null;
}

function JsonValue({ value, path = "" }: { value: unknown; path?: string }) {
	const [isExpanded, setIsExpanded] = useState(true);

	if (value === null) {
		return <span className="text-purple-400">null</span>;
	}

	if (value === undefined) {
		return <span className="text-gray-400">undefined</span>;
	}

	if (typeof value === "string") {
		return <span className="text-green-400">"{value}"</span>;
	}

	if (typeof value === "number") {
		return <span className="text-blue-400">{value}</span>;
	}

	if (typeof value === "boolean") {
		return <span className="text-yellow-400">{value ? "true" : "false"}</span>;
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-gray-400">[]</span>;
		}

		return (
			<div className="ml-4">
				<button
					className="flex items-center gap-1 text-white/70 hover:text-white"
					onClick={() => setIsExpanded(!isExpanded)}
					type="button"
				>
					<span>{isExpanded ? "▼" : "▶"}</span>
					<span className="text-purple-400">Array({value.length})</span>
				</button>
				{isExpanded && (
					<div className="ml-6 border-white/10 border-l pl-2">
						{value.map((item, index) => (
							<div className="py-1" key={index}>
								<span className="text-white/50">[{index}]:</span>{" "}
								<JsonValue path={`${path}[${index}]`} value={item} />
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) {
			return <span className="text-gray-400">{`{}`}</span>;
		}

		return (
			<div className="ml-4">
				<button
					className="flex items-center gap-1 text-white/70 hover:text-white"
					onClick={() => setIsExpanded(!isExpanded)}
					type="button"
				>
					<span>{isExpanded ? "▼" : "▶"}</span>
					<span className="text-purple-400">Object</span>
				</button>
				{isExpanded && (
					<div className="ml-6 border-white/10 border-l pl-2">
						{entries.map(([key, val]) => (
							<div className="py-1" key={key}>
								<span className="font-medium text-white/90">{key}:</span>{" "}
								<JsonValue path={path ? `${path}.${key}` : key} value={val} />
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	return <span className="text-gray-400">{String(value)}</span>;
}

export function JsonTreeRenderer({ data, hideMessage }: JsonTreeRendererProps) {
	if (!hideMessage) {
		console.log("No matching schema found for data:", data);
	}

	return (
		<div className="rounded p-4">
			{!hideMessage && (
				<div className="mb-2 text-white/50 text-xs">
					No matching schema found. Showing JSON tree view:
				</div>
			)}
			<div className="font-mono text-sm">
				<JsonValue value={data} />
			</div>
		</div>
	);
}
