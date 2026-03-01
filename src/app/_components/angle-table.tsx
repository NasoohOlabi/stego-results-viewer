"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AngleData {
	category?: string;
	source_quote?: string;
	tangent?: string;
	source_document?: number;
	idx?: number;
}

interface AngleTableProps {
	data: AngleData[];
}

export function AngleTable({ data }: AngleTableProps) {
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 5,
	});

	const columns: ColumnDef<AngleData>[] = [
		{
			header: "Category",
			accessorKey: "category",
			cell: (info) => (
				<span className="font-medium text-white/90">{info.getValue() as string}</span>
			),
		},
		{
			header: "Source Quote",
			accessorKey: "source_quote",
			cell: (info) => (
				<div className="whitespace-pre-wrap text-sm text-white/70 italic">
					"{info.getValue() as string}"
				</div>
			),
		},
		{
			header: "Tangent",
			accessorKey: "tangent",
			cell: (info) => (
				<div className="whitespace-pre-wrap text-sm text-white/80">
					{info.getValue() as string}
				</div>
			),
		},
	];

	const table = useReactTable({
		data,
		columns,
		state: {
			pagination,
		},
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	if (data.length === 0) {
		return (
			<div className="text-white/30 italic py-4 text-center">
				No angles found
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between px-2">
				<div className="flex items-center gap-4">
					<div className="text-xs text-white/40">
						Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
							data.length
						)}{" "}
						of {data.length} results
					</div>
					<div className="flex items-center gap-2">
						<label htmlFor="angle-page-size" className="text-xs text-white/40">
							Rows per page:
						</label>
						<select
							id="angle-page-size"
							value={table.getState().pagination.pageSize}
							onChange={(e) => {
								table.setPageSize(Number(e.target.value));
							}}
							className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white/60 focus:outline-none focus:border-white/20"
						>
							{[5, 10, 20, 50].map((pageSize) => (
								<option key={pageSize} value={pageSize} className="bg-[#1a1a1a]">
									{pageSize}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						aria-label="Previous page"
						className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronLeft size={18} />
					</button>
					<span className="text-xs font-medium text-white/60 min-w-12 text-center">
						{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
					</span>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						aria-label="Next page"
						className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
			<div className="rounded-md border border-white/10 overflow-hidden">
				<table className="w-full text-left border-collapse">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id} className="bg-white/5 border-b border-white/10">
								{headerGroup.headers.map((header) => (
									<th key={header.id} className="p-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-white/10">
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id} className="hover:bg-white/5 transition-colors">
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="p-3 align-top">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
