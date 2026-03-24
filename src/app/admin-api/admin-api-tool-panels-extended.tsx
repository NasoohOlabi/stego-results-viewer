"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
	WORKFLOW_COMMAND_OPTIONS,
	type WorkflowCommand
} from "./types";
import {
	getWorkflowRunAllTemplate,
	getWorkflowTemplate,
	parsePostIdsFromMultiline
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

const RECEIVER_PATH = "/workflows/receiver";

function ReceiverWorkflowPanel(props: {
	tabId: string;
	base: string;
	receiverPostJson: string;
	setReceiverPostJson: (value: string) => void;
	receiverSenderUserId: string;
	setReceiverSenderUserId: (value: string) => void;
	receiverCompressedBitstring: string;
	setReceiverCompressedBitstring: (value: string) => void;
	receiverStream: boolean;
	setReceiverStream: (value: boolean) => void;
	receiverPreviewUseCache: boolean;
	setReceiverPreviewUseCache: (value: boolean) => void;
	receiverMaxPaddingBits: string;
	setReceiverMaxPaddingBits: (value: string) => void;
	validateUseTermsCache: boolean;
	setValidateUseTermsCache: (value: boolean) => void;
	validatePersistTermsCache: boolean;
	setValidatePersistTermsCache: (value: boolean) => void;
	validateUseFetchCache: boolean;
	setValidateUseFetchCache: (value: boolean) => void;
	validateAllowAnglesFallback: boolean;
	setValidateAllowAnglesFallback: (value: boolean) => void;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
}) {
	const {
		tabId,
		base,
		receiverPostJson,
		setReceiverPostJson,
		receiverSenderUserId,
		setReceiverSenderUserId,
		receiverCompressedBitstring,
		setReceiverCompressedBitstring,
		receiverStream,
		setReceiverStream,
		receiverPreviewUseCache,
		setReceiverPreviewUseCache,
		receiverMaxPaddingBits,
		setReceiverMaxPaddingBits,
		validateUseTermsCache,
		setValidateUseTermsCache,
		validatePersistTermsCache,
		setValidatePersistTermsCache,
		validateUseFetchCache,
		setValidateUseFetchCache,
		validateAllowAnglesFallback,
		setValidateAllowAnglesFallback,
		callApi,
		setTabError
	} = props;

	const send = () => {
		const sender = receiverSenderUserId.trim();
		if (!sender) {
			setTabError(tabId, `${base}${RECEIVER_PATH}`, "POST", "sender_user_id is required");
			return;
		}
		let post: unknown;
		try {
			post = JSON.parse(receiverPostJson) as unknown;
		} catch {
			setTabError(
				tabId,
				`${base}${RECEIVER_PATH}`,
				"POST",
				"post must be valid JSON object"
			);
			return;
		}
		if (!post || typeof post !== "object" || Array.isArray(post)) {
			setTabError(
				tabId,
				`${base}${RECEIVER_PATH}`,
				"POST",
				"post must be a JSON object"
			);
			return;
		}
		const body: Record<string, unknown> = {
			post,
			sender_user_id: sender,
			stream: receiverStream,
			use_cache: receiverPreviewUseCache,
			use_terms_cache: validateUseTermsCache,
			persist_terms_cache: validatePersistTermsCache,
			use_fetch_cache: validateUseFetchCache,
			allow_angles_fallback: validateAllowAnglesFallback
		};
		const cbs = receiverCompressedBitstring.trim();
		if (cbs) body.compressed_bitstring = cbs;
		const mpb = receiverMaxPaddingBits.trim();
		if (mpb.length > 0) {
			const n = Number(mpb);
			if (!Number.isInteger(n) || n < 0) {
				setTabError(
					tabId,
					`${base}${RECEIVER_PATH}`,
					"POST",
					"max_padding_bits must be a non-negative integer"
				);
				return;
			}
			body.max_padding_bits = n;
		}
		void callApi("POST", RECEIVER_PATH, undefined, body, tabId);
	};

	return (
		<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
			<h2 className="text-lg font-semibold">Receiver workflow</h2>
			<p className="text-xs text-white/60">
				<code className="text-white/80">POST {RECEIVER_PATH}</code>
				— locate stego comment by <code className="text-white/80">sender_user_id</code>
				, strip, preview → research → gen-angles → decode → payload recovery. Optional{" "}
				<code className="text-white/80">compressed_bitstring</code>{" "}
				(sender <code className="text-white/80">embedding.compression.compressed</code>
				) for exact recovery; omit for brute-force + round-trip (may be ambiguous).
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
				<input
					value={receiverSenderUserId}
					onChange={(e) => setReceiverSenderUserId(e.target.value)}
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono"
					placeholder="sender_user_id (required)"
				/>
				<button
					type="button"
					onClick={send}
					className="rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
				>
					Run
				</button>
			</div>
			<label className="text-xs text-white/60">post (JSON object)</label>
			<textarea
				title="Receiver post JSON"
				value={receiverPostJson}
				onChange={(e) => setReceiverPostJson(e.target.value)}
				placeholder='{"id":"…","comments":[…]}'
				className="min-h-32 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
			/>
			<label className="text-xs text-white/60">
				compressed_bitstring (optional)
			</label>
			<textarea
				title="compressed_bitstring from sender embedding"
				value={receiverCompressedBitstring}
				onChange={(e) => setReceiverCompressedBitstring(e.target.value)}
				placeholder="omit for brute-force recovery"
				className="min-h-16 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
			/>
			<input
				value={receiverMaxPaddingBits}
				onChange={(e) => setReceiverMaxPaddingBits(e.target.value)}
				className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono"
				placeholder="max_padding_bits (optional int)"
			/>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs text-white/70">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={receiverStream}
						onChange={(e) => setReceiverStream(e.target.checked)}
					/>
					stream
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={receiverPreviewUseCache}
						onChange={(e) => setReceiverPreviewUseCache(e.target.checked)}
					/>
					use_cache (preview_post)
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={validateUseTermsCache}
						onChange={(e) => setValidateUseTermsCache(e.target.checked)}
					/>
					use_terms_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={validatePersistTermsCache}
						onChange={(e) => setValidatePersistTermsCache(e.target.checked)}
					/>
					persist_terms_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={validateUseFetchCache}
						onChange={(e) => setValidateUseFetchCache(e.target.checked)}
					/>
					use_fetch_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						checked={validateAllowAnglesFallback}
						onChange={(e) => setValidateAllowAnglesFallback(e.target.checked)}
					/>
					allow_angles_fallback
				</label>
			</div>
		</section>
	);
}

const BATCH_ANGLES_DETERMINISM_PATH = "/workflows/batch-angles-determinism";

function BatchAnglesDeterminismPanel(props: {
	tabId: string;
	base: string;
	batchAnglesDeterminismPostIds: string;
	setBatchAnglesDeterminismPostIds: (value: string) => void;
	batchAnglesDeterminismStep: string;
	setBatchAnglesDeterminismStep: (value: string) => void;
	batchAnglesDeterminismStream: boolean;
	setBatchAnglesDeterminismStream: (value: boolean) => void;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
}) {
	const {
		tabId,
		base,
		batchAnglesDeterminismPostIds,
		setBatchAnglesDeterminismPostIds,
		batchAnglesDeterminismStep,
		setBatchAnglesDeterminismStep,
		batchAnglesDeterminismStream,
		setBatchAnglesDeterminismStream,
		callApi,
		setTabError
	} = props;

	const send = () => {
		const postIds = parsePostIdsFromMultiline(batchAnglesDeterminismPostIds);
		if (postIds.length === 0) {
			setTabError(
				tabId,
				`${base}${BATCH_ANGLES_DETERMINISM_PATH}`,
				"POST",
				"At least one post_id is required (one per line or comma-separated)"
			);
			return;
		}
		const stepTrimmed = batchAnglesDeterminismStep.trim();
		void callApi(
			"POST",
			BATCH_ANGLES_DETERMINISM_PATH,
			undefined,
			{
				post_ids: postIds,
				...(stepTrimmed ? { step: stepTrimmed } : {}),
				stream: batchAnglesDeterminismStream
			},
			tabId
		);
	};

	const previewCount = parsePostIdsFromMultiline(batchAnglesDeterminismPostIds)
		.length;

	return (
		<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
			<h2 className="text-lg font-semibold">Batch angles determinism</h2>
			<p className="text-xs text-white/60">
				<code className="text-white/80">
					POST {BATCH_ANGLES_DETERMINISM_PATH}
				</code>
				— runs two uncached angle analyses per post and compares normalized
				results (hashes, per-post identical flag). Optional{" "}
				<code className="text-white/80">stream</code> for SSE like other
				workflows.
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
				<textarea
					title="post_ids — one per line or comma-separated"
					placeholder={"post_id_one\npost_id_two"}
					value={batchAnglesDeterminismPostIds}
					onChange={(e) => setBatchAnglesDeterminismPostIds(e.target.value)}
					className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
				/>
				<button
					type="button"
					onClick={send}
					className="h-fit rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
				>
					Run
				</button>
			</div>
			<p className="text-[11px] text-white/45">
				Parsed <span className="text-white/70">{previewCount}</span> id
				{previewCount === 1 ? "" : "s"} from the box above.
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<input
					value={batchAnglesDeterminismStep}
					onChange={(e) => setBatchAnglesDeterminismStep(e.target.value)}
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm font-mono"
					placeholder="step (default: angles-step)"
				/>
				<label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
					<input
						type="checkbox"
						checked={batchAnglesDeterminismStream}
						onChange={(e) =>
							setBatchAnglesDeterminismStream(e.target.checked)
						}
					/>
					stream (SSE)
				</label>
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
		batchAnglesDeterminismPostIds,
		setBatchAnglesDeterminismPostIds,
		batchAnglesDeterminismStep,
		setBatchAnglesDeterminismStep,
		batchAnglesDeterminismStream,
		setBatchAnglesDeterminismStream,
		receiverPostJson,
		setReceiverPostJson,
		receiverSenderUserId,
		setReceiverSenderUserId,
		receiverCompressedBitstring,
		setReceiverCompressedBitstring,
		receiverStream,
		setReceiverStream,
		receiverPreviewUseCache,
		setReceiverPreviewUseCache,
		receiverMaxPaddingBits,
		setReceiverMaxPaddingBits,
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
			if (tab.apiActionId === "workflows-receiver") {
				return (
					<ReceiverWorkflowPanel
						tabId={tab.id}
						base={base}
						receiverPostJson={receiverPostJson}
						setReceiverPostJson={setReceiverPostJson}
						receiverSenderUserId={receiverSenderUserId}
						setReceiverSenderUserId={setReceiverSenderUserId}
						receiverCompressedBitstring={receiverCompressedBitstring}
						setReceiverCompressedBitstring={setReceiverCompressedBitstring}
						receiverStream={receiverStream}
						setReceiverStream={setReceiverStream}
						receiverPreviewUseCache={receiverPreviewUseCache}
						setReceiverPreviewUseCache={setReceiverPreviewUseCache}
						receiverMaxPaddingBits={receiverMaxPaddingBits}
						setReceiverMaxPaddingBits={setReceiverMaxPaddingBits}
						validateUseTermsCache={validateUseTermsCache}
						setValidateUseTermsCache={setValidateUseTermsCache}
						validatePersistTermsCache={validatePersistTermsCache}
						setValidatePersistTermsCache={setValidatePersistTermsCache}
						validateUseFetchCache={validateUseFetchCache}
						setValidateUseFetchCache={setValidateUseFetchCache}
						validateAllowAnglesFallback={validateAllowAnglesFallback}
						setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
						callApi={callApi}
						setTabError={setTabError}
					/>
				);
			}
			if (tab.apiActionId === "workflows-batch-angles-determinism") {
				return (
					<BatchAnglesDeterminismPanel
						tabId={tab.id}
						base={base}
						batchAnglesDeterminismPostIds={batchAnglesDeterminismPostIds}
						setBatchAnglesDeterminismPostIds={
							setBatchAnglesDeterminismPostIds
						}
						batchAnglesDeterminismStep={batchAnglesDeterminismStep}
						setBatchAnglesDeterminismStep={setBatchAnglesDeterminismStep}
						batchAnglesDeterminismStream={batchAnglesDeterminismStream}
						setBatchAnglesDeterminismStream={
							setBatchAnglesDeterminismStream
						}
						callApi={callApi}
						setTabError={setTabError}
					/>
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
