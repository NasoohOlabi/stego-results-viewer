"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	WORKFLOW_COMMAND_OPTIONS,
	type WorkflowCommand
} from "./types";
import {
	getWorkflowRunAllTemplate,
	getWorkflowTemplate
} from "./utils";
import type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";
import type { CallApiFn, SetTabErrorFn } from "./tab-actions";

const WORKFLOW_ENDPOINT_PATH = "/workflows/run";

function ValidatePostWorkflowPanel(props: {
	tabId: string;
	apiActionId:
		| "workflows-validate-post"
		| "protocol-gen-terms"
		| "protocol-data-load-preview"
		| "protocol-research-preview"
		| "protocol-angles-preview";
	validatePostId: string;
	setValidatePostId: (value: string) => void;
	validatePostStream: boolean;
	setValidatePostStream: (value: boolean) => void;
	validateUseTermsCache: boolean;
	setValidateUseTermsCache: (value: boolean) => void;
	validatePersistTermsCache: boolean;
	setValidatePersistTermsCache: (value: boolean) => void;
	validateUseFetchCache: boolean;
	setValidateUseFetchCache: (value: boolean) => void;
	validateAllowAnglesFallback: boolean;
	setValidateAllowAnglesFallback: (value: boolean) => void;
	protocolIncludePost: boolean;
	setProtocolIncludePost: (value: boolean) => void;
	protocolUseCache: boolean;
	setProtocolUseCache: (value: boolean) => void;
	protocolPersistCache: boolean;
	setProtocolPersistCache: (value: boolean) => void;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
	base: string;
}) {
	const {
		tabId,
		apiActionId,
		validatePostId,
		setValidatePostId,
		validatePostStream,
		setValidatePostStream,
		validateUseTermsCache,
		setValidateUseTermsCache,
		validatePersistTermsCache,
		setValidatePersistTermsCache,
		validateUseFetchCache,
		setValidateUseFetchCache,
		validateAllowAnglesFallback,
		setValidateAllowAnglesFallback,
		protocolIncludePost,
		setProtocolIncludePost,
		protocolUseCache,
		setProtocolUseCache,
		protocolPersistCache,
		setProtocolPersistCache,
		callApi,
		setTabError,
		base
	} = props;

	const endpointMap = {
		"workflows-validate-post": "/workflows/validate-post",
		"protocol-gen-terms": "/tools/protocol/gen-terms",
		"protocol-data-load-preview": "/tools/protocol/data-load-preview",
		"protocol-research-preview": "/tools/protocol/research-preview",
		"protocol-angles-preview": "/tools/protocol/angles-preview"
	} as const;
	const endpoint = endpointMap[apiActionId];

	const titleMap = {
		"workflows-validate-post": "Validate Post Workflow",
		"protocol-gen-terms": "Protocol: Generate Terms",
		"protocol-data-load-preview": "Protocol: Data-load Preview",
		"protocol-research-preview": "Protocol: Research Preview",
		"protocol-angles-preview": "Protocol: Angles Preview"
	} as const;

	const send = () => {
		const postId = validatePostId.trim();
		if (!postId) {
			setTabError(tabId, `${base}${endpoint}`, "POST", "post_id is required");
			return;
		}
		let body: Record<string, unknown>;
		switch (apiActionId) {
			case "workflows-validate-post":
				body = {
					post_id: postId,
					stream: validatePostStream,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					allow_angles_fallback: validateAllowAnglesFallback
				};
				break;
			case "protocol-gen-terms":
				body = {
					post_id: postId,
					use_cache: protocolUseCache,
					persist_cache: protocolPersistCache
				};
				break;
			case "protocol-data-load-preview":
				body = {
					post_id: postId,
					use_cache: protocolUseCache,
					include_post: protocolIncludePost
				};
				break;
			case "protocol-research-preview":
				body = {
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					include_post: protocolIncludePost
				};
				break;
			case "protocol-angles-preview":
				body = {
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					allow_angles_fallback: validateAllowAnglesFallback,
					include_post: protocolIncludePost
				};
				break;
		}
		void callApi("POST", endpoint, undefined, body, tabId);
	};

	return (
		<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
			<h2 className="text-lg font-semibold">{titleMap[apiActionId]}</h2>
			<p className="text-xs text-white/60">
				<code className="text-white/80">POST {endpoint}</code>
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
				<input
					value={validatePostId}
					onChange={(e) => setValidatePostId(e.target.value)}
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono"
					placeholder="post_id (required)"
				/>
				<button
					type="button"
					onClick={send}
					className="rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
				>
					Run
				</button>
			</div>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-white/70">
				{apiActionId === "workflows-validate-post" ? (
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={validatePostStream}
							onChange={(e) => setValidatePostStream(e.target.checked)}
						/>
						stream
					</label>
				) : null}
				{apiActionId === "workflows-validate-post" ||
				apiActionId === "protocol-research-preview" ||
				apiActionId === "protocol-angles-preview" ? (
					<>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={validateUseTermsCache}
								onChange={(e) =>
									setValidateUseTermsCache(e.target.checked)
								}
							/>
							use_terms_cache
						</label>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={validatePersistTermsCache}
								onChange={(e) =>
									setValidatePersistTermsCache(e.target.checked)
								}
							/>
							persist_terms_cache
						</label>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={validateUseFetchCache}
								onChange={(e) =>
									setValidateUseFetchCache(e.target.checked)
								}
							/>
							use_fetch_cache
						</label>
					</>
				) : null}
				{apiActionId === "workflows-validate-post" ||
				apiActionId === "protocol-angles-preview" ? (
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={validateAllowAnglesFallback}
							onChange={(e) =>
								setValidateAllowAnglesFallback(e.target.checked)
							}
						/>
						allow_angles_fallback
					</label>
				) : null}
				{apiActionId === "protocol-gen-terms" ||
				apiActionId === "protocol-data-load-preview" ? (
					<>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={protocolUseCache}
								onChange={(e) => setProtocolUseCache(e.target.checked)}
							/>
							use_cache
						</label>
						{apiActionId === "protocol-gen-terms" ? (
							<label className="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									checked={protocolPersistCache}
									onChange={(e) =>
										setProtocolPersistCache(e.target.checked)
									}
								/>
								persist_cache
							</label>
						) : null}
					</>
				) : null}
				{apiActionId === "protocol-data-load-preview" ||
				apiActionId === "protocol-research-preview" ||
				apiActionId === "protocol-angles-preview" ? (
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={protocolIncludePost}
							onChange={(e) => setProtocolIncludePost(e.target.checked)}
						/>
						include_post
					</label>
				) : null}
			</div>
		</section>
	);
}

function WorkflowRunsToolPanel(props: {
	tabId: string;
	callApi: CallApiFn;
}) {
	const { tabId, callApi } = props;
	const [autoMs, setAutoMs] = useState(0);
	const callApiRef = useRef(callApi);
	callApiRef.current = callApi;

	useEffect(() => {
		if (autoMs <= 0) return;
		const tick = () => {
			void callApiRef.current(
				"GET",
				"/workflows/runs",
				undefined,
				undefined,
				tabId
			);
		};
		tick();
		const id = window.setInterval(tick, autoMs);
		return () => window.clearInterval(id);
	}, [autoMs, tabId]);

	return (
		<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
			<h2 className="text-lg font-semibold">Workflow runs</h2>
			<p className="text-xs text-white/60">
				<code className="text-white/80">GET /workflows/runs</code> — active
				workflow runs in the API process. Use{" "}
				<strong className="text-white/70">Run selected API</strong> for a one-shot
				fetch, or refresh / auto-refresh here.
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					onClick={() =>
						void callApi("GET", "/workflows/runs", undefined, undefined, tabId)
					}
					className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
				>
					Refresh now
				</button>
				<label className="inline-flex items-center gap-2 text-xs text-white/70">
					<span>Auto-refresh</span>
					<select
						title="Auto-refresh interval"
						value={String(autoMs)}
						onChange={(e) => setAutoMs(Number(e.target.value))}
						className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm"
					>
						<option value="0">Off</option>
						<option value="2000">2s</option>
						<option value="5000">5s</option>
						<option value="10000">10s</option>
					</select>
				</label>
			</div>
		</section>
	);
}

export function AdminApiToolPanelsExtended(
	props: AdminApiToolPanelsProps
): ReactNode {
	const {
		tab,
		base,
		workflowCommand,
		setWorkflowCommand,
		artifactTag,
		setArtifactTag,
		workflowBody,
		setWorkflowBody,
		stegoPayload,
		setStegoPayload,
		validatePostId,
		setValidatePostId,
		validatePostStream,
		setValidatePostStream,
		validateUseTermsCache,
		setValidateUseTermsCache,
		validatePersistTermsCache,
		setValidatePersistTermsCache,
		validateUseFetchCache,
		setValidateUseFetchCache,
		validateAllowAnglesFallback,
		setValidateAllowAnglesFallback,
		protocolIncludePost,
		setProtocolIncludePost,
		protocolUseCache,
		setProtocolUseCache,
		protocolPersistCache,
		setProtocolPersistCache,
		kvKey,
		setKvKey,
		kvValue,
		setKvValue,
		kvLimit,
		setKvLimit,
		kvOffset,
		setKvOffset,
		searchQuery,
		setSearchQuery,
		searchProvider,
		setSearchProvider,
		callApi,
		setTabError,
		submitWorkflowRequest
	} = props;

	switch (tab.apiToolId) {
		case "artifacts-workflows":
			if (tab.apiActionId === "workflows-runs") {
				return (
					<WorkflowRunsToolPanel tabId={tab.id} callApi={callApi} />
				);
			}
			if (
				tab.apiActionId === "workflows-validate-post" ||
				tab.apiActionId === "protocol-gen-terms" ||
				tab.apiActionId === "protocol-data-load-preview" ||
				tab.apiActionId === "protocol-research-preview" ||
				tab.apiActionId === "protocol-angles-preview"
			) {
				return (
					<ValidatePostWorkflowPanel
						tabId={tab.id}
						apiActionId={tab.apiActionId}
						base={base}
						validatePostId={validatePostId}
						setValidatePostId={setValidatePostId}
						validatePostStream={validatePostStream}
						setValidatePostStream={setValidatePostStream}
						validateUseTermsCache={validateUseTermsCache}
						setValidateUseTermsCache={setValidateUseTermsCache}
						validatePersistTermsCache={validatePersistTermsCache}
						setValidatePersistTermsCache={setValidatePersistTermsCache}
						validateUseFetchCache={validateUseFetchCache}
						setValidateUseFetchCache={setValidateUseFetchCache}
						validateAllowAnglesFallback={validateAllowAnglesFallback}
						setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
						protocolIncludePost={protocolIncludePost}
						setProtocolIncludePost={setProtocolIncludePost}
						protocolUseCache={protocolUseCache}
						setProtocolUseCache={setProtocolUseCache}
						protocolPersistCache={protocolPersistCache}
						setProtocolPersistCache={setProtocolPersistCache}
						callApi={callApi}
						setTabError={setTabError}
					/>
				);
			}
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">Artifacts + Workflows</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<select
							title="Workflow command"
							value={workflowCommand}
							onChange={(e) => {
								const next = e.target.value as WorkflowCommand;
								setWorkflowCommand(next);
								setWorkflowBody(getWorkflowTemplate(next));
							}}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						>
							{WORKFLOW_COMMAND_OPTIONS.map((cmd) => (
								<option key={cmd} value={cmd}>
									{cmd}
								</option>
							))}
						</select>
						<input
							value={artifactTag}
							onChange={(e) => setArtifactTag(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="tag (optional)"
						/>
					</div>
					{workflowCommand === "stego" ? (
						<div className="space-y-1">
							<label className="text-xs text-white/60">
								Payload (optional — string or JSON; empty omits and uses API
								default)
							</label>
							<textarea
								title="Stego secret payload"
								value={stegoPayload}
								onChange={(e) => setStegoPayload(e.target.value)}
								placeholder='e.g. hello world or {"k":"v"}'
								className="min-h-18 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
							/>
						</div>
					) : null}
					<p className="text-xs text-white/60">
						Generic runner: body JSON (no <code>command</code> required inside —
						it is set from the dropdown) plus optional <code>stream: false</code>.
						{" "}
						<code>POST {WORKFLOW_ENDPOINT_PATH}</code> with{" "}
						<code>command: {workflowCommand}</code>.
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						<button
							type="button"
							onClick={() => {
								setWorkflowBody(getWorkflowTemplate(workflowCommand));
								if (workflowCommand === "stego") {
									setStegoPayload("hello world");
								}
							}}
							className="rounded-md bg-violet-500/20 px-3 py-2 text-sm hover:bg-violet-500/30"
						>
							Fill sample body
						</button>
						<button
							type="button"
							onClick={() => {
								setWorkflowBody(getWorkflowRunAllTemplate(workflowCommand));
								if (workflowCommand === "stego") {
									setStegoPayload("hello world");
								}
							}}
							disabled={workflowCommand !== "stego"}
							className="rounded-md bg-fuchsia-500/20 px-3 py-2 text-sm hover:bg-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Fill run-all sample
						</button>
						<button
							type="button"
							onClick={() => {
								void submitWorkflowRequest(tab.id, { forceRunAll: true });
							}}
							disabled={workflowCommand !== "stego"}
							className="rounded-md bg-indigo-500/20 px-3 py-2 text-sm hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
						>
							Run all now
						</button>
						<button
							type="button"
							onClick={() => {
								void submitWorkflowRequest(tab.id);
							}}
							className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
						>
							Send request
						</button>
					</div>
					<p className="text-[11px] text-white/50">
						Tag field is auto-injected for stego requests.
					</p>
					<textarea
						title="Workflow request body JSON"
						placeholder='{"count":3}'
						value={workflowBody}
						onChange={(e) => setWorkflowBody(e.target.value)}
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
					/>
				</section>
			);
		case "kv-store":
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">KV Store</h2>
					<div className="grid grid-cols-2 gap-2">
						<input
							value={kvLimit}
							onChange={(e) => setKvLimit(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="limit"
						/>
						<input
							value={kvOffset}
							onChange={(e) => setKvOffset(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="offset"
						/>
					</div>
					<button
						type="button"
						onClick={() =>
							callApi(
								"GET",
								"/kv",
								{ limit: kvLimit, offset: kvOffset },
								undefined,
								tab.id
							)
						}
						className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
					>
						List KV
					</button>

					<input
						value={kvKey}
						onChange={(e) => setKvKey(e.target.value)}
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						placeholder="key"
					/>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									`/kv/${encodeURIComponent(kvKey)}`,
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							Get
						</button>
						<button
							type="button"
							onClick={() => {
								try {
									callApi(
										"PUT",
										`/kv/${encodeURIComponent(kvKey)}`,
										undefined,
										JSON.parse(kvValue),
										tab.id
									);
								} catch {
									setTabError(
										tab.id,
										`${base}/kv/${encodeURIComponent(kvKey)}`,
										"PUT",
										"Invalid JSON for KV value body"
									);
								}
							}}
							className="rounded-md bg-amber-500/20 px-3 py-2 text-sm hover:bg-amber-500/30"
						>
							Put
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"DELETE",
									`/kv/${encodeURIComponent(kvKey)}`,
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
						>
							Delete
						</button>
					</div>
					<textarea
						title="KV PUT request body JSON"
						placeholder='{"value":{"ok":true}}'
						value={kvValue}
						onChange={(e) => setKvValue(e.target.value)}
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
					/>
				</section>
			);
		case "search-tools":
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">Search Tools</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<select
							title="Search provider"
							value={searchProvider}
							onChange={(e) => setSearchProvider(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						>
							<option value="news">news</option>
							<option value="ollama">ollama</option>
							<option value="bing">bing</option>
							<option value="google">google</option>
						</select>
						<input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="query"
						/>
					</div>
					<button
						type="button"
						onClick={() => {
							const query =
								searchProvider === "bing" ||
								searchProvider === "google"
									? { query: searchQuery, first: 0, count: 5 }
									: { query: searchQuery };
							callApi(
								"GET",
								`/tools/search/${searchProvider}`,
								query,
								undefined,
								tab.id
							);
						}}
						className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
					>
						Run search
					</button>
				</section>
			);
		default:
			return null;
	}
}
