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
		<div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
			{matchedRenderer && (
				<div className="shrink-0 border-b border-white/10 px-4 py-1 flex justify-end">
					<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 uppercase tracking-wider font-semibold">
						{matchedRenderer.name}
					</span>
				</div>
			)}
			<div className="flex-1 overflow-y-auto p-4 min-h-0">
				<RendererComponent data={data} />
			</div>
		</div>
	);
}
