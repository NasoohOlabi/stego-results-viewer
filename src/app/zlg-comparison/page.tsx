import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { OvernightFindingsShell } from "../overnight-findings/overnight-findings-shell";

type ResultRow = {
	post_id?: string;
	sample_index?: number;
	payload?: string;
	stegotext?: string | null;
	accepted?: boolean;
	reason?: string | null;
	domain?: string;
	comment_chain?: string;
	source_output_file?: string;
};

const RUN_DIR = "D:\\Master\\code\\stego\\stego-side-wing\\metrics\\zlg_comparison_runs\\zlg_api_live_20260527_limit5";
const RESULTS_JSONL = path.join(RUN_DIR, "results.jsonl");
const PROGRESS_JSON = path.join(RUN_DIR, "progress.json");
const SUMMARY_JSON = path.join(RUN_DIR, "summary.json");

function readJson(pathname: string): Record<string, unknown> | null {
	if (!existsSync(pathname)) return null;
	try {
		return JSON.parse(readFileSync(pathname, "utf-8")) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function readJsonl(pathname: string): ResultRow[] {
	if (!existsSync(pathname)) return [];
	return readFileSync(pathname, "utf-8")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line) as ResultRow;
			} catch {
				return {};
			}
		});
}

function firstLine(value?: string): string {
	if (!value) return "n/a";
	return value.split("\n")[0] ?? value;
}

export default async function ZlgComparisonPage() {
	const progress = readJson(PROGRESS_JSON);
	const summary = readJson(SUMMARY_JSON);
	const rows = readJsonl(RESULTS_JSONL);
	const acceptedRows = rows.filter((r) => Boolean(r.accepted));
	const failedRows = rows.filter((r) => !r.accepted);

	const reasonCounts = new Map<string, number>();
	for (const row of failedRows) {
		const key = row.reason ?? "unknown";
		reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
	}
	const topReasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
	const sampleRows = acceptedRows.slice(0, 12);

	return (
		<OvernightFindingsShell>
			<main className="min-h-screen bg-[#0d1117] px-6 py-8 text-slate-100">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="space-y-2">
						<p className="font-medium text-cyan-300 text-sm uppercase tracking-wider">
							ZLG Comparison
						</p>
						<h1 className="font-bold text-3xl">Method vs ZLG Results</h1>
						<p className="text-slate-400 text-sm">{RUN_DIR}</p>
					</header>

					<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
						<Stat label="Rows Parsed" value={String(rows.length)} />
						<Stat label="Accepted" value={String(acceptedRows.length)} />
						<Stat label="Failed" value={String(failedRows.length)} />
						<Stat
							label="Progress"
							value={String(progress?.processed_now ?? "n/a")}
							sub={String(progress?.updated_at_utc ?? "n/a")}
						/>
						<Stat
							label="Summary Failed"
							value={String(summary?.failed ?? "n/a")}
							sub={String(summary?.updated_at_utc ?? "n/a")}
						/>
					</section>

					<section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
						<h2 className="mb-3 font-semibold text-lg">Top Failure Reasons</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead className="text-slate-400">
									<tr className="border-white/10 border-b">
										<th className="py-2 pr-3">Count</th>
										<th className="py-2 pr-3">Reason</th>
									</tr>
								</thead>
								<tbody>
									{topReasons.map(([reason, count]) => (
										<tr className="border-white/5 border-b" key={`${reason}-${count}`}>
											<td className="py-2 pr-3">{count}</td>
											<td className="py-2 pr-3 font-mono text-xs">{reason}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					<section className="space-y-3">
						<h2 className="font-semibold text-lg">Side-by-Side Examples</h2>
						{sampleRows.length === 0 ? (
							<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
								No successful ZLG samples yet in this run.
							</div>
						) : (
							sampleRows.map((row, idx) => (
								<div
									className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-2"
									key={`${row.post_id}-${row.sample_index}-${idx}`}
								>
									<div className="space-y-2">
										<p className="text-slate-400 text-xs uppercase tracking-wide">Original Method</p>
										<p className="text-xs">
											<span className="text-slate-400">Post:</span> {row.post_id} |{" "}
											<span className="text-slate-400">Sample:</span> {row.sample_index}
										</p>
										<p className="text-xs">
											<span className="text-slate-400">Payload:</span> {row.payload ?? "n/a"}
										</p>
										<p className="text-xs">
											<span className="text-slate-400">Domain:</span> {firstLine(row.domain)}
										</p>
										<p className="text-xs">
											<span className="text-slate-400">Chain:</span> {firstLine(row.comment_chain)}
										</p>
									</div>
									<div className="space-y-2">
										<p className="text-slate-400 text-xs uppercase tracking-wide">ZLG Result</p>
										<p className="text-xs">
											<span className="text-slate-400">Accepted:</span> true
										</p>
										<div className="max-h-40 overflow-auto rounded border border-white/10 bg-black/20 p-2 font-mono text-xs">
											{row.stegotext ?? "No stegotext generated"}
										</div>
									</div>
								</div>
							))
						)}
					</section>
				</div>
			</main>
		</OvernightFindingsShell>
	);
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
	return (
		<div className="rounded-lg border border-white/15 bg-white/[0.04] p-4">
			<p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-2 font-bold text-2xl">{value}</p>
			{sub ? <p className="mt-1 text-slate-500 text-xs">{sub}</p> : null}
		</div>
	);
}
