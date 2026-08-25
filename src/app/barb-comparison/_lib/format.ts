/**
 * Formatting helpers shared by the BARB comparison page and its `.md` export.
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

export function fmtPct(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	return `${(value * 100).toFixed(1)}%`;
}

export function fmtP(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value))
		return "n/a";
	if (value < 0.0001) return value.toExponential(2);
	return value.toFixed(4);
}
