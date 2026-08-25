import {
	BARB_RUNS_ROOT_PATH,
	loadBarbComparisonData,
} from "../barb-comparison/_lib/data";
import { fmtPct } from "../barb-comparison/_lib/format";

/**
 * Agent-facing plain-text mirror of /barb-comparison.
 * Same loader as the interactive page so numbers never drift.
 */
export const dynamic = "force-dynamic";

const DEFAULT_SAMPLE_LIMIT = 25;

function mdTable(headers: string[], rows: string[][]): string {
	const escapeCell = (cell: string) =>
		cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
	const head = `| ${headers.join(" | ")} |`;
	const sep = `| ${headers.map(() => "---").join(" | ")} |`;
	const body = rows
		.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
		.join("\n");
	return [head, sep, body].join("\n");
}

function winnerLabel(winner: string): string {
	if (winner === "n/a") return "—";
	if (winner === "tie") return "Tie";
	if (winner === "barb") return "BARB";
	if (winner === "balanced") return "Balanced";
	return winner;
}

export async function GET(request: Request) {
	const data = await loadBarbComparisonData();
	const { searchParams } = new URL(request.url);
	const sampleParam = searchParams.get("samples");
	const sampleLimit =
		sampleParam === "all"
			? data.samples.length
			: Math.max(0, Number(sampleParam) || DEFAULT_SAMPLE_LIMIT);

	const lines: string[] = [];
	const push = (line = "") => lines.push(line);

	push("# BARB vs Balanced");
	push();
	push(
		"Bit-bearing Argumentative Reddit Bite — thread-specific, strong emotion/opinion (varied register, **not always sarcastic**), pointed argument, anti-platitude.",
	);
	push();
	push(`- Run directory: \`${data.runDir || "(none)"}\``);
	push(`- Resolution: \`${data.resolution}\``);
	push(`- Runs root: \`${BARB_RUNS_ROOT_PATH}\``);
	push(`- Last updated: ${String(data.updatedAt ?? "n/a").slice(0, 19)}`);
	push(`- Generated: ${new Date().toISOString()}`);
	push();

	if (data.empty) {
		push("## Empty state");
		push();
		push(
			"No BARB run found. Set `BARB_RUN_DIR` to a finished run under `metrics/experiments/barb/runs/<run_id>`, or drop a `pinned` dir / pin file there.",
		);
		push();
		push("```text");
		push(
			"export BARB_RUN_DIR=/path/to/stego-side-wing/metrics/experiments/barb/runs/<run_id>",
		);
		push("```");
		const body = lines.join("\n");
		return new Response(body, {
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"Content-Disposition": 'inline; filename="barb-comparison.md"',
			},
		});
	}

	push("## Lean-in attributes");
	push();
	push("- Thread specificity (concrete entity / event / number / policy)");
	push(
		"- Strong emotion + clear opinion — sarcasm *or* frustration, enthusiasm, skepticism, etc.",
	);
	push("- Pointed one-beat argument (not a soft hedge)");
	push("- Anti-platitude / safe-universal reject");
	push();

	push("## Top-line stats");
	push();
	push(
		mdTable(
			["Stat", "Value"],
			[
				["Paired observations", String(data.pairedN)],
				["Balanced rows", String(data.balanced?.n ?? 0)],
				["BARB rows", String(data.barb?.n ?? 0)],
				["Balanced ITT", fmtPct(data.balanced?.itt_success_rate)],
				["BARB ITT", fmtPct(data.barb?.itt_success_rate)],
				["BARB specificity", fmtPct(data.barb?.thread_specificity_rate)],
				["BARB strong affect", fmtPct(data.barb?.affect_opinion_rate)],
				["BARB platitude rate", fmtPct(data.barb?.safe_universal_rate)],
			],
		),
	);
	push();

	push("## Summary metrics");
	push();
	push(
		mdTable(
			["Metric", "Balanced", "BARB", "Lean", "Detail"],
			data.summaryRows.map((row) => [
				row.direction
					? `${row.label} (${row.direction === "lower" ? "↓ lower is better" : "↑ higher is better"})`
					: row.label,
				row.balanced,
				row.barb,
				winnerLabel(row.winner),
				[row.detail, row.secondary, row.caveat].filter(Boolean).join(" · ") ||
					"—",
			]),
		),
	);
	push();

	const shownSamples = data.samples.slice(0, sampleLimit);
	push(
		`## Side-by-side examples (showing ${shownSamples.length} of ${data.samples.length})`,
	);
	push();
	if (shownSamples.length < data.samples.length) {
		push(
			"Truncated for size. Append `?samples=all` (or `?samples=<N>`) for more.",
		);
		push();
	}
	for (const sample of shownSamples) {
		push(`### Pair ${sample.key} — post \`${sample.postId}\``);
		push();
		if (sample.coverPreview) push(`Thread context: ${sample.coverPreview}`);
		push();
		push(
			`**Balanced** (${sample.balancedWordCount ?? "n/a"} words${sample.balancedBadges?.length ? `; ${sample.balancedBadges.join(", ")}` : ""}):`,
		);
		push(`> ${sample.balancedText.replace(/\n/g, "\n> ")}`);
		push();
		push(
			`**BARB** (${sample.barbWordCount ?? "n/a"} words${sample.barbBadges?.length ? `; ${sample.barbBadges.join(", ")}` : ""}):`,
		);
		push(`> ${sample.barbText.replace(/\n/g, "\n> ")}`);
		push();
	}

	if (data.runDir) {
		push("---");
		push();
		push(`Source: \`${data.runDir}/comparison/\``);
	}

	const body = lines.join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Content-Disposition": 'inline; filename="barb-comparison.md"',
		},
	});
}
