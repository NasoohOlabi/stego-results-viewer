"use client";

import {
	ExternalLink,
	Loader2,
	MessageCircle,
	MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ADMIN_API_STORAGE_KEY } from "~/app/admin-api/types";
import {
	normalizeAdminApiBase,
	postMetricsPost
} from "~/app/dashboard/_components/metrics-api-client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "~/components/ui/accordion";
import type { RedditComment, StegoResult } from "~/schemas/stego-result";
import { AngleTable } from "../angle-table";
import { PaginatedTable } from "../paginated-table";
import { PostValidationActions } from "../post-validation-actions";
import { JsonTreeRenderer } from "./json-tree-renderer";

interface StegoResultRendererProps {
	data: StegoResult;
	filename?: string | null;
}

function readStoredBase(): string {
	try {
		const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
		if (!raw) return "http://localhost:5001/api/v1";
		const parsed = JSON.parse(raw) as { baseUrl?: string };
		return typeof parsed.baseUrl === "string"
			? parsed.baseUrl
			: "http://localhost:5001/api/v1";
	} catch {
		return "http://localhost:5001/api/v1";
	}
}

/** Basename suitable for `POST /tools/metrics/post` (`.json`, no path segments). */
function metricsApiFilename(name: string | null | undefined): string | null {
	if (!name?.trim()) return null;
	const base = name.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
	if (!base.toLowerCase().endsWith(".json")) return null;
	return base;
}

function CommentItem({
	comment,
	depth
}: {
	comment: RedditComment;
	depth: number;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const hasReplies = comment.replies && comment.replies.length > 0;

	return (
		<div className="space-y-2">
			<div
				className={`group -ml-2 rounded-lg p-2 transition-colors ${
					hasReplies ? "cursor-pointer hover:bg-white/5" : ""
				}`}
				onClick={() => hasReplies && setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center gap-2 text-[10px] text-white/40">
					<span className="font-bold text-blue-400">
						u/{comment.author ?? "[deleted]"}
					</span>
					<span>•</span>
					<span>{comment.score ?? 0} points</span>
					{hasReplies && (
						<>
							<span>•</span>
							<span className="font-medium text-blue-400/60">
								{isExpanded
									? "Hide replies"
									: `Show ${comment.replies?.length} replies`}
							</span>
						</>
					)}
					<span>•</span>
					<a
						className="transition-colors hover:text-white"
						href={`https://www.reddit.com${comment.permalink}`}
						onClick={(e) => e.stopPropagation()}
						rel="noopener noreferrer"
						target="_blank"
						title="View comment on Reddit"
					>
						<ExternalLink size={10} />
					</a>
				</div>
				<div className="mt-1 text-sm text-white/80 leading-relaxed">
					{comment.body}
				</div>
			</div>
			{hasReplies && isExpanded && (
				<CommentTree comments={comment.replies ?? []} depth={depth + 1} />
			)}
		</div>
	);
}

function CommentTree({
	comments,
	depth = 0
}: {
	comments: RedditComment[];
	depth?: number;
}) {
	if (!comments || comments.length === 0) return null;

	return (
		<div
			className={`space-y-3 ${
				depth > 0 ? "ml-4 border-white/10 border-l pl-4" : ""
			}`}
		>
			{comments.map((comment) => (
				<CommentItem comment={comment} depth={depth} key={comment.id} />
			))}
		</div>
	);
}

export function StegoResultRenderer({
	data,
	filename
}: StegoResultRendererProps) {
	const apiFile = metricsApiFilename(filename);
	const [metricsLoading, setMetricsLoading] = useState(false);
	const [metricsError, setMetricsError] = useState<string | null>(null);
	const [metricsResult, setMetricsResult] = useState<Record<
		string,
		unknown
	> | null>(null);

	const runMetricsPost = async () => {
		if (!apiFile) return;
		setMetricsLoading(true);
		setMetricsError(null);
		const base = normalizeAdminApiBase(readStoredBase());
		const res = await postMetricsPost(base, {
			filename: apiFile,
			output_dir: "output-results",
			dataset_dir: "datasets/news_cleaned",
			device: "cpu"
		});
		setMetricsLoading(false);
		if (!res.ok) {
			setMetricsResult(null);
			setMetricsError(
				res.httpStatus !== undefined
					? `${res.error} (${res.httpStatus})`
					: res.error
			);
			return;
		}
		setMetricsResult(res.data);
	};

	return (
		<div className="space-y-6">
			<div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<h4 className="font-semibold text-sm text-white">
							Per-file metrics
						</h4>
						<p className="text-white/45 text-xs">
							Calls{" "}
							<code className="rounded bg-black/30 px-1 py-0.5 text-[10px] text-white/70">
								POST /tools/metrics/post
							</code>{" "}
							on the side-wing host (base URL from{" "}
							<Link
								className="text-cyan-400/90 underline-offset-2 hover:underline"
								href="/admin-api"
							>
								/admin-api
							</Link>
							). Uses this file as{" "}
							<code className="text-white/60">{apiFile ?? "—"}</code>
							{apiFile ? "" : " (select a .json file from the list)"}.
						</p>
					</div>
					<button
						className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600/90 px-4 py-2 font-medium text-sm text-white hover:bg-violet-500 disabled:opacity-50"
						disabled={!apiFile || metricsLoading}
						onClick={() => void runMetricsPost()}
						type="button"
					>
						{metricsLoading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Calculating…
							</>
						) : (
							"Calculate metrics (API)"
						)}
					</button>
				</div>
				{metricsError && (
					<p className="text-red-400/90 text-sm">{metricsError}</p>
				)}
				{metricsResult && (
					<Accordion className="w-full" collapsible type="single">
						<AccordionItem
							className="border-white/10"
							value="api-metrics"
						>
							<AccordionTrigger className="py-3 hover:no-underline">
								<span className="font-medium text-sm">
									API metrics response
								</span>
							</AccordionTrigger>
							<AccordionContent>
								<div className="px-1 pb-2">
									<JsonTreeRenderer data={metricsResult} hideMessage />
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				)}
			</div>

			<div className="space-y-8">
				{data.map((item, index) => {
					const searchResults = Array.isArray(item.post?.search_results)
						? item.post.search_results
						: Object.values(item.post?.search_results ?? {})
								.flat()
								.map(
									(x: any) =>
										x?.content_analysis ??
										(x?.content_fetched
											? x?.fetched_content
											: null) ??
										x?.snippet
								)
								.filter((x): x is string => typeof x === "string");

					// Helper to flatten comments for reference lookup
					const flattenComments = (
						comments: RedditComment[]
					): string[] => {
						const flat: string[] = [];
						for (const c of comments) {
							if (c.body) flat.push(c.body);
							if (c.replies) flat.push(...flattenComments(c.replies));
						}
						return flat;
					};

					const comments = flattenComments(item.post?.comments ?? []);
					const allDocs = [
						item.post?.selftext ?? "",
						...searchResults,
						...comments
					];

					// Helper to check if a picked comment has body/permalink (V2/V3)
					const isCommentItem = (
						c: any
					): c is { body: string; permalink: string; id: string } =>
						c && typeof c === "object" && "body" in c;

					return (
						<div
							className="space-y-4"
							key={`${item.post?.id ?? index}-${index}`}
						>
							<div className="flex items-center justify-between text-sm">
								<div className="flex gap-4">
									<div className="flex items-center gap-1.5">
										<span className="text-white/40">Embedded:</span>
										<span
											className="rounded bg-blue-600/30 px-2 py-0.5 font-mono text-blue-400 text-xs"
											title="Comments"
										>
											{item.embedding?.commentEmbedding?.bitsUsed?.replace(
												/(\d{3})(?=\d)/g,
												"$1 "
											)}
										</span>
										<span
											className="rounded bg-green-600/30 px-2 py-0.5 font-mono text-green-400 text-xs"
											title="Angles"
										>
											{item.embedding?.angleEmbedding?.bitsUsed?.replace(
												/(\d{3})(?=\d)/g,
												"$1 "
											)}
										</span>
										<span className="text-white/60">
											({item.embedding?.totalBitsEmbedded} bits)
										</span>
									</div>
									{(item.embedding?.warnings?.length ?? 0) > 0 && (
										<div className="text-xs text-yellow-500/80">
											⚠️ {item.embedding?.warnings?.length} warnings
										</div>
									)}
								</div>
								<div className="font-mono text-white/20">
									#{index + 1}
								</div>
							</div>

							<div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
								<div className="border-white/10 border-b bg-white/5 p-4">
									<div className="flex items-start justify-between gap-4">
										<div className="space-y-1">
											<h5 className="font-semibold text-white leading-tight">
												{item.post?.title}
											</h5>
											<div className="flex items-center gap-2 text-white/40 text-xs">
												<span>u/{item.post?.author}</span>
												<span>•</span>
												<span>r/{item.post?.subreddit}</span>
												<span>•</span>
												<span>{item.post?.score} points</span>
											</div>
										</div>
										<a
											className="rounded-lg p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
											href={`https://www.reddit.com${item.post?.permalink}`}
											rel="noopener noreferrer"
											target="_blank"
											title="View on Reddit"
										>
											<ExternalLink size={18} />
										</a>
									</div>
								</div>

								<div className="space-y-6 p-4">
									<PostValidationActions postId={item.post?.id} />
									<div className="space-y-2">
										<label className="font-bold text-[10px] text-white/30 uppercase tracking-wider">
											Stego Text ({item.stegoText?.length} chars)
										</label>
										<div className="rounded-lg bg-black/30 p-4 text-lg text-white/90 leading-relaxed selection:bg-white/20">
											{item.stegoText}
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<div className="space-y-2">
											<label className="font-bold text-[10px] text-white/30 uppercase tracking-wider">
												Original Payload
											</label>
											<div className="rounded-lg bg-black/20 p-3 text-sm text-white/60 italic">
												{item.embedding?.compression?.payload}
											</div>
										</div>
										<div className="space-y-2">
											<label className="flex justify-between font-bold text-[10px] text-white/30 uppercase tracking-wider">
												<span>
													{item.embedding?.compression
														?.usedDict !== undefined
														? item.embedding.compression.usedDict
															? "Dictionary"
															: "Direct"
														: (item.embedding?.compression
																?.method ?? "Compression")}{" "}
													Bits (
													{
														item.embedding?.compression
															?.compressed?.length
													}
													)
												</span>
												{(item.embedding?.compression?.ratio ?? 0) >
													0 && (
													<span className="text-green-400/80">
														Ratio:{" "}
														{(
															(item.embedding?.compression
																?.ratio ?? 0) * 100
														).toFixed(1)}
														%
													</span>
												)}
											</label>
											<div className="break-all rounded-lg bg-black/20 p-3 font-mono text-sm text-white/60">
												{item.embedding?.compression?.compressed}
											</div>
										</div>
									</div>

									<Accordion className="w-full" type="multiple">
										{(item.embedding?.compression?.references
											?.length ?? 0) > 0 && (
											<AccordionItem
												className="border-white/10"
												value="references"
											>
												<AccordionTrigger className="py-3 hover:no-underline">
													<span className="font-medium text-sm">
														Compression References (
														{
															item.embedding?.compression
																?.references?.length
														}
														)
													</span>
												</AccordionTrigger>
												<AccordionContent>
													<div className="grid grid-cols-1 gap-2 px-1 sm:grid-cols-2 md:grid-cols-3">
														{item.embedding?.compression?.references?.map(
															(ref: any, i: number) => (
																<div
																	className="space-y-2 rounded border border-white/5 bg-white/5 p-2 font-mono text-[11px]"
																	key={i}
																>
																	<div className="flex justify-between text-white/40">
																		<span>REF #{i}</span>
																		<span>
																			LEN: {ref.len}
																		</span>
																	</div>
																	<div className="flex justify-between">
																		<span className="text-white/60">
																			DOC: {ref.doc ?? "N/A"}
																		</span>
																		<span className="text-blue-400">
																			IDX: {ref.idx}
																		</span>
																	</div>
																	<div className="line-clamp-3 break-all rounded border border-white/5 bg-black/40 p-1.5 text-[10px] text-white/90 leading-tight">
																		{ref.doc !== null &&
																		ref.doc !== undefined &&
																		allDocs[ref.doc]
																			? (
																					allDocs[
																						ref.doc
																					] as string
																				).slice(
																					ref.idx,
																					ref.idx + ref.len
																				)
																			: "N/A"}
																	</div>
																</div>
															)
														)}
													</div>
												</AccordionContent>
											</AccordionItem>
										)}

										<AccordionItem
											className="border-white/10"
											value="picked-chain"
										>
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="flex items-center gap-2 font-medium text-sm">
													<MessageSquare size={16} />
													Picked Comment Chain (
													{item.embedding?.commentEmbedding
														?.pickedCommentChain?.length ?? 0}
													)
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<div className="space-y-4 px-1">
													{/* Post Info */}
													<div className="space-y-2 rounded-lg border border-white/5 bg-black/20 p-3">
														<label className="font-bold text-[10px] text-white/30 uppercase tracking-wider">
															Post Info
														</label>
														<div className="space-y-1.5 text-sm">
															<div>
																<span className="text-white/40">
																	Title:{" "}
																</span>
																<span className="text-white/80">
																	{item.post?.title ??
																		item.embedding
																			?.commentEmbedding
																			?.context?.title ??
																		"—"}
																</span>
															</div>
															<div>
																<span className="text-white/40">
																	User:{" "}
																</span>
																<span className="text-white/80">
																	{item.post?.author ??
																		item.embedding
																			?.commentEmbedding
																			?.context?.author ??
																		"—"}
																</span>
															</div>
															<div>
																<span className="text-white/40">
																	URL:{" "}
																</span>
																{(item.post?.url ??
																item.embedding?.commentEmbedding
																	?.context?.url) ? (
																	<a
																		className="break-all text-blue-400 hover:underline"
																		href={
																			item.post?.url ??
																			item.embedding
																				?.commentEmbedding
																				?.context?.url
																		}
																		rel="noopener noreferrer"
																		target="_blank"
																	>
																		{item.post?.url ??
																			item.embedding
																				?.commentEmbedding
																				?.context?.url}
																	</a>
																) : (
																	<span className="text-white/80">
																		—
																	</span>
																)}
															</div>
															<div>
																<span className="text-white/40">
																	URL Content:{" "}
																</span>
																<div className="mt-1 line-clamp-6 rounded bg-black/30 p-2 text-white/70 text-xs leading-relaxed">
																	{item.post?.selftext ??
																		item.embedding
																			?.commentEmbedding
																			?.context?.selftext ??
																		"—"}
																</div>
															</div>
														</div>
													</div>

													{/* Comment Chain */}
													{item.embedding?.commentEmbedding?.pickedCommentChain?.map(
														(comment: any, i: number) => (
															<div
																className="relative border-white/10 border-l-2 py-1 pl-4"
																key={
																	isCommentItem(comment)
																		? comment.id
																		: i
																}
															>
																<div className="mb-1 flex items-center gap-2">
																	<span className="font-bold text-[10px] text-white/30 uppercase">
																		Comment #{i + 1}
																	</span>
																	{isCommentItem(comment) && (
																		<a
																			className="text-white/20 transition-colors hover:text-white/60"
																			href={`https://www.reddit.com${comment.permalink}`}
																			rel="noopener noreferrer"
																			target="_blank"
																			title="View comment on Reddit"
																		>
																			<ExternalLink
																				size={12}
																			/>
																		</a>
																	)}
																</div>
																<div className="text-sm text-white/80 leading-relaxed">
																	{isCommentItem(comment)
																		? comment.body
																		: JSON.stringify(comment)}
																</div>
															</div>
														)
													)}

													{/* Proposed Stegotext */}
													<div className="space-y-2 pt-2">
														<label className="font-bold text-[10px] text-white/30 uppercase tracking-wider">
															Proposed Stegotext
														</label>
														<div className="rounded-lg bg-black/30 p-4 text-sm text-white/90 leading-relaxed">
															{item.stegoText}
														</div>
													</div>
												</div>
											</AccordionContent>
										</AccordionItem>

										{item.post?.comments &&
											item.post.comments.length > 0 && (
												<AccordionItem
													className="border-white/10"
													value="all-comments"
												>
													<AccordionTrigger className="py-3 hover:no-underline">
														<span className="flex items-center gap-2 font-medium text-sm">
															<MessageCircle size={16} />
															Full Comment Tree (
															{item.post.num_comments})
														</span>
													</AccordionTrigger>
													<AccordionContent>
														<div className="px-1 py-2">
															<CommentTree
																comments={item.post.comments}
															/>
														</div>
													</AccordionContent>
												</AccordionItem>
											)}

										{item.embedding?.angleEmbedding
											?.selectedAngle && (
											<AccordionItem
												className="border-white/10"
												value="selected-angle"
											>
												<AccordionTrigger className="py-3 hover:no-underline">
													<span className="font-medium text-sm">
														Selected Angle
													</span>
												</AccordionTrigger>
												<AccordionContent>
													<AngleTable
														data={[
															item.embedding!.angleEmbedding!
																.selectedAngle!
														]}
													/>
												</AccordionContent>
											</AccordionItem>
										)}

										<AccordionItem
											className="border-white/10"
											value="angles"
										>
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="font-medium text-sm">
													Angle Selection (
													{item.embedding?.angleEmbedding
														?.totalAnglesSelectedFirst?.length ??
														0}
													)
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<AngleTable
													data={
														item.embedding?.angleEmbedding
															?.totalAnglesSelectedFirst ?? []
													}
												/>
											</AccordionContent>
										</AccordionItem>

										<AccordionItem
											className="border-none"
											value="search"
										>
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="font-medium text-sm">
													Search Context (
													{searchResults?.length ?? 0})
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<PaginatedTable
													items={searchResults ?? []}
												/>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
