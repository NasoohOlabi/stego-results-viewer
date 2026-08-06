import { readdir, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import {
	encodeGeneratedPath,
	findAllGeneratedOutputDirs,
	getMetricsPath,
} from "~/server/paths";

/** Per-run sample generation progress derived from the on-disk layout that
 * side-wing writes: `<run>/<profile>/{dataset,input-angles,output-results,failures}`. */
export interface RunProgress {
	/** Path of the profile dir relative to side-wing `metrics/` (unique id). */
	id: string;
	/** e.g. "e2e_runs/quality_100x_20260711" */
	run: string;
	/** e.g. "balanced" or "lane_002_... / balanced" */
	profile: string;
	/** Posts staged for this run. */
	datasetCount: number;
	/** Sample attempts prepared (one input-angles file per sample). */
	attemptedCount: number;
	/** Samples generated successfully. */
	doneCount: number;
	/** Samples that failed. */
	failedCount: number;
	/** Epoch ms of the most recent output/failure write; 0 if none. */
	lastActivityMs: number;
	/** True when something was written in the last 3 minutes. */
	isActive: boolean;
	/** Result-source id for this run's output-results (usable as ?folder=). */
	sourceId: string;
}

const ACTIVE_WINDOW_MS = 3 * 60 * 1000;

async function countJsonFiles(dir: string): Promise<{
	count: number;
	latestMtimeMs: number;
}> {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		const jsonFiles = entries.filter(
			(entry) => entry.isFile() && entry.name.endsWith(".json"),
		);
		let latestMtimeMs = 0;
		for (const file of jsonFiles) {
			const stats = await stat(join(dir, file.name)).catch(() => null);
			if (stats && stats.mtimeMs > latestMtimeMs) {
				latestMtimeMs = stats.mtimeMs;
			}
		}
		return { count: jsonFiles.length, latestMtimeMs };
	} catch {
		return { count: 0, latestMtimeMs: 0 };
	}
}

async function readProfileProgress(
	outputResultsDir: string,
): Promise<RunProgress | null> {
	const profileDir = dirname(outputResultsDir);
	const metricsPath = getMetricsPath();
	const rel = relative(metricsPath, profileDir);
	if (rel.startsWith("..")) return null;

	const parts = rel.split(/[\\/]/).filter(Boolean);
	const run = parts.slice(0, 2).join("/") || basename(profileDir);
	const profile = parts.slice(2).join(" / ") || basename(profileDir);

	const [dataset, attempts, outputs, failures] = await Promise.all([
		countJsonFiles(join(profileDir, "dataset")),
		countJsonFiles(join(profileDir, "input-angles")),
		countJsonFiles(outputResultsDir),
		countJsonFiles(join(profileDir, "failures")),
	]);

	const lastActivityMs = Math.max(
		outputs.latestMtimeMs,
		failures.latestMtimeMs,
		attempts.latestMtimeMs,
	);

	return {
		id: rel.replace(/\\/g, "/"),
		run,
		profile,
		datasetCount: dataset.count,
		attemptedCount: attempts.count,
		doneCount: outputs.count,
		failedCount: failures.count,
		lastActivityMs,
		isActive:
			lastActivityMs > 0 && Date.now() - lastActivityMs < ACTIVE_WINDOW_MS,
		sourceId: encodeGeneratedPath(outputResultsDir),
	};
}

/** Progress rows for every generation run found on disk, active first, then
 * most recent activity first. */
export async function getRunProgressRows(): Promise<RunProgress[]> {
	const outputDirs = await findAllGeneratedOutputDirs();
	const rows = (
		await Promise.all(outputDirs.map((dir) => readProfileProgress(dir)))
	).filter((row): row is RunProgress => row !== null);

	return rows.sort(
		(a, b) =>
			Number(b.isActive) - Number(a.isActive) ||
			b.lastActivityMs - a.lastActivityMs,
	);
}
