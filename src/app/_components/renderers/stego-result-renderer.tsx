"use client";

import type { StegoResultData } from "~/schemas/stego-result";

interface StegoResultRendererProps {
	data: StegoResultData;
}

export function StegoResultRenderer({ data: stegoData }: StegoResultRendererProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-white/10 p-6">
				<div className="mb-4 flex items-center justify-between">
					<h4 className="text-lg font-semibold text-white">
						Steganography Detection Result
					</h4>
					<span
						className={`rounded-full px-3 py-1 text-xs font-medium ${
							stegoData.results.detected
								? "bg-red-500/20 text-red-300"
								: "bg-green-500/20 text-green-300"
						}`}
					>
						{stegoData.results.detected
							? "Detected"
							: "Not Detected"}
					</span>
				</div>

				<div className="space-y-3">
					<div>
						<span className="text-sm text-white/50">Algorithm:</span>
						<span className="ml-2 text-sm font-medium text-white">
							{stegoData.algorithm}
						</span>
					</div>

					{stegoData.results.confidence !== undefined && (
						<div>
							<span className="text-sm text-white/50">
								Confidence:
							</span>
							<div className="mt-1">
								<div className="flex items-center gap-2">
									<div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
										<div
											className="h-full bg-white/80 transition-all"
											style={{
												width: `${
													stegoData.results.confidence *
													100
												}%`,
											}}
										/>
									</div>
									<span className="text-sm font-medium text-white">
										{(
											stegoData.results.confidence * 100
										).toFixed(1)}%
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{stegoData.metadata && Object.keys(stegoData.metadata).length > 0 && (
				<div className="rounded-lg border border-white/10 p-4">
					<h5 className="mb-2 text-sm font-medium text-white/90">
						Metadata
					</h5>
					<div className="space-y-1">
						{Object.entries(stegoData.metadata).map(([key, value]) => (
							<div key={key} className="flex gap-2 text-sm">
								<span className="text-white/50">{key}:</span>
								<span className="text-white/70">
									{typeof value === "object"
										? JSON.stringify(value)
										: String(value)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
