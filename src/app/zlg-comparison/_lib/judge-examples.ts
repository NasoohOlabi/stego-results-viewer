/**
 * Resolves the pinned examples declared in ./judge-copy.ts against the frozen
 * judge artifacts, at render time.
 *
 * Examples are pinned by post id rather than by content: the spec fixes which
 * comment carries which argument, so a justification stays stable under review,
 * while the text and the judge's rationale are read from the artifact so a
 * quote can never drift from the thing it claims to quote.
 *
 * `projectJudgment` in ./data.ts drops `prompt_fields` because it dominates a
 * 43 MB file and nothing rendered it. The human arm's comment text lives only
 * there, so this module keeps those fields for pinned post ids alone and
 * discards every other row at parse time.
 */

import path from "node:path";
import { readJsonlCached } from "~/server/artifact-cache";
import { RUN_DIR } from "./data";
import type { JudgeArm, PinnedExample } from "./judge-copy";

const COMPARISON_DIR = path.join(RUN_DIR, "comparison_dataset");
const CODEX_JUDGMENTS_DIR = path.join(COMPARISON_DIR, "codex_judgments");
const PAIRED_ROWS_JSONL = path.join(COMPARISON_DIR, "paired_rows.jsonl");

export const ARM_LABEL: Record<JudgeArm, string> = {
	our_method: "Our method",
	zlg: "ZLG",
	human: "Human arm",
};

export type ScoreChip = { label: string; value: string };

export type ResolvedArm = {
	arm: JudgeArm;
	label: string;
	/** Verbatim. Never normalised: in the register examples the typos are the evidence. */
	text: string | null;
	evidence: string | null;
	outcome: string | null;
	scores: ScoreChip[];
};

export type ResolvedExample = {
	postId: string;
	title: string | null;
	caption: string;
	arms: ResolvedArm[];
	/** Set when the pinned id could not be resolved. Never silently substituted. */
	unavailable: string | null;
};

type RawRow = {
	metric?: string;
	method?: string;
	post_id?: string;
	pair_id?: string;
	result?: Record<string, unknown> | null;
	answer?: Record<string, unknown> | null;
	promptFields?: Record<string, unknown> | null;
};

const str = (value: unknown): string | null =>
	typeof value === "string" && value.trim() ? value : null;
const num = (value: unknown): number | null =>
	typeof value === "number" && Number.isFinite(value) ? value : null;

function record(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Reads one metric's judgments, keeping full rows only for the pinned posts. */
function readMetricRows(metric: string, postIds: Set<string>) {
	return readJsonlCached<RawRow>(
		path.join(CODEX_JUDGMENTS_DIR, `${metric}_judgments.jsonl`),
		`judge-example:${metric}:${[...postIds].sort().join(",")}`,
		(row) => {
			const postId = str(row.post_id);
			if (!postId || !postIds.has(postId)) return null;
			return {
				metric: str(row.metric) ?? metric,
				method: str(row.method) ?? undefined,
				post_id: postId,
				pair_id: str(row.pair_id) ?? undefined,
				result: record(row.result),
				answer: record(row.answer),
				promptFields: record(row.prompt_fields),
			};
		},
	);
}

function readPairedText(postIds: Set<string>) {
	return readJsonlCached<{
		post_id: string;
		method: string;
		stegotext: string | null;
	}>(
		PAIRED_ROWS_JSONL,
		`judge-example-paired:${[...postIds].sort().join(",")}`,
		(row) => {
			const postId = str(row.post_id);
			const method = str(row.method);
			if (!postId || !method || !postIds.has(postId)) return null;
			return { post_id: postId, method, stegotext: str(row.stegotext) };
		},
	);
}

function titleFrom(rows: RawRow[]): string | null {
	for (const row of rows) {
		const fields = row.promptFields;
		if (!fields) continue;
		const title =
			str(fields.title) ?? str(fields.post_title) ?? str(fields.thread_title);
		if (title) return title;
	}
	return null;
}

/** Per-metric outcome, score chips and candidate text for one arm. */
function readArm(
	metric: string,
	arm: JudgeArm,
	rows: RawRow[],
	pairedText: Map<string, string>,
): ResolvedArm {
	const base: ResolvedArm = {
		arm,
		label: ARM_LABEL[arm],
		text: null,
		evidence: null,
		outcome: null,
		scores: [],
	};

	if (metric === "weak_link") return readWeakLinkArm(arm, rows, base);

	const row = rows.find((item) => item.method === arm);
	if (!row?.result) return base;
	const result = row.result;
	const answer = row.answer ?? {};

	base.evidence = str(result.evidence);
	base.text =
		str(row.promptFields?.candidate) ??
		(arm === "human" ? null : (pairedText.get(arm) ?? null));

	if (metric === "standout") {
		const picked = num(result.inserted_index);
		const truth = num(answer.inserted_index);
		const caught = picked !== null && picked === truth;
		base.outcome = caught ? "Named correctly" : "Not identified";
		const confidence = num(result.confidence);
		if (confidence !== null)
			base.scores.push({ label: "confidence", value: String(confidence) });
	} else if (metric === "attribution") {
		const picked = num(result.thread_index);
		const truth = num(answer.thread_index);
		base.outcome =
			picked !== null && picked === truth ? "Correct thread" : "Wrong thread";
		const confidence = num(result.confidence);
		if (confidence !== null)
			base.scores.push({ label: "confidence", value: String(confidence) });
	} else if (metric === "suspicion") {
		const suspicion = num(result.suspicion);
		if (suspicion !== null)
			base.scores.push({ label: "suspicion", value: String(suspicion) });
		const tells = Array.isArray(result.tells)
			? result.tells.filter((item): item is string => typeof item === "string")
			: [];
		const real = tells.filter((tell) => tell !== "none");
		base.outcome = real.length ? real.join(", ") : "no tell";
	} else if (metric === "register") {
		for (const key of [
			"overall",
			"mechanics",
			"tone_formality",
			"insider_knowledge",
			"length_norm",
		]) {
			const score = num(result[key]);
			if (score !== null)
				base.scores.push({
					label: key.replace(/_/g, " "),
					value: String(score),
				});
		}
	}
	return base;
}

/**
 * Weak-link rows are stored once per slate with `method: "paired"`, so an arm is
 * located through `answer.methods`, which lists the arms in candidate order.
 */
function readWeakLinkArm(
	arm: JudgeArm,
	rows: RawRow[],
	base: ResolvedArm,
): ResolvedArm {
	const row = rows[0];
	if (!row?.result) return base;
	const methods = Array.isArray(row.answer?.methods)
		? (row.answer.methods as unknown[]).map((item) => String(item))
		: [];
	const index = methods.indexOf(arm);
	if (index < 0) return base;

	base.text = str(row.promptFields?.[`candidate_${index + 1}`]);
	base.evidence = str(row.result.evidence);
	const weakest = num(row.result.weakest_index);
	base.outcome =
		weakest !== null && weakest - 1 === index
			? "Named weakest"
			: "Not named weakest";
	const ranking = row.result.ranking;
	if (Array.isArray(ranking)) {
		const rank = ranking.findIndex((item) => Number(item) - 1 === index);
		if (rank >= 0) base.scores.push({ label: "rank", value: String(rank + 1) });
	}
	return base;
}

export async function resolveExamples(
	examples: PinnedExample[],
): Promise<ResolvedExample[]> {
	if (!examples.length) return [];
	const postIds = new Set(examples.map((example) => example.postId));
	const metrics = new Set(examples.map((example) => example.metric));

	const [pairedRows, ...metricRows] = await Promise.all([
		readPairedText(postIds),
		...[...metrics].map((metric) => readMetricRows(metric, postIds)),
	]);
	const byMetric = new Map(
		[...metrics].map((metric, index) => [metric, metricRows[index] ?? []]),
	);

	return examples.map((example) => {
		const rows = (byMetric.get(example.metric) ?? []).filter(
			(row) => row.post_id === example.postId,
		);
		const paired = new Map<string, string>();
		for (const row of pairedRows) {
			if (row.post_id === example.postId && row.stegotext)
				paired.set(row.method, row.stegotext);
		}
		const arms = example.arms.map((arm) =>
			readArm(example.metric, arm, rows, paired),
		);
		const resolved = arms.some((item) => item.text || item.evidence);
		return {
			postId: example.postId,
			title: titleFrom(rows),
			caption: example.caption,
			arms,
			unavailable: resolved
				? null
				: `No ${example.metric} judgment found for ${example.postId} in this run.`,
		};
	});
}
