"use client";

import { ExternalLink, MessageCircle, MessageSquare } from "lucide-react";
import { useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "~/components/ui/accordion";
import type { RedditComment, StegoResult } from "~/schemas/stego-result";
import { AngleTable } from "../angle-table";
import { PaginatedTable } from "../paginated-table";

interface StegoResultRendererProps {
	data: StegoResult;
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
				className={`group rounded-lg p-2 -ml-2 transition-colors ${
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
							<span className="text-blue-400/60 font-medium">
								{isExpanded
									? "Hide replies"
									: `Show ${comment.replies?.length} replies`}
							</span>
						</>
					)}
					<span>•</span>
					<a
						href={`https://www.reddit.com${comment.permalink}`}
						target="_blank"
						rel="noopener noreferrer"
						title="View comment on Reddit"
						className="hover:text-white transition-colors"
						onClick={(e) => e.stopPropagation()}
					>
						<ExternalLink size={10} />
					</a>
				</div>
				<div className="text-sm text-white/80 leading-relaxed mt-1">
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
				depth > 0 ? "ml-4 border-l border-white/10 pl-4" : ""
			}`}
		>
			{comments.map((comment) => (
				<CommentItem key={comment.id} comment={comment} depth={depth} />
			))}
		</div>
	);
}

export function StegoResultRenderer({ data }: StegoResultRendererProps) {
	return (
		<div className="space-y-6">
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
							key={`${item.post?.id ?? index}-${index}`}
							className="space-y-4"
						>
							<div className="flex items-center justify-between text-sm">
								<div className="flex gap-4">
									<div className="flex items-center gap-1.5">
										<span className="text-white/40">Embedded:</span>
										<span
											title="Comments"
											className="bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded text-xs font-mono"
										>
											{item.embedding?.commentEmbedding?.bitsUsed}
										</span>
										<span
											title="Angles"
											className="bg-green-600/30 text-green-400 px-2 py-0.5 rounded text-xs font-mono"
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
										<div className="text-yellow-500/80 text-xs">
											⚠️ {item.embedding?.warnings?.length} warnings
										</div>
									)}
								</div>
								<div className="text-white/20 font-mono">
									#{index + 1}
								</div>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
								<div className="p-4 border-b border-white/10 bg-white/5">
									<div className="flex items-start justify-between gap-4">
										<div className="space-y-1">
											<h5 className="font-semibold text-white leading-tight">
												{item.post?.title}
											</h5>
											<div className="flex items-center gap-2 text-xs text-white/40">
												<span>u/{item.post?.author}</span>
												<span>•</span>
												<span>r/{item.post?.subreddit}</span>
												<span>•</span>
												<span>{item.post?.score} points</span>
											</div>
										</div>
										<a
											href={`https://www.reddit.com${item.post?.permalink}`}
											target="_blank"
											rel="noopener noreferrer"
											title="View on Reddit"
											className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
										>
											<ExternalLink size={18} />
										</a>
									</div>
								</div>

								<div className="p-4 space-y-6">
									<div className="space-y-2">
										<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
											Stego Text ({item.stegoText?.length} chars)
										</label>
										<div className="rounded-lg bg-black/30 p-4 text-lg leading-relaxed text-white/90 selection:bg-white/20">
											{item.stegoText}
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
												Original Payload
											</label>
											<div className="rounded-lg bg-black/20 p-3 text-sm italic text-white/60">
												{item.embedding?.compression?.payload}
											</div>
										</div>
										<div className="space-y-2">
											<label className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex justify-between">
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
											<div className="rounded-lg bg-black/20 p-3 text-sm font-mono break-all text-white/60">
												{item.embedding?.compression?.compressed}
											</div>
										</div>
									</div>

									<Accordion type="multiple" className="w-full">
										{(item.embedding?.compression?.references
											?.length ?? 0) > 0 && (
											<AccordionItem
												value="references"
												className="border-white/10"
											>
												<AccordionTrigger className="hover:no-underline py-3">
													<span className="text-sm font-medium">
														Compression References (
														{
															item.embedding?.compression
																?.references?.length
														}
														)
													</span>
												</AccordionTrigger>
												<AccordionContent>
													<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 px-1">
														{item.embedding?.compression?.references?.map(
															(ref: any, i: number) => (
																<div
																	key={i}
																	className="text-[11px] font-mono bg-white/5 p-2 rounded border border-white/5 space-y-2"
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
																	<div className="bg-black/40 p-1.5 rounded text-white/90 break-all border border-white/5 text-[10px] leading-tight line-clamp-3">
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
											value="picked-chain"
											className="border-white/10"
										>
											<AccordionTrigger className="hover:no-underline py-3">
												<span className="text-sm font-medium flex items-center gap-2">
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
													<div className="rounded-lg bg-black/20 p-3 space-y-2 border border-white/5">
														<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
															Post Info
														</label>
														<div className="space-y-1.5 text-sm">
															<div>
																<span className="text-white/40">Title: </span>
																<span className="text-white/80">
																	{item.post?.title ??
																		item.embedding?.commentEmbedding?.context?.title ??
																		"—"}
																</span>
															</div>
															<div>
																<span className="text-white/40">User: </span>
																<span className="text-white/80">
																	{item.post?.author ??
																		item.embedding?.commentEmbedding?.context?.author ??
																		"—"}
																</span>
															</div>
															<div>
																<span className="text-white/40">URL: </span>
																{(item.post?.url ??
																	item.embedding?.commentEmbedding?.context?.url) ? (
																	<a
																		href={
																			item.post?.url ??
																			item.embedding?.commentEmbedding?.context?.url
																		}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-blue-400 hover:underline break-all"
																	>
																		{item.post?.url ??
																			item.embedding?.commentEmbedding?.context?.url}
																	</a>
																) : (
																	<span className="text-white/80">—</span>
																)}
															</div>
															<div>
																<span className="text-white/40">URL Content: </span>
																<div className="mt-1 rounded bg-black/30 p-2 text-white/70 text-xs leading-relaxed line-clamp-6">
																	{item.post?.selftext ??
																		item.embedding?.commentEmbedding?.context
																			?.selftext ??
																		"—"}
																</div>
															</div>
														</div>
													</div>

													{/* Comment Chain */}
													{item.embedding?.commentEmbedding?.pickedCommentChain?.map(
														(comment: any, i: number) => (
															<div
																key={
																	isCommentItem(comment)
																		? comment.id
																		: i
																}
																className="relative pl-4 border-l-2 border-white/10 py-1"
															>
																<div className="flex items-center gap-2 mb-1">
																	<span className="text-[10px] font-bold text-white/30 uppercase">
																		Comment #{i + 1}
																	</span>
																	{isCommentItem(comment) && (
																		<a
																			href={`https://www.reddit.com${comment.permalink}`}
																			target="_blank"
																			rel="noopener noreferrer"
																			title="View comment on Reddit"
																			className="text-white/20 hover:text-white/60 transition-colors"
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
														<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
															Proposed Stegotext
														</label>
														<div className="rounded-lg bg-black/30 p-4 text-sm leading-relaxed text-white/90">
															{item.stegoText}
														</div>
													</div>
												</div>
											</AccordionContent>
										</AccordionItem>

										{item.post?.comments &&
											item.post.comments.length > 0 && (
												<AccordionItem
													value="all-comments"
													className="border-white/10"
												>
													<AccordionTrigger className="hover:no-underline py-3">
														<span className="text-sm font-medium flex items-center gap-2">
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
												value="selected-angle"
												className="border-white/10"
											>
												<AccordionTrigger className="hover:no-underline py-3">
													<span className="text-sm font-medium">
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
											value="angles"
											className="border-white/10"
										>
											<AccordionTrigger className="hover:no-underline py-3">
												<span className="text-sm font-medium">
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
											value="search"
											className="border-none"
										>
											<AccordionTrigger className="hover:no-underline py-3">
												<span className="text-sm font-medium">
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
