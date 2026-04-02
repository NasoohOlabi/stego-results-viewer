"use client";

import { useEffect, useState } from "react";

/** Live-updating elapsed ms since `startedAtMs` while `active` is true. */
export function useRequestElapsedMs(
	startedAtMs: number | undefined,
	active: boolean,
): number | null {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!active || startedAtMs === undefined) return;
		const id = setInterval(() => setNow(Date.now()), 200);
		return () => clearInterval(id);
	}, [active, startedAtMs]);
	if (!active || startedAtMs === undefined) return null;
	return Math.max(0, now - startedAtMs);
}
