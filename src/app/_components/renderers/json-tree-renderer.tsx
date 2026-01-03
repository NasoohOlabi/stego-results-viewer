"use client";

import { useState } from "react";

interface JsonTreeRendererProps {
	data: unknown;
	hideMessage?: boolean;
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
		return (
			<span className="text-green-400">
				"{value}"
			</span>
		);
	}

	if (typeof value === "number") {
		return <span className="text-blue-400">{value}</span>;
	}

	if (typeof value === "boolean") {
		return (
			<span className="text-yellow-400">
				{value ? "true" : "false"}
			</span>
		);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-gray-400">[]</span>;
		}

		return (
			<div className="ml-4">
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-1 text-white/70 hover:text-white"
				>
					<span>{isExpanded ? "▼" : "▶"}</span>
					<span className="text-purple-400">
						Array({value.length})
					</span>
				</button>
				{isExpanded && (
					<div className="ml-6 border-l border-white/10 pl-2">
						{value.map((item, index) => (
							<div key={index} className="py-1">
								<span className="text-white/50">
									[{index}]:
								</span>{" "}
								<JsonValue
									value={item}
									path={`${path}[${index}]`}
								/>
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
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="flex items-center gap-1 text-white/70 hover:text-white"
				>
					<span>{isExpanded ? "▼" : "▶"}</span>
					<span className="text-purple-400">Object</span>
				</button>
				{isExpanded && (
					<div className="ml-6 border-l border-white/10 pl-2">
						{entries.map(([key, val]) => (
							<div key={key} className="py-1">
								<span className="text-white/90 font-medium">
									{key}:
								</span>{" "}
								<JsonValue
									value={val}
									path={path ? `${path}.${key}` : key}
								/>
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
	return (
		<div className="rounded p-4">
			{!hideMessage && (
				<div className="mb-2 text-xs text-white/50">
					No matching schema found. Showing JSON tree view:
				</div>
			)}
			<div className="font-mono text-sm">
				<JsonValue value={data} />
			</div>
		</div>
	);
}
