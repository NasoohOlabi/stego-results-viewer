/**
 * Pure scoring helpers for the codex LLM-judge judgments, shared between the
 * interactive panel (_components/llm-judge-panel.tsx) and the `.md` export
 * (../../zlg-comparison.md/route.ts) so both report identical numbers.
 */

export type Judgment = {
	task_id?: string;
	metric?: string;
	method?: string;
	post_id?: string;
	pair_id?: string;
	result?: Record<string, unknown> | null;
	answer?: Record<string, unknown> | null;
	error?: string | null;
	judge_model?: string;
};

export type JudgeProgress = {
	metric?: string;
	total_tasks?: number;
	completed?: number;
	pending?: number;
	errors?: number;
	complete?: boolean;
	valid_completed?: number;
	failed_tasks?: number;
	verified_pending?: number;
};

export function value(value: unknown): string {
	if (value === null || value === undefined) return "n/a";
	return typeof value === "number" ? value.toFixed(3) : String(value);
}

export function rate(
	rows: Judgment[],
	metric: string,
	method: string,
	key: string,
): number | null {
	const subset = rows.filter(
		(row) =>
			row.metric === metric &&
			row.method === method &&
			row.result &&
			row.answer,
	);
	if (!subset.length) return null;
	return (
		subset.filter((row) => row.result?.[key] === row.answer?.[key]).length /
		subset.length
	);
}

export function pickedRate(rows: Judgment[], method: string): number | null {
	const subset = rows.filter(
		(row) => row.metric === "weak_link" && row.result && row.answer,
	);
	if (!subset.length) return null;
	return (
		subset.filter((row) => {
			const index = Number(row.result?.weakest_index) - 1;
			const methods = row.answer?.methods;
			return Array.isArray(methods) && methods.at(index) === method;
		}).length / subset.length
	);
}

export function meanScore(
	rows: Judgment[],
	method: string,
	key: string,
): number | null {
	const values = rows
		.filter((row) => row.metric === "register" && row.method === method)
		.map((row) => row.result?.[key])
		.filter((item): item is number => typeof item === "number");
	return values.length
		? values.reduce((total, item) => total + item, 0) / values.length
		: null;
}
