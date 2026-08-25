import type { FreshDataset, FreshWorker } from "../_lib/fresh-dataset";

const STAGE_LABELS: Record<FreshWorker["stage"], string> = {
	data_load: "Fetch",
	research: "Research",
	angles: "Angles",
};

function formatDate(value: string | null): string {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function statusTone(worker: FreshWorker): string {
	if (worker.alive)
		return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
	if (worker.status === "completed")
		return "border-sky-400/30 bg-sky-400/10 text-sky-200";
	return "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export function FreshDatasetSection({ data }: { data: FreshDataset }) {
	const validation = data.validation;
	const evaluationComplete =
		data.evaluation !== null &&
		data.evaluation.succeeded + data.evaluation.failed >=
			data.evaluation.plannedEmbeddings;
	const researchPassRate =
		data.counts.researched > 0
			? (validation.nonEmptyResearch / data.counts.researched) * 100
			: 0;
	const anglePassRate =
		data.counts.angles > 0
			? (validation.fullAngleArtifacts / data.counts.angles) * 100
			: 0;

	return (
		<section className="space-y-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-5">
			<header className="space-y-2">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="font-medium text-emerald-300 text-xs uppercase tracking-[0.18em]">
							Live fresh dataset
						</p>
						<h2 className="mt-1 font-semibold text-2xl">
							Clean LUCID preparation
						</h2>
					</div>
					<span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-200 text-xs">
						Auto-refreshes on page reload
					</span>
				</div>
				<p className="text-sm text-white/60">
					Live counts, integrity tests, workers, and recent TangentsDB-v1
					samples from the quota-resilient clean-data campaign.
				</p>
			</header>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<LiveMetric label="Fetched posts" value={data.counts.fetched} />
				<LiveMetric label="Researched posts" value={data.counts.researched} />
				<LiveMetric label="Angle samples" value={data.counts.angles} />
				<LiveMetric label="Stego outputs" value={data.counts.outputs} />
			</div>

			{data.evaluation && (
				<section className="rounded-xl border border-violet-400/25 bg-violet-400/8 p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="font-medium text-violet-300 text-xs uppercase tracking-[0.18em]">
								Six-repeat evaluation campaign
							</p>
							<h3 className="mt-1 font-semibold text-lg">
								{data.evaluation.active
									? "Pilot running"
									: evaluationComplete
										? "Generation complete"
										: "Pilot paused"}
							</h3>
						</div>
						<span className="rounded-full border border-violet-400/30 px-3 py-1 text-violet-200 text-xs">
							{data.evaluation.succeeded + data.evaluation.failed} /{" "}
							{data.evaluation.plannedEmbeddings}
						</span>
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<LiveMetric
							label="Eligible posts"
							value={data.evaluation.eligiblePosts}
						/>
						<LiveMetric
							label="Attempts per post"
							value={data.evaluation.repeatsPerPost}
						/>
						<LiveMetric label="Succeeded" value={data.evaluation.succeeded} />
						<LiveMetric label="Failed" value={data.evaluation.failed} />
					</div>
					<p className="mt-3 text-white/50 text-xs">
						The first {data.evaluation.pilotPosts} posts form the quality gate;
						each completed batch includes receiver validation, per-sample
						embedding metrics, KL/JSD, and perplexity. Paired ZLG, reference
						metrics, robustness benchmarks, and five LLM judges follow in
						GPU-sequential phases.
					</p>
				</section>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-xl border border-white/10 bg-black/15 p-4">
					<h3 className="font-semibold">Dataset validation tests</h3>
					<div className="mt-3 space-y-3">
						<ValidationRow
							detail={`${validation.nonEmptyResearch}/${data.counts.researched} · ${researchPassRate.toFixed(1)}%`}
							label="Research has usable sources"
							passed={validation.emptyResearch === 0}
						/>
						<ValidationRow
							detail={`${validation.fullAngleArtifacts}/${data.counts.angles} · ${anglePassRate.toFixed(1)}%`}
							label="Full 32-angle artifacts"
							passed={validation.shortAngleArtifacts === 0}
						/>
						<ValidationRow
							detail={`${validation.invalidAngleJson} invalid files`}
							label="Angle JSON parses"
							passed={validation.invalidAngleJson === 0}
						/>
					</div>
					<p className="mt-4 text-white/45 text-xs">
						Angle-count distribution:{" "}
						{formatDistribution(validation.angleDistribution)}. Empty and short
						artifacts remain visible as warnings instead of being hidden from
						the denominator.
					</p>
				</section>

				<section className="rounded-xl border border-white/10 bg-black/15 p-4">
					<h3 className="font-semibold">Campaign workers</h3>
					<div className="mt-3 space-y-3">
						{data.workers.map((worker) => (
							<div
								className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 bg-white/4 p-3"
								key={worker.stage}
							>
								<div>
									<div className="font-medium text-sm">
										{STAGE_LABELS[worker.stage]}
									</div>
									<div className="mt-1 text-white/45 text-xs">
										{worker.attempts.toLocaleString()} attempts · deadline{" "}
										{formatDate(worker.deadline)}
									</div>
								</div>
								<span
									className={`rounded-full border px-2.5 py-1 text-xs ${statusTone(worker)}`}
								>
									{worker.alive ? "running" : worker.status}
								</span>
							</div>
						))}
					</div>
				</section>
			</div>

			<section className="space-y-3">
				<div>
					<h3 className="font-semibold text-lg">Recent generated samples</h3>
					<p className="mt-1 text-sm text-white/50">
						Newest angle-ready posts first. Expand a row to inspect source and
						tangent previews.
					</p>
				</div>
				{data.samples.length === 0 ? (
					<p className="rounded-xl border border-white/10 p-4 text-sm text-white/45">
						No angle-ready samples yet.
					</p>
				) : (
					<div className="space-y-2">
						{data.samples.map((sample) => (
							<details
								className="group rounded-xl border border-white/10 bg-black/15 open:border-emerald-400/25"
								key={sample.fileName}
							>
								<summary className="cursor-pointer list-none p-4 marker:hidden">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="font-medium text-white/90">
												{sample.title}
											</div>
											<div className="mt-1 text-white/40 text-xs">
												{sample.postId} · {formatDate(sample.updatedAt)}
											</div>
										</div>
										<div className="flex gap-2 text-xs">
											<span
												className={`rounded-full px-2.5 py-1 ${
													sample.sourceCount > 0
														? "bg-sky-400/10 text-sky-200"
														: "bg-amber-400/10 text-amber-200"
												}`}
											>
												{sample.sourceCount} sources
											</span>
											<span
												className={`rounded-full px-2.5 py-1 ${
													sample.targetReached && sample.angleCount === 32
														? "bg-emerald-400/10 text-emerald-200"
														: "bg-amber-400/10 text-amber-200"
												}`}
											>
												{sample.angleCount} angles
											</span>
										</div>
									</div>
								</summary>
								<div className="space-y-4 border-white/10 border-t px-4 pt-4 pb-5">
									{sample.url && (
										<a
											className="break-all text-sky-300 text-sm hover:text-sky-200 hover:underline"
											href={sample.url}
											rel="noreferrer"
											target="_blank"
										>
											Open source article ↗
										</a>
									)}
									{sample.sourcePreview && (
										<div>
											<div className="font-medium text-white/55 text-xs uppercase tracking-wide">
												Research preview
											</div>
											<p className="mt-1 text-sm text-white/65">
												{sample.sourcePreview}
											</p>
										</div>
									)}
									<div className="grid gap-2 md:grid-cols-2">
										{sample.angles.map((angle, index) => (
											<div
												className="rounded-lg border border-white/8 bg-white/4 p-3"
												key={`${sample.postId}-${index}-${angle.tangent}`}
											>
												<div className="font-medium text-emerald-300 text-xs">
													{angle.category}
												</div>
												<p className="mt-1 text-sm text-white/80">
													{angle.tangent}
												</p>
												{angle.sourceQuote && (
													<p className="mt-2 text-white/40 text-xs">
														“{angle.sourceQuote}”
													</p>
												)}
											</div>
										))}
									</div>
								</div>
							</details>
						))}
					</div>
				)}
			</section>
		</section>
	);
}

function LiveMetric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl border border-white/10 bg-black/15 p-4">
			<div className="text-white/50 text-xs uppercase tracking-wide">
				{label}
			</div>
			<div className="mt-1 font-bold text-2xl">{value.toLocaleString()}</div>
		</div>
	);
}

function ValidationRow({
	label,
	detail,
	passed,
}: {
	label: string;
	detail: string;
	passed: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<div>
				<div className="text-white/80">{label}</div>
				<div className="text-white/40 text-xs">{detail}</div>
			</div>
			<span className={passed ? "text-emerald-300" : "text-amber-300"}>
				{passed ? "PASS" : "REVIEW"}
			</span>
		</div>
	);
}

function formatDistribution(distribution: Record<string, number>): string {
	return Object.entries(distribution)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([angles, files]) => `${angles} angles × ${files}`)
		.join(", ");
}
