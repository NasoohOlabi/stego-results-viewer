"use client";

import { ExternalLink } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import type { RedditComment } from "~/schemas/stego-result";
import type { StegoTextOnly } from "~/schemas/stego-text-only";
import { AngleTable } from "../angle-table";
import { PaginatedTable } from "../paginated-table";
import { PostValidationActions } from "../post-validation-actions";

interface StegoTextOnlyRendererProps {
	data: StegoTextOnly;
	filename?: string | null;
}

export function StegoTextOnlyRenderer({
	data,
	filename: _filename,
}: StegoTextOnlyRendererProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-white/10 border-b pb-4">
				<div>
					<h4 className="font-bold text-white text-xl">
						Steganographic Results (Text Only)
					</h4>
					<p className="text-sm text-white/50">
						Analyzed {data.length} post{data.length !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			<div className="space-y-8">
				{data.map((item, index) => {
					const searchResults = item.post.search_results;

					// Helper to flatten comments for reference lookup
					const flattenComments = (comments: RedditComment[]): string[] => {
						const flat: string[] = [];
						if (!comments) return flat;
						for (const c of comments) {
							if (c.body) flat.push(c.body);
							if (c.replies) flat.push(...flattenComments(c.replies));
						}
						return flat;
					};

					const comments = flattenComments((item.post as any).comments ?? []);
					const allDocs = [
						(item.post as any).selftext ?? "",
						...(searchResults ?? []),
						...comments,
					];

					return (
						<div className="space-y-4" key={item.post.id}>
							<div className="flex items-center justify-between text-sm">
								<div className="flex gap-4">
									<div className="flex items-center gap-1.5">
										<span className="text-white/40">Embedded:</span>
										<span
											className="rounded bg-blue-600/30 px-2 py-0.5 font-mono text-blue-400 text-xs"
											title="Comments"
										>
											{item.embedding?.commentEmbedding?.bitsUsed}
										</span>
										<span
											className="rounded bg-green-600/30 px-2 py-0.5 font-mono text-green-400 text-xs"
											title="Angles"
										>
											{item.embedding?.angleEmbedding?.bitsUsed?.replace(
												/(\d{3})(?=\d)/g,
												"$1 ",
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
								<div className="font-mono text-white/20">#{index + 1}</div>
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
													{item.embedding?.compression?.method} Bits (
													{item.embedding?.compression?.compressed?.length})
												</span>
												{(item.embedding?.compression?.ratio ?? 0) > 0 && (
													<span className="text-green-400/80">
														Ratio:{" "}
														{(
															(item.embedding?.compression?.ratio ?? 0) * 100
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
										{(item.embedding?.compression?.references?.length ?? 0) >
											0 && (
											<AccordionItem
												className="border-white/10"
												value="references"
											>
												<AccordionTrigger className="py-3 hover:no-underline">
													<span className="font-medium text-sm">
														Compression References (
														{item.embedding?.compression?.references?.length})
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
																		<span>LEN: {ref.len}</span>
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
																			? allDocs[ref.doc].slice(
																					ref.idx,
																					ref.idx + ref.len,
																				)
																			: "N/A"}
																	</div>
																</div>
															),
														)}
													</div>
												</AccordionContent>
											</AccordionItem>
										)}
										<AccordionItem className="border-white/10" value="angles">
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="font-medium text-sm">
													Angle Selection (
													{item.embedding?.angleEmbedding
														?.totalAnglesSelectedFirst?.length ?? 0}
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

										<AccordionItem className="border-none" value="search">
											<AccordionTrigger className="py-3 hover:no-underline">
												<span className="font-medium text-sm">
													Search Context ({searchResults?.length ?? 0})
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<PaginatedTable items={searchResults ?? []} />
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
