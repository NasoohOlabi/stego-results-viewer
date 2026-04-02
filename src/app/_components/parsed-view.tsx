"use client";

import { useMemo, useState } from "react";
import { findMatchingRenderer } from "~/schemas/registry";
import { JsonTreeRenderer } from "./renderers/json-tree-renderer";

interface ParsedViewProps {
	data: unknown;
	filename: string | null;
	pathId?: string;
}

export function ParsedView({ data, filename, pathId }: ParsedViewProps) {
	const matchedRenderer = useMemo(() => findMatchingRenderer(data), [data]);
	const [activeViewId, setActiveViewId] = useState("primary");

	const extras = matchedRenderer?.extraViews ?? [];
	const showViewTabs = extras.length > 0;

	const ViewComponent = useMemo(() => {
		if (!matchedRenderer) return JsonTreeRenderer;
		const altList = matchedRenderer.extraViews;
		if (!altList?.length || activeViewId === "primary") {
			return matchedRenderer.component;
		}
		const alt = altList.find((v) => v.id === activeViewId);
		return alt?.component ?? matchedRenderer.component;
	}, [matchedRenderer, activeViewId]);

	const primaryLabel = matchedRenderer?.primaryViewLabel ?? "Result";

	return (
		<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
			{matchedRenderer && (
				<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-white/10 border-b px-4 py-1.5">
					{showViewTabs ? (
						<div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
							<button
								className={`rounded-md px-2.5 py-1 transition-colors ${
									activeViewId === "primary"
										? "bg-white/15 text-white"
										: "text-white/45 hover:text-white/75"
								}`}
								onClick={() => setActiveViewId("primary")}
								type="button"
							>
								{primaryLabel}
							</button>
							{extras.map((v) => (
								<button
									className={`rounded-md px-2.5 py-1 transition-colors ${
										activeViewId === v.id
											? "bg-white/15 text-white"
											: "text-white/45 hover:text-white/75"
									}`}
									key={v.id}
									onClick={() => setActiveViewId(v.id)}
									type="button"
								>
									{v.label}
								</button>
							))}
						</div>
					) : (
						<span />
					)}
					<span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-[10px] text-white/70 uppercase tracking-wider">
						{matchedRenderer.name}
					</span>
				</div>
			)}
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				<ViewComponent data={data} filename={filename} pathId={pathId} />
			</div>
		</div>
	);
}
