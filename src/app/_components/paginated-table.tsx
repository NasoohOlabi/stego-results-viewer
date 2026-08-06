"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PaginatedTableProps {
	items: string[];
	pageSize?: number;
}

export function PaginatedTable({
	items,
	pageSize: initialPageSize = 5,
}: PaginatedTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	if (items.length === 0) {
		return (
			<div className="py-4 text-center text-white/30 italic">
				No search results
			</div>
		);
	}

	const totalPages = Math.ceil(items.length / pageSize);
	const startIndex = (currentPage - 1) * pageSize;
	const currentItems = items.slice(startIndex, startIndex + pageSize);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between px-2">
				<div className="flex items-center gap-4">
					<div className="text-white/40 text-xs">
						Showing {startIndex + 1} to{" "}
						{Math.min(startIndex + pageSize, items.length)} of {items.length}{" "}
						results
					</div>
					<div className="flex items-center gap-2">
						<label className="text-white/40 text-xs" htmlFor="page-size-select">
							Rows per page:
						</label>
						<select
							className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-white/60 text-xs focus:border-white/20 focus:outline-none"
							id="page-size-select"
							onChange={(e) => {
								setPageSize(Number(e.target.value));
								setCurrentPage(1);
							}}
							value={pageSize}
						>
							{[5, 10, 20, 50, 100].map((size) => (
								<option className="bg-[#1a1a1a]" key={size} value={size}>
									{size}
								</option>
							))}
						</select>
					</div>
				</div>
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<button
							aria-label="Previous page"
							className="rounded-md p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
							disabled={currentPage === 1}
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft size={18} />
						</button>
						<span className="min-w-12 text-center font-medium text-white/60 text-xs">
							{currentPage} / {totalPages}
						</span>
						<button
							aria-label="Next page"
							className="rounded-md p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
						>
							<ChevronRight size={18} />
						</button>
					</div>
				)}
			</div>
			<div className="overflow-hidden rounded-md border border-white/10">
				<table className="table-fixed border-collapse text-left">
					<tbody className="divide-y divide-white/10">
						{currentItems.map((text, i) => (
							<tr
								className="transition-colors hover:bg-white/5"
								key={startIndex + i}
							>
								<td className="overflow-hidden p-4 text-sm text-white/80 leading-relaxed">
									<div className="wrap-break-word w-[calc(70vw-2rem)] whitespace-pre-wrap">
										{text}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
