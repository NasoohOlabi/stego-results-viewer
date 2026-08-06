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
				<span className="font-medium text-white/90">
					{info.getValue() as string}
				</span>
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
			<div className="py-4 text-center text-white/30 italic">
				No angles found
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between px-2">
				<div className="flex items-center gap-4">
					<div className="text-white/40 text-xs">
						Showing{" "}
						{table.getState().pagination.pageIndex *
							table.getState().pagination.pageSize +
							1}{" "}
						to{" "}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) *
								table.getState().pagination.pageSize,
							data.length,
						)}{" "}
						of {data.length} results
					</div>
					<div className="flex items-center gap-2">
						<label className="text-white/40 text-xs" htmlFor="angle-page-size">
							Rows per page:
						</label>
						<select
							className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-white/60 text-xs focus:border-white/20 focus:outline-none"
							id="angle-page-size"
							onChange={(e) => {
								table.setPageSize(Number(e.target.value));
							}}
							value={table.getState().pagination.pageSize}
						>
							{[5, 10, 20, 50].map((pageSize) => (
								<option
									className="bg-[#1a1a1a]"
									key={pageSize}
									value={pageSize}
								>
									{pageSize}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						aria-label="Previous page"
						className="rounded-md p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						<ChevronLeft size={18} />
					</button>
					<span className="min-w-12 text-center font-medium text-white/60 text-xs">
						{table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
					</span>
					<button
						aria-label="Next page"
						className="rounded-md p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
			<div className="overflow-hidden rounded-md border border-white/10">
				<table className="w-full border-collapse text-left">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr
								className="border-white/10 border-b bg-white/5"
								key={headerGroup.id}
							>
								{headerGroup.headers.map((header) => (
									<th
										className="p-3 font-semibold text-white/40 text-xs uppercase tracking-wider"
										key={header.id}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="divide-y divide-white/10">
						{table.getRowModel().rows.map((row) => (
							<tr className="transition-colors hover:bg-white/5" key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<td className="p-3 align-top" key={cell.id}>
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
