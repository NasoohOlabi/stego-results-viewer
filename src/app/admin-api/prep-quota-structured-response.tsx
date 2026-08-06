"use client";

import { renderInspectorValue } from "./inspector-response";
import type { PrepQuotaStegoSummary, PrepQuotaStructuredModel } from "./utils";
import { formatElapsedMs, labelStoppedReason } from "./utils";

function stopReasonText(reason: string | undefined): string {
	if (!reason) return "—";
	return labelStoppedReason(reason);
}

function stegoRows(summary: PrepQuotaStegoSummary): Array<{
	postId: string;
	succeeded: boolean;
	retryCount: number | null;
}> {
	return summary.results.flatMap((item, index) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			return [
				{
					postId: `result-${index + 1}`,
					succeeded: false,
					retryCount: null,
				},
			];
		}
		const row = item as {
			succeeded?: unknown;
			retry_count?: unknown;
			post?: { id?: unknown };
		};
		return [
			{
				postId:
					typeof row.post?.id === "string" && row.post.id
						? row.post.id
						: `result-${index + 1}`,
				succeeded: row.succeeded === true,
				retryCount:
					typeof row.retry_count === "number" &&
					Number.isFinite(row.retry_count)
						? row.retry_count
						: null,
			},
		];
	});
}

export interface PrepQuotaStructuredResponseProps {
	model: PrepQuotaStructuredModel;
	loading: boolean;
}

export function PrepQuotaStructuredResponse(
	props: PrepQuotaStructuredResponseProps,
) {
	const { model, loading } = props;
	const requestStatusBadge =
		model.outcome === "error"
			? "bg-rose-500/25 text-rose-200"
			: model.outcome === "success"
				? "bg-emerald-500/25 text-emerald-200"
				: "bg-amber-500/25 text-amber-200";
	const requestStatusLabel =
		model.outcome === "error"
			? "Error"
			: model.outcome === "success"
				? "Workflow finished"
				: "Running";
	const prep = model.prep;
	const stego = model.stego;
	const rows = stego ? stegoRows(stego) : [];
	const prepCompleted = Boolean(prep && prep.prepared_posts > 0);
	const researchCompleted = Boolean(prep && prep.research_processed > 0);
	const finalOutputsCount = stego?.succeeded_count ?? 0;
	const finalOutputMissing =
		Boolean(stego) && stego.processed_count > 0 && finalOutputsCount === 0;
	const statusSummaryBadges: Array<{
		label: string;
		className: string;
	}> = [];

	if (prepCompleted) {
		statusSummaryBadges.push({
			label: "Prep complete",
			className: "bg-cyan-500/20 text-cyan-100",
		});
	}
	if (researchCompleted) {
		statusSummaryBadges.push({
			label: "Research complete",
			className: "bg-sky-500/20 text-sky-100",
		});
	}
	if (finalOutputMissing) {
		statusSummaryBadges.push({
			label: "No final sample",
			className: "bg-amber-500/25 text-amber-100",
		});
	} else if (finalOutputsCount > 0) {
		statusSummaryBadges.push({
			label: `Final outputs: ${finalOutputsCount}`,
			className: "bg-emerald-500/25 text-emerald-100",
		});
	}

	const operatorSummary = finalOutputMissing
		? "This run prepared post data, but did not produce a new final stego sample."
		: finalOutputsCount > 0
			? `This run produced ${finalOutputsCount} final stego sample${finalOutputsCount === 1 ? "" : "s"}.`
			: prepCompleted
				? "This run completed prep work. Final output status is still pending."
				: null;

	return (
		<div className="space-y-3">
			<div className="rounded-lg border border-white/10 bg-black/25 p-3">
				<div className="mb-2 flex flex-wrap items-center gap-2">
					<span
						className={`rounded px-2 py-0.5 font-medium text-xs ${requestStatusBadge}`}
					>
						{requestStatusLabel}
					</span>
					<span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-[11px] text-violet-200">
						{model.command}
					</span>
					{model.tag ? (
						<span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/75">
							tag: {model.tag}
						</span>
					) : null}
					{model.payloadProvided !== null ? (
						<span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
							{model.payloadProvided ? "custom payload" : "default payload"}
						</span>
					) : null}
					{model.batchCount !== undefined ? (
						<span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
							batch_count: {model.batchCount}
						</span>
					) : null}
					{model.batchSize !== undefined ? (
						<span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
							batch_size: {model.batchSize}
						</span>
					) : null}
				</div>
				<p className="text-sm text-white/80">
					Quota-aware prep pipeline that switches into recursive stego once
					Google search quota is detected or prep work is exhausted.
				</p>
				{loading ? (
					<p className="mt-2 text-white/55 text-xs">
						Streaming milestone events…
					</p>
				) : null}
				{model.errorMessage ? (
					<p className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 font-mono text-[11px] text-rose-100">
						{model.errorMessage}
					</p>
				) : null}
			</div>

			{statusSummaryBadges.length > 0 || operatorSummary ? (
				<section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
					<h3 className="font-semibold text-sm text-white/85">
						Status summary
					</h3>
					{statusSummaryBadges.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-2 text-xs">
							{statusSummaryBadges.map((badge) => (
								<span
									className={`rounded px-2 py-1 font-medium ${badge.className}`}
									key={badge.label}
								>
									{badge.label}
								</span>
							))}
						</div>
					) : null}
					{operatorSummary ? (
						<p className="mt-2 text-sm text-white/75">{operatorSummary}</p>
					) : null}
					{finalOutputMissing ? (
						<p className="mt-2 text-white/50 text-xs">
							Prep artifacts can exist without any new final file in
							<code className="mx-1 text-white/70">output-results/</code>.
						</p>
					) : null}
				</section>
			) : null}

			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<section className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
					<h3 className="font-semibold text-sm text-white/85">Prep phase</h3>
					{prep ? (
						<div className="mt-2 grid grid-cols-2 gap-2 text-xs">
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Iterations</p>
								<p className="font-semibold text-white/90">{prep.iterations}</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Stop reason</p>
								<p className="text-white/90">
									{stopReasonText(prep.stop_reason)}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Data-load processed</p>
								<p className="font-semibold text-white/90">
									{prep.data_load_processed}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Research processed</p>
								<p className="font-semibold text-white/90">
									{prep.research_processed}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Angles processed</p>
								<p className="font-semibold text-white/90">
									{prep.gen_angles_processed}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Angles failed</p>
								<p className="font-semibold text-white/90">
									{prep.gen_angles_failed}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Prepared posts</p>
								<p className="font-semibold text-white/90">
									{prep.prepared_posts}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Quota detected</p>
								<p
									className={
										prep.quota_detected
											? "font-semibold text-amber-200"
											: "font-semibold text-white/90"
									}
								>
									{prep.quota_detected ? "yes" : "no"}
								</p>
							</div>
						</div>
					) : (
						<p className="mt-2 text-white/45 text-xs">
							Prep summary will appear here as soon as the workflow reports it.
						</p>
					)}
				</section>

				<section className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
					<h3 className="font-semibold text-sm text-white/85">Stego phase</h3>
					{stego ? (
						<div className="mt-2 grid grid-cols-2 gap-2 text-xs">
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Processed</p>
								<p className="font-semibold text-white/90">
									{stego.processed_count}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Stop reason</p>
								<p className="text-white/90">
									{stopReasonText(stego.stopped_reason)}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Succeeded</p>
								<p className="font-semibold text-emerald-200">
									{stego.succeeded_count}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Failed</p>
								<p className="font-semibold text-rose-200">
									{stego.failed_count}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">run_all</p>
								<p className="font-semibold text-white/90">
									{stego.run_all ? "true" : "false"}
								</p>
							</div>
							<div className="rounded bg-black/25 p-2">
								<p className="text-white/45">Elapsed</p>
								<p className="font-semibold text-white/90">
									{stego.elapsed_ms !== undefined
										? formatElapsedMs(stego.elapsed_ms)
										: "—"}
								</p>
							</div>
						</div>
					) : (
						<p className="mt-2 text-white/45 text-xs">
							Stego summary will appear after the phase starts.
						</p>
					)}
				</section>
			</div>

			{model.phaseTransition ? (
				<div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
					<p className="font-semibold text-amber-100">Phase transition</p>
					<p className="mt-1 text-amber-50/90">
						{model.phaseTransition.from_phase} →{" "}
						{model.phaseTransition.to_phase} because{" "}
						{model.phaseTransition.reason.replace(/_/g, " ")}.
					</p>
				</div>
			) : null}

			{rows.length > 0 ? (
				<div className="overflow-x-auto rounded-lg border border-white/10">
					<table className="w-full min-w-[420px] text-left text-xs">
						<thead className="border-white/10 border-b bg-white/5 text-white/60">
							<tr>
								<th className="px-2 py-2 font-medium">Post</th>
								<th className="px-2 py-2 font-medium">Result</th>
								<th className="px-2 py-2 font-medium">Retries</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/10">
							{rows.map((row) => (
								<tr className="text-white/85" key={row.postId}>
									<td className="max-w-[260px] truncate px-2 py-2 font-mono text-[11px]">
										{row.postId}
									</td>
									<td className="px-2 py-2">
										<span
											className={
												row.succeeded ? "text-emerald-200" : "text-rose-200"
											}
										>
											{row.succeeded ? "ok" : "failed"}
										</span>
									</td>
									<td className="px-2 py-2 text-white/70 tabular-nums">
										{row.retryCount ?? "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : null}

			{model.timeline.length > 0 ? (
				<div className="rounded-lg border border-white/10 bg-black/20 p-3">
					<div className="mb-2 font-semibold text-white/70 text-xs">
						Timeline
					</div>
					<ol className="space-y-2 border-white/10 border-l pl-3 text-xs">
						{model.timeline.map((row, index) => (
							<li
								className="text-white/80"
								key={`${row.at}-${row.event}-${index}`}
							>
								<span className="text-white/40">
									{new Date(row.at).toLocaleTimeString()}
								</span>{" "}
								<span className="font-medium text-white/90">{row.label}</span>
								{row.detail ? (
									<span className="text-white/55"> · {row.detail}</span>
								) : null}
							</li>
						))}
					</ol>
				</div>
			) : null}

			{model.rawResult !== undefined ? (
				<details className="rounded-lg border border-white/10 bg-black/20 p-2">
					<summary className="cursor-pointer text-white/70 text-xs">
						Full result (JSON)
					</summary>
					<div className="mt-2">{renderInspectorValue(model.rawResult)}</div>
				</details>
			) : null}
		</div>
	);
}
