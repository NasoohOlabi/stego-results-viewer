"use client";

import { useMemo } from "react";
import { findMatchingRenderer } from "~/schemas/registry";
import { JsonTreeRenderer } from "./renderers/json-tree-renderer";

interface ParsedViewProps {
	data: unknown;
	filename: string | null;
}

export function ParsedView({ data, filename }: ParsedViewProps) {
	const matchedRenderer = useMemo(() => findMatchingRenderer(data), [data]);

	const RendererComponent = matchedRenderer?.component ?? JsonTreeRenderer;

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			<div className="shrink-0 border-b border-white/10 px-4 py-2">
				<div className="flex items-center justify-between">
					<h3 className="font-medium text-sm text-white">
						{filename} - Parsed View
					</h3>
					{matchedRenderer && (
						<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
							{matchedRenderer.name}
						</span>
					)}
				</div>
			</div>
			<div className="flex-1 overflow-y-auto p-4">
				<RendererComponent data={data} />
			</div>
		</div>
	);
}
