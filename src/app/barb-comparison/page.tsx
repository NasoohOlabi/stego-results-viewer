import { BarbExplainer } from "~/app/_components/research-explainers";
import { OvernightFindingsShell } from "../overnight-findings/overnight-findings-shell";
import { SampleBrowser } from "./_components/sample-browser";
import {
	BALANCED_COLOR,
	BARB_COLOR,
	SummaryTable,
} from "./_components/summary-table";
import { BARB_RUNS_ROOT_PATH, loadBarbComparisonData } from "./_lib/data";
import { fmtPct } from "./_lib/format";

export const dynamic = "force-dynamic";

export default async function BarbComparisonPage() {
	const data = await loadBarbComparisonData();

	return (
		<OvernightFindingsShell>
			<main className="min-h-screen bg-[#0d1117] px-6 py-8 text-slate-100">
				<div className="mx-auto max-w-7xl space-y-8">
					<header className="space-y-2">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="font-medium text-cyan-300 text-sm uppercase tracking-wider">
									BARB Flavor Comparison
								</p>
								<h1 className="font-bold text-3xl">BARB vs Balanced</h1>
							</div>
							<a
								className="rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-slate-300 text-xs hover:bg-white/[0.08]"
								href="/barb-comparison.md"
							>
								View as Markdown ↗
							</a>
						</div>
						<p className="font-mono text-slate-500 text-xs">
							{data.runDir || "(no run directory)"} · resolved via{" "}
							{data.resolution}
						</p>
					</header>

					<BarbExplainer here="barb" />

					{data.empty ? (
						<section className="space-y-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100 text-sm leading-relaxed">
							<p className="font-semibold text-base">No BARB run found yet</p>
							<p>
								Looking under{" "}
								<code className="rounded bg-black/30 px-1">
									{BARB_RUNS_ROOT_PATH}
								</code>
								. Point the page at a finished pilot with:
							</p>
							<pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-slate-200 text-xs">
								{`# PowerShell / bash
set BARB_RUN_DIR=D:\\Master\\code\\stego\\stego-side-wing\\metrics\\experiments\\barb\\runs\\<run_id>
# or
export BARB_RUN_DIR=/path/to/.../barb/runs/<run_id>`}
							</pre>
							<p>
								Without{" "}
								<code className="rounded bg-black/30 px-1">BARB_RUN_DIR</code>,
								the loader uses a{" "}
								<code className="rounded bg-black/30 px-1">pinned</code>{" "}
								subdirectory / pin file, else the newest run under{" "}
								<code className="rounded bg-black/30 px-1">runs/</code>.
							</p>
						</section>
					) : (
						<>
							<section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
								<Stat
									label="Paired observations"
									value={String(data.pairedN)}
								/>
								<Stat
									label="Balanced ITT"
									sub={`${data.balanced?.n ?? 0} rows`}
									value={fmtPct(data.balanced?.itt_success_rate)}
								/>
								<Stat
									label="BARB ITT"
									sub={`${data.barb?.n ?? 0} rows`}
									value={fmtPct(data.barb?.itt_success_rate)}
								/>
								<Stat
									label="BARB specificity"
									value={fmtPct(data.barb?.thread_specificity_rate)}
								/>
								<Stat
									label="Last updated"
									value={String(data.updatedAt ?? "n/a").slice(0, 19)}
								/>
							</section>

							<section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-5">
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<h2 className="font-semibold text-lg">Summary metrics</h2>
									<div className="flex items-center gap-3 text-xs">
										<span className="flex items-center gap-1 text-slate-400">
											<span style={{ color: BALANCED_COLOR }}>●</span> Balanced
										</span>
										<span className="flex items-center gap-1 text-slate-400">
											<span style={{ color: BARB_COLOR }}>●</span> BARB
										</span>
									</div>
								</div>
								<p className="text-slate-400 text-xs leading-relaxed">
									Same posts/angles; only the encode flavor differs. Lean column
									is descriptive (no Holm adjustment on this pilot page).
								</p>
								<SummaryTable rows={data.summaryRows} />
							</section>

							<section className="space-y-3">
								<h2 className="font-semibold text-lg">
									Side-by-side samples ({data.samples.length})
								</h2>
								<SampleBrowser samples={data.samples} />
							</section>
						</>
					)}
				</div>
			</main>
		</OvernightFindingsShell>
	);
}

function Stat({
	label,
	value,
	sub,
}: {
	label: string;
	value: string;
	sub?: string;
}) {
	return (
		<div className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
			<p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
			<p className="mt-2 font-bold text-2xl">{value}</p>
			{sub ? <p className="mt-1 text-slate-500 text-xs">{sub}</p> : null}
		</div>
	);
}
