"use client";

import { ExternalLink } from "lucide-react";
import type { StegoComplexResult } from "~/schemas/stego-complex-result";

interface StegoTextOnlyRendererProps {
	data: StegoComplexResult;
}

export function StegoTextOnlyRenderer({ data }: StegoTextOnlyRendererProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between border-b border-white/10 pb-2">
				<h4 className="text-lg font-semibold text-white">
					Steganographic Texts
				</h4>
				<span className="text-xs text-white/50">
					{data.length} item{data.length !== 1 ? "s" : ""}
				</span>
			</div>
			<div className="grid gap-4">
				{data.map((item, index) => (
					<>
						<div className="flex items-center justify-between">
							<div>
								Embedded:{" "}
								<span
									title="comments"
									className="bg-blue-700 px-0.5  rounded-md"
								>
									{item.embedding.commentEmbedding.bitsUsed}
								</span>
								<span
									title="angles"
									className="bg-green-700 px-0.5 mx-1 rounded-md"
								>
									{/* add a space every three characters */}
									{item.embedding.angleEmbedding.bitsUsed.replace(
										/(\d{3})(?=\d)/g,
										"$1 "
									)}
								</span>
								({item.embedding.totalBitsEmbedded}) bits
							</div>
							<div>
								comments: {JSON.stringify(item.post.comments, null, 2)}
							</div>
							<div>
								picked comment chain:{" "}
								{JSON.stringify(
									item.embedding.commentEmbedding.pickedCommentChain,
									null,
									2
								)}
							</div>
						</div>
						<div className="border border-white/10 p-2 rounded-md">
							<div className="flex items-center justify-between">
								<h5>{item.post.title}</h5>
								<div>
									<span className="text-xs text-white/50">
										{item.post.score} points
									</span>
									<a
										href={`https://www.reddit.com${item.post.permalink}`}
										target="_blank"
										rel="noopener noreferrer"
										className="ml-2 inline-flex items-center text-white/50 hover:text-white"
										title="Go to post"
									>
										<ExternalLink size={14} />
									</a>
								</div>
							</div>
							<p className="text-sm text-white/50">
								by: {item.post.author} on r/{item.post.subreddit}
							</p>
							{item.post.selftext ? (
								<>
									<p>{item.post.selftext}</p>
								</>
							) : (
								<p className="text-sm text-white/50">
									Link:{" "}
									<a
										href={item.post.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										{item.post.url}
									</a>
								</p>
							)}
						</div>
						<div
							key={index}
							className="group relative rounded-lg border border-white/10 p-4 transition-colors hover:bg-white/5"
						>
							<div className="absolute top-2 right-2 text-[10px] font-mono text-white/20 group-hover:text-white/40">
								#{index + 1}
							</div>
							<div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-white/90">
								Stego text: ({item.stegoText.length} characters)
								<div>{item.stegoText}</div>
							</div>
						</div>
						<div className="">
							Payload:
							<div className="italic">
								{item.embedding.compression.payload}
							</div>
							{item.embedding.compression.usedDict
								? "Compressed"
								: "Encoded"}
							: ({item.embedding.compression.compressed.length} bits ~{" "}
							{Math.ceil(
								item.embedding.compression.compressed.length / 8
							)}{" "}
							bytes){" "}
							{item.embedding.compression.usedDict
								? `Ratio: ${item.embedding.compression.ratio * 100}%`
								: ""}
							<div className="italic">
								{item.embedding.compression.compressed}
							</div>
							{item.embedding.compression.usedDict ? (
								<div>
									<p>References:</p>
									<ul>
										{item.embedding.compression.references.map(
											(reference) => (
												<li key={reference.idx}>
													dock:{reference.doc} idx:{reference.idx}{" "}
													len:{reference.len}
												</li>
											)
										)}
									</ul>
								</div>
							) : null}
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<pre>
									{JSON.stringify(
										item.embedding.angleEmbedding.selectedAngle,
										null,
										2
									)}
								</pre>
							</div>
						</div>
					</>
				))}
			</div>
		</div>
	);
}
