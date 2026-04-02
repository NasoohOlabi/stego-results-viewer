type Envelope = { ok?: boolean; data?: unknown; error?: string };

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

async function readEnvelope(res: Response): Promise<{
	ok: boolean;
	data?: unknown;
	error?: string;
	httpStatus: number;
}> {
	const text = await res.text();
	const json = parseJson(text) as Envelope | null;
	const ok = res.ok && json?.ok === true;
	return {
		ok,
		data: json?.data,
		error: json?.error ?? (!res.ok ? res.statusText : undefined),
		httpStatus: res.status,
	};
}

export function normalizeAdminApiBase(raw: string): string {
	return raw.trim().replace(/\/+$/, "");
}

export async function postMetricsPerplexity(
	base: string,
	body: Record<string, unknown>,
): Promise<
	| { ok: true; report_path: string }
	| { ok: false; error: string; httpStatus?: number }
> {
	const res = await fetch(`${base}/tools/metrics/perplexity`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const env = await readEnvelope(res);
	if (!env.ok || env.data === undefined || typeof env.data !== "object") {
		return {
			ok: false,
			error: env.error ?? `HTTP ${env.httpStatus}`,
			httpStatus: env.httpStatus,
		};
	}
	const d = env.data as { report_path?: string };
	if (typeof d.report_path !== "string") {
		return { ok: false, error: "Unexpected perplexity response shape" };
	}
	return { ok: true, report_path: d.report_path };
}

export async function postMetricsDivergence(
	base: string,
	body: Record<string, unknown>,
): Promise<
	| { ok: true; report_path: string }
	| { ok: false; error: string; httpStatus?: number }
> {
	const res = await fetch(`${base}/tools/metrics/divergence`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const env = await readEnvelope(res);
	if (!env.ok || env.data === undefined || typeof env.data !== "object") {
		return {
			ok: false,
			error: env.error ?? `HTTP ${env.httpStatus}`,
			httpStatus: env.httpStatus,
		};
	}
	const d = env.data as { report_path?: string };
	if (typeof d.report_path !== "string") {
		return { ok: false, error: "Unexpected divergence response shape" };
	}
	return { ok: true, report_path: d.report_path };
}

export async function postMetricsPost(
	base: string,
	body: Record<string, unknown>,
): Promise<
	| { ok: true; data: Record<string, unknown> }
	| { ok: false; error: string; httpStatus?: number }
> {
	const res = await fetch(`${base}/tools/metrics/post`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const env = await readEnvelope(res);
	if (!env.ok || env.data === undefined || typeof env.data !== "object") {
		return {
			ok: false,
			error: env.error ?? `HTTP ${env.httpStatus}`,
			httpStatus: env.httpStatus,
		};
	}
	return { ok: true, data: env.data as Record<string, unknown> };
}
