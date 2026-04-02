"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ADMIN_API_ACTION_USE_BUMP_EVENT,
	ADMIN_API_ACTION_USE_COUNTS_KEY,
	API_ACTION_OPTIONS,
	API_TOOL_OPTIONS,
	type ApiActionId,
	parseAdminApiActionUseCounts,
} from "./types";

const MOST_USED_LIMIT = 12;

function readCountsFromStorage(): Partial<Record<ApiActionId, number>> {
	if (typeof window === "undefined") return {};
	return parseAdminApiActionUseCounts(
		localStorage.getItem(ADMIN_API_ACTION_USE_COUNTS_KEY),
	);
}

function mostUsedIds(
	counts: Partial<Record<ApiActionId, number>>,
): ApiActionId[] {
	return API_ACTION_OPTIONS.map((o) => o.id)
		.filter((id) => (counts[id] ?? 0) > 0)
		.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
		.slice(0, MOST_USED_LIMIT);
}

export interface ApiActionSelectorProps {
	value: ApiActionId;
	onChange: (id: ApiActionId) => void;
}

export function ApiActionSelector({ value, onChange }: ApiActionSelectorProps) {
	const [open, setOpen] = useState(false);
	const [, setBumpTick] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onBump = () => setBumpTick((t) => t + 1);
		window.addEventListener(ADMIN_API_ACTION_USE_BUMP_EVENT, onBump);
		return () =>
			window.removeEventListener(ADMIN_API_ACTION_USE_BUMP_EVENT, onBump);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const counts = readCountsFromStorage();
	const topUsed = mostUsedIds(counts);

	const currentLabel = useMemo(
		() => API_ACTION_OPTIONS.find((o) => o.id === value)?.label ?? value,
		[value],
	);

	const pick = useCallback(
		(id: ApiActionId) => {
			onChange(id);
			setOpen(false);
		},
		[onChange],
	);

	return (
		<div className="relative w-full min-w-0" ref={rootRef}>
			<button
				aria-expanded={open}
				aria-haspopup="listbox"
				className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-left text-sm hover:bg-black/40"
				onClick={() => setOpen((o) => !o)}
				type="button"
			>
				<span className="min-w-0 truncate">{currentLabel}</span>
				<span aria-hidden className="shrink-0 text-white/50 text-xs">
					{open ? "▲" : "▼"}
				</span>
			</button>
			{open ? (
				<div
					className="absolute z-50 mt-1 max-h-[min(24rem,70vh)] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-md border border-white/10 bg-zinc-950 py-1 shadow-xl"
					role="listbox"
				>
					{topUsed.length > 0 ? (
						<div className="mb-1 border-white/10 border-b pb-1">
							<div className="px-3 py-1 font-semibold text-white/80 text-xs">
								Most used
							</div>
							{topUsed.map((id) => {
								const opt = API_ACTION_OPTIONS.find((o) => o.id === id);
								if (!opt) return null;
								const selected = id === value;
								return (
									<button
										aria-selected={selected}
										className={`flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-blue-600/35 ${
											selected ? "bg-blue-600/25" : ""
										}`}
										key={`top-${id}`}
										onClick={() => pick(id)}
										role="option"
										type="button"
									>
										<span className="min-w-0 flex-1 truncate">{opt.label}</span>
										<span className="shrink-0 text-white/40 text-xs tabular-nums">
											{counts[id] ?? 0}
										</span>
									</button>
								);
							})}
						</div>
					) : null}
					{API_TOOL_OPTIONS.map((tool) => {
						const options = API_ACTION_OPTIONS.filter(
							(o) => o.apiToolId === tool.id,
						);
						if (options.length === 0) return null;
						return (
							<div className="py-0.5" key={tool.id}>
								<div className="px-3 py-1 font-semibold text-white/80 text-xs">
									{tool.label}
								</div>
								{options.map((opt) => {
									const selected = opt.id === value;
									return (
										<button
											aria-selected={selected}
											className={`w-full min-w-0 px-3 py-1.5 text-left text-sm hover:bg-blue-600/35 ${
												selected ? "bg-blue-600/25" : ""
											}`}
											key={opt.id}
											onClick={() => pick(opt.id)}
											role="option"
											type="button"
										>
											<span className="block truncate">{opt.label}</span>
										</button>
									);
								})}
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
