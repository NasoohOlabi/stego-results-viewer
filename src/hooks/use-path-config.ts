"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "stego-path-config";

export interface PathEntry {
	id: string;
	label: string;
	path?: string;
	enabled: boolean;
	isBuiltIn: boolean;
}

const DEFAULT_ENTRIES: PathEntry[] = [
	{ id: "side-wing", label: "Side Wing", enabled: true, isBuiltIn: true },
	{ id: "local", label: "Local", enabled: true, isBuiltIn: true },
];

function loadStored(): PathEntry[] {
	if (typeof window === "undefined") return DEFAULT_ENTRIES;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_ENTRIES;
		const parsed = JSON.parse(raw) as PathEntry[];
		// Merge with defaults: override built-in enabled state, append custom
		const builtInIds = new Set(DEFAULT_ENTRIES.map((e) => e.id));
		const overrides = new Map(parsed.filter((e) => builtInIds.has(e.id)).map((e) => [e.id, e]));
		const custom = parsed.filter((e) => !e.isBuiltIn);
		return [
			...DEFAULT_ENTRIES.map((d) => {
				const o = overrides.get(d.id);
				return o ? { ...d, enabled: o.enabled } : d;
			}),
			...custom,
		];
	} catch {
		return DEFAULT_ENTRIES;
	}
}

function saveStored(entries: PathEntry[]) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Returns the pathId to send to the API (built-in id or absolute path for custom) */
export function getPathIdForApi(entry: PathEntry): string {
	if (entry.isBuiltIn) return entry.id;
	return entry.path ?? entry.id;
}

export function usePathConfig() {
	const [entries, setEntries] = useState<PathEntry[]>(DEFAULT_ENTRIES);

	useEffect(() => {
		setEntries(loadStored());
	}, []);

	const save = useCallback((next: PathEntry[]) => {
		setEntries(next);
		saveStored(next);
	}, []);

	const enabledPaths = entries.filter((e) => e.enabled);

	const togglePath = useCallback(
		(id: string) => {
			save(
				entries.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)),
			);
		},
		[entries, save],
	);

	const addPath = useCallback(
		(label: string, path: string) => {
			const id = crypto.randomUUID().slice(0, 8);
			save([...entries, { id, label, path, enabled: true, isBuiltIn: false }]);
			return id;
		},
		[entries, save],
	);

	const removePath = useCallback(
		(id: string) => {
			save(entries.filter((e) => e.id !== id || e.isBuiltIn));
		},
		[entries, save],
	);

	const updatePath = useCallback(
		(id: string, updates: Partial<Pick<PathEntry, "label" | "path" | "enabled">>) => {
			save(
				entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
			);
		},
		[entries, save],
	);

	const getPathIdForApiById = useCallback(
		(id: string): string | null => {
			const entry = entries.find((e) => e.id === id);
			if (!entry) return null;
			return getPathIdForApi(entry);
		},
		[entries],
	);

	return {
		pathEntries: entries,
		enabledPaths,
		togglePath,
		addPath,
		removePath,
		updatePath,
		getPathIdForApiById,
	};
}
