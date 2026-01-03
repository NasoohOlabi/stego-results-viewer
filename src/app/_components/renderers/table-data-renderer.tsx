"use client";

import type { TableData } from "~/schemas/table-data";

interface TableDataRendererProps {
	data: TableData;
}

export function TableDataRenderer({ data: rows }: TableDataRendererProps) {
	if (rows.length === 0) {
		return (
			<div className="rounded border border-white/10 p-4 text-center text-white/50">
				Empty array - no data to display
			</div>
		);
	}

	// Get all unique keys from all objects to create column headers
	const columns = Array.from(
		new Set(rows.flatMap((row) => Object.keys(row))),
	).sort();

	return (
		<div className="overflow-x-auto rounded-lg border border-white/10">
			<div className="min-w-full">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b border-white/10">
							{columns.map((column) => (
								<th
									key={column}
									className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/70"
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, rowIndex) => (
							<tr
								key={rowIndex}
								className="border-b border-white/5 transition-colors hover:bg-white/5"
							>
								{columns.map((column) => {
									const value = row[column];
									return (
										<td
											key={column}
											className="px-4 py-3 text-sm text-white/80"
										>
											{value === null ? (
												<span className="text-white/30">
													null
												</span>
											) : value === undefined ? (
												<span className="text-white/30">
													—
												</span>
											) : typeof value === "object" ? (
												<code className="rounded bg-white/10 px-2 py-1 text-xs">
													{JSON.stringify(value)}
												</code>
											) : typeof value === "boolean" ? (
												<span
													className={`rounded-full px-2 py-0.5 text-xs ${
														value
															? "bg-green-500/20 text-green-300"
															: "bg-red-500/20 text-red-300"
													}`}
												>
													{String(value)}
												</span>
											) : (
												String(value)
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="border-t border-white/10 px-4 py-2 text-xs text-white/50">
				Showing {rows.length} row{rows.length !== 1 ? "s" : ""}
			</div>
		</div>
	);
}
