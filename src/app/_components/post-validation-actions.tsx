"use client";

import { useEffect, useMemo, useState } from "react";
import { ADMIN_API_STORAGE_KEY } from "~/app/admin-api/types";

type EndpointConfig = {
	id: string;
	label: string;
	path: string;
	buildBody: (ctx: {
		postId: string;
		stream: boolean;
		useCache: boolean;
		persistCache: boolean;
		useTermsCache: boolean;
		persistTermsCache: boolean;
		useFetchCache: boolean;
		allowAnglesFallback: boolean;
		includePost: boolean;
	}) => Record<string, unknown>;
};

const ENDPOINTS: EndpointConfig[] = [
	{
		id: "validate-post",
		label: "Validate workflow",
		path: "/workflows/validate-post",
		buildBody: (ctx) => ({
			post_id: ctx.postId,
			stream: ctx.stream,
			use_terms_cache: ctx.useTermsCache,
			persist_terms_cache: ctx.persistTermsCache,
			use_fetch_cache: ctx.useFetchCache,
			allow_angles_fallback: ctx.allowAnglesFallback
		})
	},
	{
		id: "gen-terms",
		label: "Gen terms",
		path: "/tools/protocol/gen-terms",
		buildBody: (ctx) => ({
			post_id: ctx.postId,
			use_cache: ctx.useCache,
			persist_cache: ctx.persistCache
		})
	},
	{
		id: "data-load-preview",
		label: "Data-load preview",
		path: "/tools/protocol/data-load-preview",
		buildBody: (ctx) => ({
			post_id: ctx.postId,
			use_cache: ctx.useCache,
			include_post: ctx.includePost
		})
	},
	{
		id: "research-preview",
		label: "Research preview",
		path: "/tools/protocol/research-preview",
		buildBody: (ctx) => ({
			post_id: ctx.postId,
			use_terms_cache: ctx.useTermsCache,
			persist_terms_cache: ctx.persistTermsCache,
			use_fetch_cache: ctx.useFetchCache,
			include_post: ctx.includePost
		})
	},
	{
		id: "angles-preview",
		label: "Angles preview",
		path: "/tools/protocol/angles-preview",
		buildBody: (ctx) => ({
			post_id: ctx.postId,
			use_terms_cache: ctx.useTermsCache,
			persist_terms_cache: ctx.persistTermsCache,
			use_fetch_cache: ctx.useFetchCache,
			allow_angles_fallback: ctx.allowAnglesFallback,
			include_post: ctx.includePost
		})
	}
];

function parseJsonOrText(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

export function PostValidationActions({ postId }: { postId?: string }) {
	const normalizedPostId = postId?.trim() ?? "";
	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [stream, setStream] = useState(false);
	const [useCache, setUseCache] = useState(false);
	const [persistCache, setPersistCache] = useState(false);
	const [useTermsCache, setUseTermsCache] = useState(false);
	const [persistTermsCache, setPersistTermsCache] = useState(false);
	const [useFetchCache, setUseFetchCache] = useState(false);
	const [allowAnglesFallback, setAllowAnglesFallback] = useState(false);
	const [includePost, setIncludePost] = useState(false);
	const [isRunningId, setIsRunningId] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<{
		endpoint: string;
		status: number | null;
		ok: boolean;
		payload: unknown;
	} | null>(null);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as { baseUrl?: unknown };
			if (typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
				setBaseUrl(parsed.baseUrl);
			}
		} catch {
			// Keep default URL.
		}
	}, []);

	const endpointHint = useMemo(() => {
		const trimmed = baseUrl.replace(/\/+$/, "");
		return `${trimmed}/...`;
	}, [baseUrl]);

	const runEndpoint = async (endpoint: EndpointConfig) => {
		if (!normalizedPostId) return;
		const base = baseUrl.replace(/\/+$/, "");
		const body = endpoint.buildBody({
			postId: normalizedPostId,
			stream,
			useCache,
			persistCache,
			useTermsCache,
			persistTermsCache,
			useFetchCache,
			allowAnglesFallback,
			includePost
		});
		const url = `${base}${endpoint.path}`;
		setIsRunningId(endpoint.id);
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			const text = await res.text();
			setLastResponse({
				endpoint: endpoint.path,
				status: res.status,
				ok: res.ok,
				payload: parseJsonOrText(text)
			});
		} catch (error) {
			setLastResponse({
				endpoint: endpoint.path,
				status: null,
				ok: false,
				payload: {
					message: "Request failed",
					error: error instanceof Error ? error.message : String(error)
				}
			});
		} finally {
			setIsRunningId(null);
		}
	};

	return (
		<section className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
			<div className="flex items-center justify-between gap-2">
				<h6 className="text-xs font-semibold uppercase tracking-wide text-white/70">
					Protocol Validation APIs
				</h6>
				<span className="text-[10px] text-white/40">{endpointHint}</span>
			</div>
			{normalizedPostId ? (
				<div className="text-xs text-white/50">
					post_id: <code className="text-white/80">{normalizedPostId}</code>
				</div>
			) : (
				<div className="text-xs text-amber-300/90">
					No post id found on this item.
				</div>
			)}
			<div className="grid grid-cols-2 gap-2 text-[11px] text-white/70 md:grid-cols-3">
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={stream}
						onChange={(e) => setStream(e.target.checked)}
					/>
					stream
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={useCache}
						onChange={(e) => setUseCache(e.target.checked)}
					/>
					use_cache
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={persistCache}
						onChange={(e) => setPersistCache(e.target.checked)}
					/>
					persist_cache
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={useTermsCache}
						onChange={(e) => setUseTermsCache(e.target.checked)}
					/>
					use_terms_cache
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={persistTermsCache}
						onChange={(e) => setPersistTermsCache(e.target.checked)}
					/>
					persist_terms_cache
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={useFetchCache}
						onChange={(e) => setUseFetchCache(e.target.checked)}
					/>
					use_fetch_cache
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={allowAnglesFallback}
						onChange={(e) => setAllowAnglesFallback(e.target.checked)}
					/>
					allow_angles_fallback
				</label>
				<label className="flex items-center gap-2">
					<input
						type="checkbox"
						checked={includePost}
						onChange={(e) => setIncludePost(e.target.checked)}
					/>
					include_post
				</label>
			</div>
			<div className="flex flex-wrap gap-2">
				{ENDPOINTS.map((endpoint) => (
					<button
						key={endpoint.id}
						type="button"
						onClick={() => void runEndpoint(endpoint)}
						disabled={!normalizedPostId || isRunningId !== null}
						className="rounded-md bg-teal-500/20 px-2.5 py-1.5 text-xs hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isRunningId === endpoint.id ? "Running..." : endpoint.label}
					</button>
				))}
			</div>
			{lastResponse ? (
				<details className="rounded-md border border-white/10 bg-black/20 p-2">
					<summary className="cursor-pointer text-xs text-white/80">
						Last response: {lastResponse.endpoint} -{" "}
						{lastResponse.status ?? "network error"}{" "}
						{lastResponse.ok ? "OK" : "Error"}
					</summary>
					<pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] text-white/70">
						{JSON.stringify(lastResponse.payload, null, 2)}
					</pre>
				</details>
			) : null}
		</section>
	);
}
