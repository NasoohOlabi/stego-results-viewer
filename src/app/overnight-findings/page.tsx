import { api } from "~/trpc/server";
import { OvernightFindingsShell } from "./overnight-findings-shell";

const percent = (value: number | null) =>
	value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
const ratio = (succeeded: number, requested: number) =>
	requested > 0 ? `${succeeded}/${requested}` : "n/a";
const number = (value: number | null | undefined, digits = 2) =>
	value == null ? "n/a" : value.toFixed(digits);

type RowWithRun = { runName: string };

function pickLatestRunName<T extends RowWithRun>(rows: T[]) {
	const names = rows.map((row) => row.runName).sort();
	return names.at(-1) ?? null;
}

function rowsForLatestRun<T extends RowWithRun>(rows: T[]) {
	const latestRun = pickLatestRunName(rows);
	return latestRun ? rows.filter((row) => row.runName === latestRun) : [];
}

export default async function OvernightFindingsPage() {
	const [securityMetrics, supervisor, progress] = await Promise.all([
		api.overnightFindings.getSecurityVariantMetrics(),
		api.overnightFindings.getSupervisorStatus(),
		api.overnightFindings.getProgressSnapshot(),
	]);

	const latestE2ERows = rowsForLatestRun(progress.e2e.rows);
	const latestModelRows = rowsForLatestRun(progress.modelAblation.rows);
	const latestGateRows = rowsForLatestRun(progress.naturalnessGate.rows);
	const latestFeedback = [...progress.feedback.rows]
		.sort((a, b) => a.runName.localeCompare(b.runName))
		.at(-1);
	const latestAngleScan = [...progress.angleScan.rows]
		.sort((a, b) => a.runName.localeCompare(b.runName))
		.at(-1);

	return (
		<OvernightFindingsShell>
			<main className="min-h-screen bg-[#101312] px-6 py-8 text-slate-100">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="space-y-2">
						<p className="font-medium text-emerald-300 text-sm uppercase tracking-wider">
							Overnight Dashboard
						</p>
						<h1 className="font-bold text-3xl">Current Progress</h1>
						<p className="text-slate-400 text-sm">
							Latest-run view only. Generated: {progress.generatedAtUtc || "n/a"}
						</p>
						<p className="max-w-5xl text-slate-300 text-sm">
							Number format: <span className="font-mono">x/y</span> means{" "}
							<span className="font-medium">succeeded/requested samples</span>.{" "}
							Percent next to cards is success rate from the same scope. KLD/JSD/PPL
							come from side-wing metrics files. E2E top card is aggregated across mixed
							run configs; use latest-run tables for strict comparisons.
						</p>
					</header>

					<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
						<Card
							label="E2E"
							value={ratio(progress.e2e.totalSucceeded, progress.e2e.totalRequested)}
							detail={percent(progress.e2e.successRate)}
							hint="All e2e rows under metrics/e2e_runs: succeeded/requested across mixed variants/configs/sample sizes."
						/>
						<Card
							label="Model Ablation"
							value={ratio(
								progress.modelAblation.totalSucceeded,
								progress.modelAblation.totalRequested,
							)}
							detail={percent(progress.modelAblation.successRate)}
							hint="Succeeded/requested across model lanes; requested is samples_per_model per lane, not only successful rows."
						/>
						<Card
							label="Naturalness Gate"
							value={ratio(
								progress.naturalnessGate.totalSucceeded,
								progress.naturalnessGate.totalRequested,
							)}
							detail={percent(progress.naturalnessGate.successRate)}
							hint="Succeeded/requested across naturalness-gate experiment rows."
							labelTooltip="Naturalness gate = stricter acceptance filter for stego text. A sample is counted succeeded only if text passes the gate, decodes correctly, and metrics are produced."
						/>
						<Card
							label="Angle Scan"
							value={ratio(
								progress.angleScan.totalSucceeded,
								progress.angleScan.totalRequested,
							)}
							detail={percent(progress.angleScan.successRate)}
							hint="Angle decode pass count over total tested angles."
						/>
						<Card
							label="Supervisor"
							value={supervisor.isActive ? "Active" : "Stopped"}
							detail={supervisor.lastEventTimestamp || "n/a"}
							hint="Runner monitor state from supervisor JSONL; timestamp is last emitted event."
						/>
					</section>

					<section className="grid gap-6 xl:grid-cols-2">
						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-3 font-semibold text-lg">Latest E2E Run</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Samples = succeeded/requested for that variant in this run. KLD/JSD are
								divergence vs matched-post baseline. PPL is average perplexity.
							</p>
							<DataTable
								headers={["Variant", "Samples", "KLD", "JSD", "PPL"]}
								rows={latestE2ERows.map((row) => [
									row.variant,
									ratio(row.succeeded, row.requested),
									number(row.matchedPostKl, 3),
									number(row.matchedPostJsd, 3),
									number(row.perplexity, 2),
								])}
								empty="No e2e data"
							/>
						</div>

						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-3 font-semibold text-lg">Latest Model Ablation</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Samples = succeeded/requested per model lane. Fail% = failed/requested.
								KLD/JSD are quality metrics on successful outputs only.
							</p>
							<DataTable
								headers={["Model", "Samples", "Fail%", "KLD", "JSD"]}
								rows={latestModelRows.map((row) => [
									row.model,
									ratio(row.succeeded, row.requested),
									percent(row.failureRate),
									number(row.matchedPostKl, 3),
									number(row.matchedPostJsd, 3),
								])}
								empty="No model-ablation data"
							/>
						</div>
					</section>

					<section className="grid gap-6 xl:grid-cols-3">
						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-3 font-semibold text-lg">Latest Security Comparison</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Samples = succeeded/requested by variant. Lower KLD/JSD/PPL is generally
								better naturalness similarity.
							</p>
							<DataTable
								headers={["Variant", "Samples", "KLD", "JSD", "PPL"]}
								rows={securityMetrics.map((row) => [
									row.variant,
									ratio(row.succeeded, row.requested),
									number(row.matchedPostKl, 3),
									number(row.matchedPostJsd, 3),
									number(row.perplexity, 2),
								])}
								empty="No security data"
							/>
						</div>

						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-3 font-semibold text-lg">Latest Naturalness Gate Run</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Samples = succeeded/requested for each gate variant in the latest run.
								KLD/JSD/PPL are computed on successful rows.
							</p>
							<DataTable
								headers={["Variant", "Samples", "KLD", "JSD", "PPL"]}
								rows={latestGateRows.map((row) => [
									row.variant,
									ratio(row.succeeded, row.requested),
									number(row.matchedPostKl, 3),
									number(row.matchedPostJsd, 3),
									number(row.perplexity, 2),
								])}
								empty="No naturalness-gate data"
							/>
						</div>

						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
							<h2 className="mb-3 font-semibold text-lg">Latest Diagnostics</h2>
							<p className="mb-3 text-slate-400 text-xs">
								Adaptive feedback line shows succeeded/requested and fail rate for the
								latest feedback run. Angle scan line shows per-post scan success and JSON
								format failure rate.
							</p>
							<div className="space-y-3 text-sm">
								<div>
									<p className="text-slate-400">Adaptive feedback</p>
									<p>
										{latestFeedback
											? `${latestFeedback.runName} | ${ratio(
													latestFeedback.succeeded,
													latestFeedback.requested,
												)} | fail ${percent(latestFeedback.failureRate)}`
											: "n/a"}
									</p>
								</div>
								<div>
									<p className="text-slate-400">Angle scan</p>
									<p>
										{latestAngleScan
											? `${latestAngleScan.runName} | ${latestAngleScan.postId} | success ${percent(
													latestAngleScan.successRate,
												)} | json fail ${percent(latestAngleScan.jsonFailRate)}`
											: "n/a"}
									</p>
								</div>
							</div>
						</div>
					</section>
				</div>
			</main>
		</OvernightFindingsShell>
	);
}

function Card({
	label,
	value,
	detail,
	hint,
	labelTooltip,
}: {
	label: string;
	value: string;
	detail?: string;
	hint?: string;
	labelTooltip?: string;
}) {
	return (
		<div className="rounded-lg border border-white/15 bg-white/[0.04] p-4">
			<p className="text-slate-400 text-xs uppercase tracking-wide">
				{label}
				{labelTooltip ? (
					<span
						className="ml-1 cursor-help rounded border border-slate-500/40 px-1 text-[10px] text-slate-300 normal-case tracking-normal"
						title={labelTooltip}
					>
						?
					</span>
				) : null}
			</p>
			<p className="mt-2 font-bold text-2xl">{value}</p>
			{detail ? <p className="mt-1 text-slate-400 text-xs">{detail}</p> : null}
			{hint ? <p className="mt-2 text-slate-500 text-xs leading-5">{hint}</p> : null}
		</div>
	);
}

function DataTable({
	headers,
	rows,
	empty,
}: {
	headers: string[];
	rows: string[][];
	empty: string;
}) {
	if (rows.length === 0) {
		return <p className="text-slate-400 text-sm">{empty}</p>;
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="text-slate-400">
					<tr className="border-white/10 border-b">
						{headers.map((header) => (
							<th className="py-2 pr-3" key={header}>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr className="border-white/5 border-b" key={row.join("|") + rowIndex}>
							{row.map((cell, cellIndex) => (
								<td
									className={`py-2 pr-3 ${cellIndex === 0 ? "font-mono text-xs" : ""}`}
									key={`${cell}-${cellIndex}`}
								>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
