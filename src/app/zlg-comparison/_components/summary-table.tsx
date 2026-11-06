export const OURS_COLOR = "#22d3ee";
export const ZLG_COLOR = "#fb923c";

export type SummaryTableRow = {
	label: string;
	ours: string;
	zlg: string;
	winner: "ours" | "zlg" | "tie" | "n/a";
	direction?: "lower" | "higher" | "descriptive";
	detail?: string;
	caveat?: string;
	secondary?: string;
};

function WinnerBadge({ winner }: { winner: SummaryTableRow["winner"] }) {
	if (winner === "n/a") return <span className="text-slate-500">—</span>;
	if (winner === "tie")
		return <span className="font-medium text-slate-400">Tie</span>;
	const color = winner === "ours" ? OURS_COLOR : ZLG_COLOR;
	const label = winner === "ours" ? "Ours" : "ZLG";
	return (
		<span className="font-semibold" style={{ color }}>
			{label}
		</span>
	);
}

export function SummaryTable({ rows }: { rows: SummaryTableRow[] }) {
	return (
		<div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.04]">
			<table className="w-full text-left text-sm">
				<thead className="text-slate-400 text-xs uppercase tracking-wide">
					<tr className="border-white/10 border-b">
						<th className="py-2 pr-3 pl-4">Metric</th>
						<th className="py-2 pr-3">
							<span style={{ color: OURS_COLOR }}>●</span> Our Method
						</th>
						<th className="py-2 pr-3">
							<span style={{ color: ZLG_COLOR }}>●</span> ZLG Baseline
						</th>
						<th className="py-2 pr-3">Winner</th>
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
											: row.direction === "higher"
												? "↑ higher is better"
												: "descriptive, no preferred direction"}
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
									color: row.winner === "ours" ? OURS_COLOR : "#e2e8f0",
									fontWeight: row.winner === "ours" ? 700 : 400,
								}}
							>
								{row.ours}
							</td>
							<td
								className="py-2 pr-3 font-mono"
								style={{
									color: row.winner === "zlg" ? ZLG_COLOR : "#e2e8f0",
									fontWeight: row.winner === "zlg" ? 700 : 400,
								}}
							>
								{row.zlg}
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
