"use client";

import { useMemo, useState } from "react";
import type { StegoResult } from "~/schemas/stego-result";
import { buildAllDocs, type StegoResultItem } from "./stego-result-docs";

interface StegoResultCompressionViewProps {
	data: StegoResult;
	filename?: string | null;
}

type CompressionRef = {
	doc: number | null;
	idx: number;
	len: number;
};

const HUES = [
	200, 280, 45, 160, 320, 25, 190, 300, 130, 340, 70, 250, 110, 5, 220,
];

function hueForIndex(i: number): number {
	const h = HUES[i % HUES.length];
	return h ?? 200;
}

function resolveRefText(
	ref: CompressionRef,
	allDocs: string[],
	payload: string | undefined,
): { text: string | null; source: "doc" | "payload" | "none" } {
	const docIndex = ref.doc;
	if (docIndex !== null && docIndex !== undefined) {
		const docStr = allDocs[docIndex];
		if (typeof docStr === "string") {
			if (ref.idx < 0 || ref.len < 0 || ref.idx + ref.len > docStr.length) {
				return { text: null, source: "doc" };
			}
			return { text: docStr.slice(ref.idx, ref.idx + ref.len), source: "doc" };
		}
	}
	if (payload && ref.idx >= 0 && ref.len >= 0) {
		if (ref.idx + ref.len <= payload.length) {
			return {
				text: payload.slice(ref.idx, ref.idx + ref.len),
				source: "payload",
			};
		}
	}
	return { text: null, source: "none" };
}

function docLabel(doc: number | null): string {
	if (doc === null || doc === undefined) return "literal / payload";
	if (doc === 0) return "selftext";
	return `corpus #${doc}`;
}

function snippetAround(
	full: string,
	idx: number,
	len: number,
	pad = 48,
): string {
	if (!full || len < 0 || idx < 0) return "";
	const start = Math.max(0, idx - pad);
	const end = Math.min(full.length, idx + len + pad);
	const left = start > 0 ? "…" : "";
	const right = end < full.length ? "…" : "";
	return `${left}${full.slice(start, end)}${right}`;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Find `needle` in `haystack` at or after `from`, case-insensitive; returns start index or -1. */
function findInsensitive(
	haystack: string,
	needle: string,
	from: number,
): number {
	if (!needle) return -1;
	const slice = haystack.slice(from);
	try {
		const re = new RegExp(escapeRegExp(needle), "i");
		const m = re.exec(slice);
		return m ? from + m.index : -1;
	} catch {
		return -1;
	}
}

const MIN_FUZZY_LEN = 3;

/**
 * Map a resolved chunk to a range in the payload: exact, case-insensitive, or
 * progressively shorter suffixes (dictionary chunks may not match verbatim).
 */
function findBestPayloadSpan(
	haystack: string,
	needle: string,
	cursor: number,
): { start: number; end: number } | null {
	const trimmed = needle.trim();
	let candidate = trimmed.length >= MIN_FUZZY_LEN ? trimmed : needle;
	if (!candidate) return null;

	if (candidate.length < MIN_FUZZY_LEN) {
		let pos = haystack.indexOf(candidate, cursor);
		if (pos === -1) pos = findInsensitive(haystack, candidate, cursor);
		if (pos !== -1) {
			return { start: pos, end: pos + candidate.length };
		}
		return null;
	}

	const tryOne = (s: string): { start: number; end: number } | null => {
		if (s.length < MIN_FUZZY_LEN) return null;
		let pos = haystack.indexOf(s, cursor);
		if (pos === -1) pos = findInsensitive(haystack, s, cursor);
		if (pos !== -1) return { start: pos, end: pos + s.length };
		return null;
	};

	for (;;) {
		const hit = tryOne(candidate);
		if (hit) return hit;
		if (candidate.length <= MIN_FUZZY_LEN) break;
		candidate = candidate.slice(0, -1);
	}
	return null;
}

/**
 * When chunks are not found in the payload, partition the payload by ref order weighted
 * by `len`, distributing rounding remainder so every character is covered exactly once.
 */
function buildProportionalPieces(
	haystack: string,
	refs: CompressionRef[],
): SegmentPiece[] {
	const n = haystack.length;
	const r = refs.length;
	if (!n || !r) return [];

	const weights = refs.map((ref) => Math.max(1, ref.len));
	const totalW = weights.reduce((a, b) => a + b, 0);

	/** One char per ref for the first `n` refs when stego is shorter than ref count. */
	if (n < r) {
		const pieces: SegmentPiece[] = [];
		for (let i = 0; i < n; i++) {
			pieces.push({
				kind: "ref",
				start: i,
				end: i + 1,
				refIndex: i,
				matched: true,
			});
		}
		return pieces;
	}

	const counts = weights.map((w) => Math.floor((n * w) / totalW));
	const allocated = counts.reduce((a, b) => a + b, 0);
	const remainder = n - allocated;
	const order = weights
		.map((w, i) => ({
			i,
			frac: (n * w) / totalW - Math.floor((n * w) / totalW),
		}))
		.sort((a, b) => b.frac - a.frac);
	for (let k = 0; k < remainder; k++) {
		const idx = order[k % order.length]?.i ?? k % r;
		counts[idx] = (counts[idx] ?? 0) + 1;
	}

	const pieces: SegmentPiece[] = [];
	let pos = 0;
	for (let i = 0; i < r; i++) {
		const len = counts[i] ?? 0;
		const end = pos + len;
		if (len > 0) {
			pieces.push({
				kind: "ref",
				start: pos,
				end,
				refIndex: i,
				matched: true,
			});
		}
		pos = end;
	}
	return pieces;
}

type SegmentPiece =
	| { kind: "plain"; start: number; end: number }
	| {
			kind: "ref";
			start: number;
			end: number;
			refIndex: number;
			matched: boolean;
	  };

function buildPayloadSegments(
	haystack: string,
	refs: CompressionRef[],
	allDocs: string[],
	payload: string | undefined,
): {
	pieces: SegmentPiece[];
	rows: {
		refIndex: number;
		ref: CompressionRef;
		resolvedSource: "doc" | "payload" | "none";
		matchedInPayload: boolean;
		matchStart: number | null;
		matchEnd: number | null;
		resolvedText: string | null;
		snippet: string | null;
		docFull: string | null;
		matchMode: "verbatim" | "proportional";
	}[];
} {
	type Row = {
		refIndex: number;
		ref: CompressionRef;
		resolvedSource: "doc" | "payload" | "none";
		matchedInPayload: boolean;
		matchStart: number | null;
		matchEnd: number | null;
		resolvedText: string | null;
		snippet: string | null;
		docFull: string | null;
		matchMode: "verbatim" | "proportional";
	};

	const rows: Row[] = [];

	let cursor = 0;
	let pieces: SegmentPiece[] = [];

	const pushPlain = (start: number, end: number) => {
		if (end > start) pieces.push({ kind: "plain", start, end });
	};

	let verbatimCount = 0;

	for (let i = 0; i < refs.length; i++) {
		const ref = refs[i];
		if (!ref) continue;
		const { text, source } = resolveRefText(ref, allDocs, payload);
		let matched = false;
		let matchStart: number | null = null;
		let matchEnd: number | null = null;
		let snippet: string | null = null;
		let docFull: string | null = null;

		const literalInPayload =
			(ref.doc === null || ref.doc === undefined) &&
			payload &&
			ref.idx >= 0 &&
			ref.len >= 0 &&
			ref.idx + ref.len <= payload.length;

		if (literalInPayload) {
			const s = ref.idx;
			const e = ref.idx + ref.len;
			matched = true;
			verbatimCount += 1;
			matchStart = s;
			matchEnd = e;
			if (s > cursor) pushPlain(cursor, s);
			pieces.push({
				kind: "ref",
				start: s,
				end: e,
				refIndex: i,
				matched: true,
			});
			cursor = Math.max(cursor, e);
		} else if (text && text.length > 0 && haystack.length > 0) {
			const span = findBestPayloadSpan(haystack, text, cursor);
			if (span) {
				matched = true;
				verbatimCount += 1;
				matchStart = span.start;
				matchEnd = span.end;
				if (span.start > cursor) pushPlain(cursor, span.start);
				pieces.push({
					kind: "ref",
					start: span.start,
					end: span.end,
					refIndex: i,
					matched: true,
				});
				cursor = span.end;
			}
		}

		if (ref.doc !== null && ref.doc !== undefined) {
			const corpus = allDocs[ref.doc];
			if (typeof corpus === "string") {
				docFull = corpus;
				if (ref.idx >= 0 && ref.len >= 0) {
					snippet = snippetAround(docFull, ref.idx, ref.len);
				}
			}
		} else if (payload && source === "payload" && text) {
			snippet = text;
		}

		rows.push({
			refIndex: i,
			ref,
			resolvedSource: source,
			matchedInPayload: matched,
			matchStart,
			matchEnd,
			resolvedText: text,
			snippet,
			docFull,
			matchMode: "verbatim",
		});
	}

	if (cursor < haystack.length) {
		pushPlain(cursor, haystack.length);
	}

	const useProportional =
		verbatimCount === 0 && haystack.length > 0 && refs.length > 0;

	if (useProportional) {
		pieces = buildProportionalPieces(haystack, refs);
		for (const row of rows) {
			const p = pieces.find(
				(x): x is Extract<SegmentPiece, { kind: "ref" }> =>
					x.kind === "ref" && x.refIndex === row.refIndex,
			);
			row.matchMode = "proportional";
			if (p) {
				row.matchedInPayload = true;
				row.matchStart = p.start;
				row.matchEnd = p.end;
			} else {
				row.matchedInPayload = false;
				row.matchStart = null;
				row.matchEnd = null;
			}
		}
	}

	return { pieces, rows };
}

function CompressionItemBlock({
	item,
	index,
}: {
	item: StegoResultItem;
	index: number;
}) {
	const [selectedRef, setSelectedRef] = useState<number | null>(null);

	const compression = item.embedding?.compression;
	const refs = (compression?.references ?? []) as CompressionRef[];
	const payload = compression?.payload;
	const payloadText = payload ?? "";

	const allDocs = useMemo(() => buildAllDocs(item), [item]);

	const { pieces, rows } = useMemo(
		() => buildPayloadSegments(payloadText, refs, allDocs, payload),
		[payloadText, refs, allDocs, payload],
	);

	const unmatchedRows = useMemo(
		() =>
			rows.filter(
				(r) =>
					r.resolvedText &&
					!r.matchedInPayload &&
					r.matchMode !== "proportional",
			),
		[rows],
	);

	if (!refs.length) {
		return (
			<div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
				<p className="font-medium text-sm text-white">
					Post #{index + 1}
					{item.post?.title ? ` — ${item.post.title}` : ""}
				</p>
				<p className="text-sm text-white/50">
					No compression references in this item. Dictionary compression
					metadata may be missing or this run used a non-reference encoding.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between text-sm">
				<h4 className="font-semibold text-white">
					#{index + 1}
					{item.post?.title ? (
						<span className="ml-2 font-normal text-white/60">
							{item.post.title}
						</span>
					) : null}
				</h4>
				<span className="text-white/40 text-xs">
					{refs.length} ref{refs.length !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="grid min-h-[200px] grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="flex flex-col rounded-xl border border-white/10 bg-black/30 p-4">
					<div className="mb-2 font-bold text-[10px] text-white/40 uppercase tracking-wider">
						Original payload (by reference)
					</div>
					<div className="max-h-[min(70vh,520px)] overflow-y-auto text-lg text-white/90 leading-relaxed">
						{!payload?.length ? (
							<span className="text-white/50">
								No uncompressed payload on this item (only stego text is
								available).
							</span>
						) : pieces.length === 0 ? (
							<span className="text-white/50">
								Could not map references to substrings of the payload.
							</span>
						) : (
							pieces.map((p) => {
								const slice = payloadText.slice(p.start, p.end);
								const pieceKey =
									p.kind === "plain"
										? `plain-${p.start}-${p.end}`
										: `ref-${p.refIndex}-${p.start}-${p.end}`;
								if (p.kind === "plain") {
									return <span key={pieceKey}>{slice}</span>;
								}
								const hue = hueForIndex(p.refIndex);
								const active = selectedRef === p.refIndex;
								return (
									<button
										className="mx-0.5 inline rounded px-0.5 text-left align-baseline transition-colors"
										key={pieceKey}
										onClick={() => setSelectedRef(p.refIndex)}
										style={{
											backgroundColor: `hsla(${hue}, 65%, 45%, ${active ? 0.45 : 0.28})`,
											boxShadow: active
												? `0 0 0 2px hsl(${hue}, 80%, 60%)`
												: undefined,
										}}
										type="button"
									>
										{slice}
									</button>
								);
							})
						)}
					</div>
					{unmatchedRows.length > 0 ? (
						<div className="mt-3 border-white/10 border-t pt-3">
							<p className="mb-2 text-[10px] text-amber-400/80 uppercase tracking-wider">
								Not linked in payload (see panel)
							</p>
							<div className="flex flex-wrap gap-1.5">
								{unmatchedRows.map((row) => {
									const hue = hueForIndex(row.refIndex);
									return (
										<button
											className="rounded-md border border-amber-500/40 px-2 py-1 font-mono text-[10px] text-amber-200/90 transition-colors hover:bg-amber-500/15"
											key={row.refIndex}
											onClick={() => setSelectedRef(row.refIndex)}
											style={{
												boxShadow:
													selectedRef === row.refIndex
														? `0 0 0 2px hsl(${hue}, 70%, 50%)`
														: undefined,
											}}
											type="button"
										>
											REF #{row.refIndex}
										</button>
									);
								})}
							</div>
						</div>
					) : null}
				</div>

				<div className="flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
					<div className="shrink-0 border-white/10 border-b p-3 font-bold text-[10px] text-white/40 uppercase tracking-wider">
						References &amp; snippets
					</div>
					<div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
						{rows.map((row) => {
							const hue = hueForIndex(row.refIndex);
							const docMissing =
								row.ref.doc !== null &&
								row.ref.doc !== undefined &&
								typeof allDocs[row.ref.doc] !== "string";
							const unresolved =
								!row.resolvedText ||
								row.resolvedSource === "none" ||
								docMissing;
							const noPayloadMatch = row.resolvedText && !row.matchedInPayload;
							const proportionalOk =
								row.matchMode === "proportional" && row.matchedInPayload;
							const active = selectedRef === row.refIndex;
							const docIdx = row.ref.doc;
							const showSnippetMissing =
								!row.snippet &&
								!unresolved &&
								docIdx !== null &&
								docIdx !== undefined &&
								typeof allDocs[docIdx] === "string";
							return (
								<button
									className={`w-full rounded-lg border p-2 text-left font-mono text-[11px] transition-colors ${
										active
											? "border-white/25 bg-white/10"
											: "border-white/10 bg-black/20 hover:bg-black/35"
									}`}
									key={row.refIndex}
									onClick={() => setSelectedRef(row.refIndex)}
									type="button"
								>
									<div className="flex flex-wrap items-center gap-2 text-white/50">
										<span
											className="rounded px-1.5 py-0.5 font-semibold text-white text-xs"
											style={{
												backgroundColor: `hsla(${hue}, 60%, 40%, 0.5)`,
											}}
										>
											REF #{row.refIndex}
										</span>
										<span>
											{docLabel(row.ref.doc)} · idx {row.ref.idx} · len{" "}
											{row.ref.len}
										</span>
										{unresolved ? (
											<span className="text-amber-400/90">
												Unresolved source
											</span>
										) : null}
										{proportionalOk ? (
											<span className="text-cyan-400/85">
												Heuristic span (ref order · weighted by len)
											</span>
										) : null}
										{noPayloadMatch ? (
											<span className="text-amber-400/90">
												Not found in payload
											</span>
										) : null}
									</div>
									{row.resolvedText ? (
										<div className="mt-1 text-white/85 text-xs leading-snug">
											<span className="text-white/40">Match: </span>
											{row.resolvedText}
										</div>
									) : null}
									{row.snippet ? (
										<div className="mt-1 break-words text-[10px] text-white/60 leading-relaxed">
											<span className="text-white/35">Context: </span>
											{row.snippet}
										</div>
									) : showSnippetMissing ? (
										<div className="mt-1 text-[10px] text-amber-400/80">
											No snippet (index out of range for document)
										</div>
									) : null}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{(compression?.ratio ?? 0) > 0 || compression?.compressed ? (
				<div className="rounded-lg border border-white/5 bg-black/20 p-3 font-mono text-[10px] text-white/45">
					<span className="text-white/30">Compressed bits length: </span>
					{compression?.compressed?.length ?? "—"}
					{(compression?.ratio ?? 0) > 0 ? (
						<>
							{" "}
							<span className="text-white/30">· ratio </span>
							{((compression?.ratio ?? 0) * 100).toFixed(1)}%
						</>
					) : null}
				</div>
			) : null}
		</div>
	);
}

export function StegoResultCompressionView({
	data,
	filename: _filename,
}: StegoResultCompressionViewProps) {
	return (
		<div className="space-y-10">
			<div className="border-white/10 border-b pb-2">
				<h3 className="font-semibold text-white">Compression view</h3>
				<p className="text-white/45 text-xs">
					Left: uncompressed{" "}
					<code className="rounded bg-white/10 px-1 py-0.5 text-[10px]">
						embedding.compression.payload
					</code>
					. Literal refs use payload idx/len; dictionary chunks are matched or
					shown as length-weighted spans. Right: corpus snippets for each ref.
				</p>
			</div>
			{data.map((item, index) => (
				<CompressionItemBlock
					index={index}
					item={item}
					key={`${item.post?.id ?? index}-${index}`}
				/>
			))}
		</div>
	);
}
