/**
 * Small formatting/statistics helpers shared between the interactive
 * dashboard (page.tsx) and the plain-text `.md` export (../../zlg-comparison.md/route.ts)
 * so both render identical numbers from identical logic.
 */

export function firstLine(value?: string): string {
	if (!value) return "";
	return value.split("\n")[0] ?? value;
}

export function fmtNum(value: number | undefined | null, digits = 2): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	return value.toFixed(digits);
}

export function fmtP(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	if (value < 0.0001) return value.toExponential(2);
	return value.toFixed(4);
}

export function fmtPct(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	return `${(value * 100).toFixed(1)}%`;
}

/**
 * Two-sided exact sign test, same closed form as
 * stego-side-wing/scripts/build_zlg_method_comparison_dataset.py:_sign_test_p_value.
 * Used only for the bits-per-word row, which isn't part of the Python-side
 * Holm-adjusted family — kept methodologically consistent with it, but
 * reported as a raw, non-adjusted descriptive statistic.
 */
export function binomialCoefficient(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	let result = 1;
	for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
	return result;
}

export function signTestP(positive: number, negative: number): number | null {
	const total = positive + negative;
	if (total === 0) return null;
	const observed = Math.min(positive, negative);
	let tail = 0;
	for (let k = 0; k <= observed; k++) tail += binomialCoefficient(total, k);
	return Math.min(1, (2 * tail) / 2 ** total);
}
