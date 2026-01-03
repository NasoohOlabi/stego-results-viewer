"use client";

import { ExternalLink } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "~/components/ui/accordion";
import type { StegoResult } from "~/schemas/stego-result";
import { AngleTable } from "../angle-table";
import { PaginatedTable } from "../paginated-table";

interface StegoResultRendererProps {
	data: StegoResult;
}

export function StegoResultRenderer({ data }: StegoResultRendererProps) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-b border-white/10 pb-4">
				<div>
					<h4 className="text-xl font-bold text-white">
						Steganographic Results
					</h4>
					<p className="text-sm text-white/50">
						Analyzed {data.length} post{data.length !== 1 ? "s" : ""}
					</p>
				</div>
			</div>
			
			<div className="space-y-8">
				{data.map((item, index) => {
					const searchResults = Object.values(item.post.search_results)
						.flat()
						.map(
							(x) => x.content_analysis ?? (x.content_fetched ? x.fetched_content : null) ?? x.snippet
						)
						.filter((x): x is string => typeof x === "string");

					return (
						<div key={item.post.id} className="space-y-4">
							<div className="flex items-center justify-between text-sm">
								<div className="flex gap-4">
									<div className="flex items-center gap-1.5">
										<span className="text-white/40">Embedded:</span>
										<span title="Comments" className="bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded text-xs font-mono">
											{item.embedding.commentEmbedding.bitsUsed}
										</span>
										<span title="Angles" className="bg-green-600/30 text-green-400 px-2 py-0.5 rounded text-xs font-mono">
											{item.embedding.angleEmbedding.bitsUsed.replace(/(\d{3})(?=\d)/g, "$1 ")}
										</span>
										<span className="text-white/60">
											({item.embedding.totalBitsEmbedded} bits)
										</span>
									</div>
									{item.embedding.warnings.length > 0 && (
										<div className="text-yellow-500/80 text-xs">
											⚠️ {item.embedding.warnings.length} warnings
										</div>
									)}
								</div>
								<div className="text-white/20 font-mono">#{index + 1}</div>
							</div>

							<div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
								<div className="p-4 border-b border-white/10 bg-white/5">
									<div className="flex items-start justify-between gap-4">
										<div className="space-y-1">
											<h5 className="font-semibold text-white leading-tight">
												{item.post.title}
											</h5>
											<div className="flex items-center gap-2 text-xs text-white/40">
												<span>u/{item.post.author}</span>
												<span>•</span>
												<span>r/{item.post.subreddit}</span>
												<span>•</span>
												<span>{item.post.score} points</span>
											</div>
										</div>
										<a
											href={`https://www.reddit.com${item.post.permalink}`}
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
											Stego Text ({item.stegoText.length} chars)
										</label>
										<div className="rounded-lg bg-black/30 p-4 font-serif text-lg leading-relaxed text-white/90 selection:bg-white/20">
											{item.stegoText}
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
												Original Payload
											</label>
											<div className="rounded-lg bg-black/20 p-3 text-sm italic text-white/60">
												{item.embedding.compression.payload}
											</div>
										</div>
										<div className="space-y-2">
											<label className="text-[10px] font-bold uppercase tracking-wider text-white/30">
												{item.embedding.compression.method} Bits ({item.embedding.compression.compressed.length})
											</label>
											<div className="rounded-lg bg-black/20 p-3 text-sm font-mono break-all text-white/60">
												{item.embedding.compression.compressed}
											</div>
										</div>
									</div>

									<Accordion type="multiple" className="w-full">
										<AccordionItem value="angles" className="border-white/10">
											<AccordionTrigger className="hover:no-underline py-3">
												<span className="text-sm font-medium">
													Angle Selection ({item.embedding.angleEmbedding.totalAnglesSelectedFirst.length})
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<AngleTable data={item.embedding.angleEmbedding.totalAnglesSelectedFirst} />
											</AccordionContent>
										</AccordionItem>

										<AccordionItem value="search" className="border-none">
											<AccordionTrigger className="hover:no-underline py-3">
												<span className="text-sm font-medium">
													Search Context ({searchResults.length})
												</span>
											</AccordionTrigger>
											<AccordionContent>
												<PaginatedTable items={searchResults} />
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
