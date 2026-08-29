/**
 * Client-side access to the external stego-side-wing HTTP API.
 *
 * This module owns two things that were previously smeared across the admin
 * console, the dashboard and two renderers: where the API base URL comes from,
 * and how the side-wing response envelope is unwrapped. Callers get a
 * discriminated result and never touch `localStorage` or the envelope shape.
 */

/** localStorage key holding `{ baseUrl }`, written by the side-wing console. */
const BASE_URL_STORAGE_KEY = "admin-api-console:v1";

const DEFAULT_BASE_URL = "http://localhost:5001/api/v1";

export type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string; httpStatus?: number };

/** Strip trailing slashes so `${base}/path` never doubles up. */
export function normalizeApiBase(raw: string): string {
	return raw.trim().replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolve the side-wing base URL from browser storage, falling back to the
 * local default. Safe to call during render; never throws.
 */
export function readApiBase(): string {
	if (typeof localStorage === "undefined") return DEFAULT_BASE_URL;
	try {
		const raw = localStorage.getItem(BASE_URL_STORAGE_KEY);
		if (!raw) return DEFAULT_BASE_URL;
		const parsed: unknown = JSON.parse(raw);
		if (isRecord(parsed) && typeof parsed.baseUrl === "string") {
			return normalizeApiBase(parsed.baseUrl);
		}
	} catch {
		// Corrupt or unreadable storage falls back to the default.
	}
	return DEFAULT_BASE_URL;
}

/**
 * Unwrap the side-wing `{ ok, data, error }` envelope into a discriminated
 * result. A non-2xx status, `ok: false`, or a non-object `data` all collapse to
 * the error arm, so callers only branch once.
 */
async function readEnvelope(res: Response): Promise<ApiResult<JsonRecord>> {
	let parsed: unknown = null;
	try {
		parsed = JSON.parse(await res.text());
	} catch {
		// Non-JSON body: fall through to the status-derived error below.
	}
	const envelope = isRecord(parsed) ? parsed : {};
	const error =
		typeof envelope.error === "string"
			? envelope.error
			: !res.ok
				? res.statusText || `HTTP ${res.status}`
				: "Unexpected response shape";

	if (!res.ok || envelope.ok !== true || !isRecord(envelope.data)) {
		return { ok: false, error, httpStatus: res.status };
	}
	return { ok: true, data: envelope.data };
}

export type JsonRecord = Record<string, unknown>;

async function request(
	url: string,
	init: RequestInit,
): Promise<ApiResult<JsonRecord>> {
	try {
		return await readEnvelope(await fetch(url, init));
	} catch (cause) {
		return {
			ok: false,
			error: cause instanceof Error ? cause.message : "Network request failed",
		};
	}
}

/** POST a sample to the metrics endpoint and return the raw metric record. */
export function postMetricsPost(
	base: string,
	body: JsonRecord,
): Promise<ApiResult<JsonRecord>> {
	return request(`${normalizeApiBase(base)}/tools/metrics/post`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

/** Delete one recorded metrics sample by output filename. */
export function deleteMetricsSample(
	base: string,
	query: { filename: string; output_dir?: string },
): Promise<ApiResult<JsonRecord>> {
	const qs = new URLSearchParams({ filename: query.filename });
	const outputDir = query.output_dir?.trim();
	if (outputDir) qs.set("output_dir", outputDir);
	return request(
		`${normalizeApiBase(base)}/tools/metrics/sample?${qs.toString()}`,
		{ method: "DELETE" },
	);
}
