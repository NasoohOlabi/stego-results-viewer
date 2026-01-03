"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface PaginatedTableProps {
	items: string[];
	pageSize?: number;
}

export function PaginatedTable({
	items,
	pageSize: initialPageSize = 5
}: PaginatedTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	if (items.length === 0) {
		return (
			<div className="text-white/30 italic py-4 text-center">
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
					<div className="text-xs text-white/40">
						Showing {startIndex + 1} to{" "}
						{Math.min(startIndex + pageSize, items.length)} of {items.length}{" "}
						results
					</div>
					<div className="flex items-center gap-2">
						<label
							htmlFor="page-size-select"
							className="text-xs text-white/40"
						>
							Rows per page:
						</label>
						<select
							id="page-size-select"
							value={pageSize}
							onChange={(e) => {
								setPageSize(Number(e.target.value));
								setCurrentPage(1);
							}}
							className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white/60 focus:outline-none focus:border-white/20"
						>
							{[5, 10, 20, 50, 100].map((size) => (
								<option key={size} value={size} className="bg-[#1a1a1a]">
									{size}
								</option>
							))}
						</select>
					</div>
				</div>
				{totalPages > 1 && (
					<div className="flex items-center gap-2">
						<button
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
							disabled={currentPage === 1}
							aria-label="Previous page"
							className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLeft size={18} />
						</button>
						<span className="text-xs font-medium text-white/60 min-w-12 text-center">
							{currentPage} / {totalPages}
						</span>
						<button
							onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
							disabled={currentPage === totalPages}
							aria-label="Next page"
							className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight size={18} />
						</button>
					</div>
				)}
			</div>
			<div className="rounded-md border border-white/10 overflow-hidden">
				<table className=" text-left border-collapse table-fixed">
					<tbody className="divide-y divide-white/10">
						{currentItems.map((text, i) => (
							<tr
								key={startIndex + i}
								className="hover:bg-white/5 transition-colors"
							>
								<td className="p-4 text-sm text-white/80 leading-relaxed overflow-hidden">
									<div className="whitespace-pre-wrap wrap-break-word w-[calc(70vw-2rem)]">
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
