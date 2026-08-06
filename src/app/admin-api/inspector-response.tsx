import type { ReactNode } from "react";
import { ObjectInspector } from "react-inspector";
import { normalizeForInspector } from "./utils";

export function renderInspectorValue(value: unknown): ReactNode {
	const normalized = normalizeForInspector(value);
	if (normalized === null || normalized === undefined) {
		return <span className="text-white/60">No response yet.</span>;
	}

	if (typeof normalized !== "object") {
		return (
			<pre className="wrap-break-word whitespace-pre-wrap text-white/80 text-xs leading-relaxed">
				{String(normalized)}
			</pre>
		);
	}

	return (
		<div className="overflow-auto text-xs leading-relaxed">
			<ObjectInspector data={normalized} expandLevel={2} theme="chromeDark" />
		</div>
	);
}
