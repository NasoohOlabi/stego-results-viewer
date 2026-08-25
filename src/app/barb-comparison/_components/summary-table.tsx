export const BALANCED_COLOR = "#94a3b8";
export const BARB_COLOR = "#22d3ee";

export type SummaryTableRow = {
	label: string;
	balanced: string;
	barb: string;
	winner: "balanced" | "barb" | "tie" | "n/a";
	direction?: "lower" | "higher";
	detail?: string;
	caveat?: string;
	secondary?: string;
};

function WinnerBadge({ winner }: { winner: SummaryTableRow["winner"] }) {
	if (winner === "n/a") return <span className="text-slate-500">—</span>;
	if (winner === "tie")
		return <span className="font-medium text-slate-400">Tie</span>;
	const color = winner === "barb" ? BARB_COLOR : BALANCED_COLOR;
	const label = winner === "barb" ? "BARB" : "Balanced";
	return (
		<span className="font-semibold" style={{ color }}>
			{label}
		</span>
	);
}

export function SummaryTable({ rows }: { rows: SummaryTableRow[] }) {
	if (rows.length === 0) {
		return (
			<div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 text-sm">
				No summary metrics yet — waiting for{" "}
				<code className="rounded bg-black/30 px-1">
					comparison/summary.json
				</code>{" "}
				or paired rows.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04]">
			<table className="w-full text-left text-sm">
				<thead className="text-slate-400 text-xs uppercase tracking-wide">
					<tr className="border-white/10 border-b">
						<th className="py-2 pr-3 pl-4">Metric</th>
						<th className="py-2 pr-3">
							<span style={{ color: BALANCED_COLOR }}>●</span> Balanced
							(control)
						</th>
						<th className="py-2 pr-3">
							<span style={{ color: BARB_COLOR }}>●</span> BARB
						</th>
						<th className="py-2 pr-3">Lean</th>
						<th className="py-2 pr-4">Detail</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							className="border-white/5 border-b last:border-0"
							key={row.label}
						>
							<td className="py-2 pr-3 pl-4 text-slate-200">
								{row.label}
								{row.direction ? (
									<span className="ml-1.5 text-[10px] text-slate-500">
										{row.direction === "lower"
											? "↓ lower is better"
											: "↑ higher is better"}
									</span>
								) : null}
								{row.caveat ? (
									<p className="mt-1 max-w-md font-normal text-[11px] text-slate-500 normal-case leading-snug tracking-normal">
										{row.caveat}
									</p>
								) : null}
							</td>
							<td
								className="py-2 pr-3 font-mono"
								style={{
									color: row.winner === "balanced" ? BALANCED_COLOR : "#e2e8f0",
									fontWeight: row.winner === "balanced" ? 700 : 400,
								}}
							>
								{row.balanced}
							</td>
							<td
								className="py-2 pr-3 font-mono"
								style={{
									color: row.winner === "barb" ? BARB_COLOR : "#e2e8f0",
									fontWeight: row.winner === "barb" ? 700 : 400,
								}}
							>
								{row.barb}
							</td>
							<td className="py-2 pr-3">
								<WinnerBadge winner={row.winner} />
							</td>
							<td className="py-2 pr-4 text-slate-500 text-xs">
								{[row.detail, row.secondary].filter(Boolean).join(" · ") || "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
