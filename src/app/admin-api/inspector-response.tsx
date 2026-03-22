import { ObjectInspector } from "react-inspector";
import type { ReactNode } from "react";
import { normalizeForInspector } from "./utils";

export function renderInspectorValue(value: unknown): ReactNode {
	const normalized = normalizeForInspector(value);
	if (normalized === null || normalized === undefined) {
		return <span className="text-white/60">No response yet.</span>;
	}

	if (typeof normalized !== "object") {
		return (
			<pre className="whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-white/80">
				{String(normalized)}
			</pre>
		);
	}

	return (
		<div className="overflow-auto text-xs leading-relaxed">
			<ObjectInspector
				data={normalized}
				theme="chromeDark"
				expandLevel={2}
			/>
		</div>
	);
}
