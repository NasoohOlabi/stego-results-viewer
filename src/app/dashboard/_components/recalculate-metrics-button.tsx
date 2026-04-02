"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ADMIN_API_STORAGE_KEY } from "~/app/admin-api/types";
import { api } from "~/trpc/react";
import {
	normalizeAdminApiBase,
	postMetricsDivergence,
	postMetricsPerplexity,
} from "./metrics-api-client";

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

export function RecalculateMetricsButton() {
	const utils = api.useUtils();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const run = async () => {
		const base = normalizeAdminApiBase(readStoredBase());
		setBusy(true);
		setMessage(null);

		const ppl = await postMetricsPerplexity(base, {
			output_dir: "output-results",
			device: "cpu",
		});
		if (!ppl.ok) {
			setBusy(false);
			setMessage(`Perplexity: ${ppl.error}`);
			return;
		}

		const div = await postMetricsDivergence(base, {
			output_dir: "output-results",
			dataset_dir: "datasets/news_cleaned",
		});
		setBusy(false);
		if (!div.ok) {
			setMessage(
				`Divergence: ${div.error} (perplexity wrote ${ppl.report_path})`,
			);
			return;
		}

		setMessage("Metrics recalculated on API host.");
		await Promise.all([
			utils.stats.getPerplexityMetrics.invalidate(),
			utils.stats.getDivergenceMetrics.invalidate(),
		]);
	};

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
			<button
				className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600/90 px-4 py-2 font-medium text-sm text-white hover:bg-violet-500 disabled:opacity-50"
				disabled={busy}
				onClick={() => void run()}
				type="button"
			>
				{busy ? (
					<>
						<Loader2 className="size-4 animate-spin" />
						Recalculating…
					</>
				) : (
					"Recalculate metrics"
				)}
			</button>
			<p className="text-white/45 text-xs">
				Uses Admin API base URL (same as{" "}
				<Link
					className="text-cyan-400/90 underline-offset-2 hover:underline"
					href="/admin-api"
				>
					/admin-api
				</Link>
				). Runs perplexity then KL/JSD on the side-wing host.
			</p>
			{message && (
				<p className="text-sm text-white/70 sm:ml-auto sm:max-w-md">
					{message}
				</p>
			)}
		</div>
	);
}
