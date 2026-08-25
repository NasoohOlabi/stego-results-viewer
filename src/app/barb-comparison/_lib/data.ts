import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { SampleCard } from "../_components/sample-browser";
import type { SummaryTableRow } from "../_components/summary-table";
import { fmtNum, fmtPct } from "./format";

/**
 * Filesystem loader for the BARB vs Balanced comparison dashboard.
 * Shared by page.tsx and barb-comparison.md/route.ts.
 *
 * Schema matches stego-side-wing
 * `scripts/build_barb_variant_comparison_dataset.py` (source of truth).
 *
 * Expected layout:
 *   metrics/experiments/barb/runs/<run_id>/
 *     balanced/
 *     barb/
 *     comparison/
 *       paired_rows.jsonl   # method: balanced | barb
 *       summary.json
 *       manifest.json
 */

export type BarbMethod = "balanced" | "barb";

export type PairedRowFeatures = {
	has_thread_proper_noun_overlap?: boolean;
	has_numeral?: boolean;
	safe_universal_hit?: boolean;
	has_affect_opinion_cue?: boolean;
};

/** One method lane for a (post_id, sample_index) pair. */
export type PairedRow = {
	post_id?: string;
	sample_index?: number;
	method?: string;
	stego_text?: string;
	encode_succeeded?: boolean;
	receiver_match?: boolean;
	itt_success?: boolean;
	word_count?: number;
	failure_code?: string | null;
	error?: string | null;
	features?: PairedRowFeatures;
};

/** Per-method block inside comparison/summary.json → methods.balanced|barb */
export type MethodBlock = {
	/** Derived from paired rows when summary omits a count. */
	n?: number;
	itt_success_rate?: number | null;
	receiver_match_rate?: number | null;
	mean_word_count?: number | null;
	safe_universal_rate?: number | null;
	thread_specificity_rate?: number | null;
	affect_opinion_rate?: number | null;
};

export type SignTest = {
	field?: string;
	paired_n?: number;
	ties?: number;
	barb_wins?: number;
	balanced_wins?: number;
	p_value?: number | null;
	note?: string;
};

export type BarbSummary = {
	run_dir?: string;
	paired_posts?: number;
	row_count?: number;
	methods?: {
		balanced?: MethodBlock;
		barb?: MethodBlock;
	};
	sign_tests?: SignTest[];
};

export type BarbManifest = {
	run_dir?: string;
	control?: string;
	treatment?: string;
	paired_rows?: string;
	summary?: string;
	paired_posts?: number;
	row_count?: number;
	[key: string]: unknown;
};

const BARB_RUNS_ROOT = path.resolve(
	process.cwd(),
	"..",
	"stego-side-wing",
	"metrics",
	"experiments",
	"barb",
	"runs",
);

function resolvePinnedOrLatest(runsRoot: string): string | null {
	if (!existsSync(runsRoot)) return null;

	const pinnedDir = path.join(runsRoot, "pinned");
	if (existsSync(pinnedDir) && statSync(pinnedDir).isDirectory()) {
		return pinnedDir;
	}

	for (const name of ["PINNED", "pinned.txt", ".pinned"]) {
		const pinFile = path.join(runsRoot, name);
		if (!existsSync(pinFile) || !statSync(pinFile).isFile()) continue;
		const runId = readFileSync(pinFile, "utf-8")
			.trim()
			.split(/\r?\n/)[0]
			?.trim();
		if (!runId) continue;
		const candidate = path.join(runsRoot, runId);
		if (existsSync(candidate) && statSync(candidate).isDirectory()) {
			return candidate;
		}
	}

	let entries: string[] = [];
	try {
		entries = readdirSync(runsRoot).filter((name) => {
			if (name === "pinned" || name.startsWith(".")) return false;
			try {
				return statSync(path.join(runsRoot, name)).isDirectory();
			} catch {
				return false;
			}
		});
	} catch {
		return null;
	}
	if (entries.length === 0) return null;

	entries.sort((a, b) => {
		const aM = statSync(path.join(runsRoot, a)).mtimeMs;
		const bM = statSync(path.join(runsRoot, b)).mtimeMs;
		return bM - aM || b.localeCompare(a);
	});
	const latest = entries[0];
	return latest ? path.join(runsRoot, latest) : null;
}

function resolveRunDir(): { runDir: string | null; resolution: string } {
	const fromEnv = process.env.BARB_RUN_DIR?.trim();
	if (fromEnv) {
		const resolved = path.isAbsolute(fromEnv)
			? fromEnv
			: path.resolve(process.cwd(), fromEnv);
		return { runDir: resolved, resolution: "BARB_RUN_DIR" };
	}
	const discovered = resolvePinnedOrLatest(BARB_RUNS_ROOT);
	if (!discovered) {
		return { runDir: null, resolution: "missing" };
	}
	const base = path.basename(discovered);
	return {
		runDir: discovered,
		resolution: base === "pinned" ? "pinned" : "latest",
	};
}

/** Re-resolve on each call so newly created runs appear without a restart. */
export function getBarbRunResolution(): {
	runDir: string;
	resolution: string;
} {
	const { runDir, resolution } = resolveRunDir();
	return { runDir: runDir ?? "", resolution };
}

/** Absolute run directory, or empty string when no run exists yet. */
export function getBarbRunDir(): string {
	return getBarbRunResolution().runDir;
}

export const BARB_RUNS_ROOT_PATH = BARB_RUNS_ROOT;

function comparisonPaths(runDir: string) {
	const comparisonDir = path.join(runDir, "comparison");
	return {
		comparisonDir,
		pairedRows: path.join(comparisonDir, "paired_rows.jsonl"),
		summary: path.join(comparisonDir, "summary.json"),
		manifest: path.join(comparisonDir, "manifest.json"),
	};
}

function readJson<T>(pathname: string): T | null {
	if (!existsSync(pathname)) return null;
	try {
		return JSON.parse(readFileSync(pathname, "utf-8")) as T;
	} catch {
		return null;
	}
}

function readJsonl<T>(pathname: string): T[] {
	if (!existsSync(pathname)) return [];
	return readFileSync(pathname, "utf-8")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line) as T;
			} catch {
				return {} as T;
			}
		});
}

function asMethod(value: string | undefined): BarbMethod | null {
	if (value === "balanced" || value === "barb") return value;
	return null;
}

/** Canonical join key matching the pairer's pair_key(post_id, sample_index). */
function pairKey(row: PairedRow): string | null {
	const postId = row.post_id;
	if (!postId) return null;
	const index =
		typeof row.sample_index === "number" && Number.isFinite(row.sample_index)
			? Math.trunc(row.sample_index)
			: 0;
	return `${postId}:${index}`;
}

function rateOf(
	rows: PairedRow[],
	predicate: (row: PairedRow) => boolean | undefined,
): number | null {
	if (rows.length === 0) return null;
	let hits = 0;
	for (const row of rows) {
		if (predicate(row)) hits += 1;
	}
	return hits / rows.length;
}

function meanWordCount(rows: PairedRow[]): number | null {
	const values = rows
		.map((r) => r.word_count)
		.filter((n): n is number => typeof n === "number");
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function featuresOf(row: PairedRow | undefined): PairedRowFeatures {
	return row?.features ?? {};
}

function hasAffectCue(row: PairedRow): boolean {
	return Boolean(featuresOf(row).has_affect_opinion_cue);
}

function hasThreadSpecificity(row: PairedRow): boolean {
	return Boolean(featuresOf(row).has_thread_proper_noun_overlap);
}

function deriveMethodBlock(rows: PairedRow[]): MethodBlock {
	return {
		n: rows.length,
		itt_success_rate: rateOf(rows, (r) => r.itt_success),
		receiver_match_rate: rateOf(rows, (r) => r.receiver_match),
		mean_word_count: meanWordCount(rows),
		safe_universal_rate: rateOf(rows, (r) => featuresOf(r).safe_universal_hit),
		thread_specificity_rate: rateOf(rows, hasThreadSpecificity),
		affect_opinion_rate: rateOf(rows, hasAffectCue),
	};
}

function mergeBlock(
	fromSummary: MethodBlock | undefined,
	derived: MethodBlock,
): MethodBlock {
	return {
		n: fromSummary?.n ?? derived.n,
		itt_success_rate:
			fromSummary?.itt_success_rate ?? derived.itt_success_rate ?? null,
		receiver_match_rate:
			fromSummary?.receiver_match_rate ?? derived.receiver_match_rate ?? null,
		mean_word_count:
			fromSummary?.mean_word_count ?? derived.mean_word_count ?? null,
		safe_universal_rate:
			fromSummary?.safe_universal_rate ?? derived.safe_universal_rate ?? null,
		thread_specificity_rate:
			fromSummary?.thread_specificity_rate ??
			derived.thread_specificity_rate ??
			null,
		affect_opinion_rate:
			fromSummary?.affect_opinion_rate ?? derived.affect_opinion_rate ?? null,
	};
}

function pickHigherWinner(
	balanced: number | null | undefined,
	barb: number | null | undefined,
): SummaryTableRow["winner"] {
	if (
		balanced === null ||
		balanced === undefined ||
		barb === null ||
		barb === undefined
	) {
		return "n/a";
	}
	if (Math.abs(balanced - barb) < 1e-9) return "tie";
	return barb > balanced ? "barb" : "balanced";
}

function pickLowerWinner(
	balanced: number | null | undefined,
	barb: number | null | undefined,
): SummaryTableRow["winner"] {
	if (
		balanced === null ||
		balanced === undefined ||
		barb === null ||
		barb === undefined
	) {
		return "n/a";
	}
	if (Math.abs(balanced - barb) < 1e-9) return "tie";
	return barb < balanced ? "barb" : "balanced";
}

function featureBadges(row: PairedRow | undefined): string[] {
	if (!row) return [];
	const f = featuresOf(row);
	const badges: string[] = [];
	if (f.has_thread_proper_noun_overlap) badges.push("specific");
	if (f.has_affect_opinion_cue) badges.push("strong affect");
	if (f.safe_universal_hit) badges.push("platitude");
	if (f.has_numeral) badges.push("numeral");
	return badges;
}

function fileMtimeIso(pathname: string): string | null {
	if (!existsSync(pathname)) return null;
	try {
		return new Date(statSync(pathname).mtimeMs).toISOString();
	} catch {
		return null;
	}
}

export async function loadBarbComparisonData() {
	const { runDir, resolution } = getBarbRunResolution();
	if (!runDir || !existsSync(runDir)) {
		return {
			empty: true as const,
			runDir,
			resolution,
			runsRoot: BARB_RUNS_ROOT_PATH,
			manifest: null,
			summary: null,
			pairedRows: [] as PairedRow[],
			balanced: null as MethodBlock | null,
			barb: null as MethodBlock | null,
			pairedN: 0,
			summaryRows: [] as SummaryTableRow[],
			samples: [] as SampleCard[],
			updatedAt: null as string | null,
		};
	}

	const paths = comparisonPaths(runDir);
	const manifest = readJson<BarbManifest>(paths.manifest);
	const summary = readJson<BarbSummary>(paths.summary);
	const pairedRows = readJsonl<PairedRow>(paths.pairedRows);

	const balancedRows = pairedRows.filter(
		(r) => asMethod(r.method) === "balanced",
	);
	const barbRows = pairedRows.filter((r) => asMethod(r.method) === "barb");

	const balanced = mergeBlock(
		summary?.methods?.balanced,
		deriveMethodBlock(balancedRows),
	);
	const barb = mergeBlock(summary?.methods?.barb, deriveMethodBlock(barbRows));

	const pairedByKey = new Map<
		string,
		{ balanced?: PairedRow; barb?: PairedRow }
	>();
	for (const row of pairedRows) {
		const method = asMethod(row.method);
		const key = pairKey(row);
		if (!key || !method) continue;
		const entry = pairedByKey.get(key) ?? {};
		entry[method] = row;
		pairedByKey.set(key, entry);
	}

	const completePairs = [...pairedByKey.entries()].filter(
		([, entry]) => entry.balanced && entry.barb,
	);
	const pairedN =
		summary?.paired_posts ?? manifest?.paired_posts ?? completePairs.length;

	const summaryRows: SummaryTableRow[] = [
		{
			label: "ITT success rate",
			balanced: fmtPct(balanced.itt_success_rate),
			barb: fmtPct(barb.itt_success_rate),
			winner: pickHigherWinner(
				balanced.itt_success_rate,
				barb.itt_success_rate,
			),
			direction: "higher",
			caveat: "Share of encode attempts that produced a recoverable carrier.",
		},
		{
			label: "Receiver / decode match",
			balanced: fmtPct(balanced.receiver_match_rate),
			barb: fmtPct(barb.receiver_match_rate),
			winner: pickHigherWinner(
				balanced.receiver_match_rate,
				barb.receiver_match_rate,
			),
			direction: "higher",
			caveat: "Blind receiver recovered the intended payload / angle.",
		},
		{
			label: "Mean comment length",
			balanced: `${fmtNum(balanced.mean_word_count, 1)} words`,
			barb: `${fmtNum(barb.mean_word_count, 1)} words`,
			winner: "n/a",
			caveat: "Whitespace-delimited word count; descriptive only.",
		},
		{
			label: "Thread specificity rate",
			balanced: fmtPct(balanced.thread_specificity_rate),
			barb: fmtPct(barb.thread_specificity_rate),
			winner: pickHigherWinner(
				balanced.thread_specificity_rate,
				barb.thread_specificity_rate,
			),
			direction: "higher",
			caveat:
				"Proper-noun / content-word overlap with the thread title/selftext.",
		},
		{
			label: "Strong opinion / affect rate",
			balanced: fmtPct(balanced.affect_opinion_rate),
			barb: fmtPct(barb.affect_opinion_rate),
			winner: pickHigherWinner(
				balanced.affect_opinion_rate,
				barb.affect_opinion_rate,
			),
			direction: "higher",
			caveat:
				"Felt register cue (sarcasm, frustration, enthusiasm, skepticism, …) — not sarcasm-only.",
		},
		{
			label: "Safe-universal / platitude rate",
			balanced: fmtPct(balanced.safe_universal_rate),
			barb: fmtPct(barb.safe_universal_rate),
			winner: pickLowerWinner(
				balanced.safe_universal_rate,
				barb.safe_universal_rate,
			),
			direction: "lower",
			caveat:
				"Slogan / conciliatory platitude hits (e.g. “we could all just…”). Lower is better for BARB.",
		},
	];

	const samples: SampleCard[] = completePairs
		.map(([key, entry]) => {
			const balancedRow = entry.balanced;
			const barbRow = entry.barb;
			return {
				key,
				postId: barbRow?.post_id ?? balancedRow?.post_id ?? "n/a",
				sampleIndex: barbRow?.sample_index ?? balancedRow?.sample_index,
				balancedText: balancedRow?.stego_text || "n/a",
				barbText: barbRow?.stego_text || "n/a",
				balancedWordCount: balancedRow?.word_count,
				barbWordCount: barbRow?.word_count,
				balancedSuccess: balancedRow?.encode_succeeded,
				barbSuccess: barbRow?.encode_succeeded,
				balancedDecodeOk: balancedRow?.receiver_match,
				barbDecodeOk: barbRow?.receiver_match,
				balancedBadges: featureBadges(balancedRow),
				barbBadges: featureBadges(barbRow),
			};
		})
		.sort((a, b) => {
			const postCmp = a.postId.localeCompare(b.postId);
			if (postCmp !== 0) return postCmp;
			return (a.sampleIndex ?? 0) - (b.sampleIndex ?? 0);
		});

	const updatedAt =
		fileMtimeIso(paths.summary) ?? fileMtimeIso(paths.pairedRows) ?? null;

	return {
		empty: false as const,
		runDir,
		resolution,
		runsRoot: BARB_RUNS_ROOT_PATH,
		manifest,
		summary,
		pairedRows,
		balanced,
		barb,
		pairedN,
		summaryRows,
		samples,
		updatedAt,
	};
}
