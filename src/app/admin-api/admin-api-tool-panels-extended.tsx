"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";
import type { CallApiFn, SetTabErrorFn } from "./tab-actions";
import {
	type TriggerAnglesMode,
	WORKFLOW_COMMAND_OPTIONS,
	type WorkflowCommand,
} from "./types";
import {
	buildTriggerAnglesRequest,
	getWorkflowRunAllTemplate,
	getWorkflowTemplate,
	parsePostIdsFromMultiline,
} from "./utils";

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
		base,
	} = props;

	const endpointMap = {
		"workflows-validate-post": "/workflows/validate-post",
		"protocol-gen-terms": "/tools/protocol/gen-terms",
		"protocol-data-load-preview": "/tools/protocol/data-load-preview",
		"protocol-research-preview": "/tools/protocol/research-preview",
		"protocol-angles-preview": "/tools/protocol/angles-preview",
	} as const;
	const endpoint = endpointMap[apiActionId];

	const titleMap = {
		"workflows-validate-post": "Validate Post Workflow",
		"protocol-gen-terms": "Protocol: Generate Terms",
		"protocol-data-load-preview": "Protocol: Data-load Preview",
		"protocol-research-preview": "Protocol: Research Preview",
		"protocol-angles-preview": "Protocol: Angles Preview",
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
					allow_angles_fallback: validateAllowAnglesFallback,
				};
				break;
			case "protocol-gen-terms":
				body = {
					post_id: postId,
					use_cache: protocolUseCache,
					persist_cache: protocolPersistCache,
				};
				break;
			case "protocol-data-load-preview":
				body = {
					post_id: postId,
					use_cache: protocolUseCache,
					include_post: protocolIncludePost,
				};
				break;
			case "protocol-research-preview":
				body = {
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					include_post: protocolIncludePost,
				};
				break;
			case "protocol-angles-preview":
				body = {
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					allow_angles_fallback: validateAllowAnglesFallback,
					include_post: protocolIncludePost,
				};
				break;
		}
		void callApi("POST", endpoint, undefined, body, tabId);
	};

	return (
		<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 className="font-semibold text-lg">{titleMap[apiActionId]}</h2>
			<p className="text-white/60 text-xs">
				<code className="text-white/80">POST {endpoint}</code>
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
				<input
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
					onChange={(e) => setValidatePostId(e.target.value)}
					placeholder="post_id (required)"
					value={validatePostId}
				/>
				<button
					className="rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
					onClick={send}
					type="button"
				>
					Run
				</button>
			</div>
			<div className="grid grid-cols-1 gap-2 text-white/70 text-xs sm:grid-cols-2 lg:grid-cols-3">
				{apiActionId === "workflows-validate-post" ? (
					<label className="flex cursor-pointer items-center gap-2">
						<input
							checked={validatePostStream}
							onChange={(e) => setValidatePostStream(e.target.checked)}
							type="checkbox"
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
								checked={validateUseTermsCache}
								onChange={(e) => setValidateUseTermsCache(e.target.checked)}
								type="checkbox"
							/>
							use_terms_cache
						</label>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								checked={validatePersistTermsCache}
								onChange={(e) => setValidatePersistTermsCache(e.target.checked)}
								type="checkbox"
							/>
							persist_terms_cache
						</label>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								checked={validateUseFetchCache}
								onChange={(e) => setValidateUseFetchCache(e.target.checked)}
								type="checkbox"
							/>
							use_fetch_cache
						</label>
					</>
				) : null}
				{apiActionId === "workflows-validate-post" ||
				apiActionId === "protocol-angles-preview" ? (
					<label className="flex cursor-pointer items-center gap-2">
						<input
							checked={validateAllowAnglesFallback}
							onChange={(e) => setValidateAllowAnglesFallback(e.target.checked)}
							type="checkbox"
						/>
						allow_angles_fallback
					</label>
				) : null}
				{apiActionId === "protocol-gen-terms" ||
				apiActionId === "protocol-data-load-preview" ? (
					<>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								checked={protocolUseCache}
								onChange={(e) => setProtocolUseCache(e.target.checked)}
								type="checkbox"
							/>
							use_cache
						</label>
						{apiActionId === "protocol-gen-terms" ? (
							<label className="flex cursor-pointer items-center gap-2">
								<input
									checked={protocolPersistCache}
									onChange={(e) => setProtocolPersistCache(e.target.checked)}
									type="checkbox"
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
							checked={protocolIncludePost}
							onChange={(e) => setProtocolIncludePost(e.target.checked)}
							type="checkbox"
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
		setTabError,
	} = props;

	const send = () => {
		const sender = receiverSenderUserId.trim();
		if (!sender) {
			setTabError(
				tabId,
				`${base}${RECEIVER_PATH}`,
				"POST",
				"sender_user_id is required",
			);
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
				"post must be valid JSON object",
			);
			return;
		}
		if (!post || typeof post !== "object" || Array.isArray(post)) {
			setTabError(
				tabId,
				`${base}${RECEIVER_PATH}`,
				"POST",
				"post must be a JSON object",
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
			allow_angles_fallback: validateAllowAnglesFallback,
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
					"max_padding_bits must be a non-negative integer",
				);
				return;
			}
			body.max_padding_bits = n;
		}
		void callApi("POST", RECEIVER_PATH, undefined, body, tabId);
	};

	return (
		<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 className="font-semibold text-lg">Receiver workflow</h2>
			<p className="text-white/60 text-xs">
				<code className="text-white/80">POST {RECEIVER_PATH}</code>— locate
				stego comment by <code className="text-white/80">sender_user_id</code>,
				strip, preview → research → gen-angles → decode → payload recovery.
				Optional <code className="text-white/80">compressed_bitstring</code>{" "}
				(sender{" "}
				<code className="text-white/80">embedding.compression.compressed</code>)
				for exact recovery; omit for brute-force + round-trip (may be
				ambiguous).
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
				<input
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
					onChange={(e) => setReceiverSenderUserId(e.target.value)}
					placeholder="sender_user_id (required)"
					value={receiverSenderUserId}
				/>
				<button
					className="rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
					onClick={send}
					type="button"
				>
					Run
				</button>
			</div>
			<p className="text-white/60 text-xs">post (JSON object)</p>
			<textarea
				className="min-h-32 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
				onChange={(e) => setReceiverPostJson(e.target.value)}
				placeholder='{"id":"…","comments":[…]}'
				title="Receiver post JSON"
				value={receiverPostJson}
			/>
			<p className="text-white/60 text-xs">compressed_bitstring (optional)</p>
			<textarea
				className="min-h-16 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
				onChange={(e) => setReceiverCompressedBitstring(e.target.value)}
				placeholder="omit for brute-force recovery"
				title="compressed_bitstring from sender embedding"
				value={receiverCompressedBitstring}
			/>
			<input
				className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
				onChange={(e) => setReceiverMaxPaddingBits(e.target.value)}
				placeholder="max_padding_bits (optional int)"
				value={receiverMaxPaddingBits}
			/>
			<div className="grid grid-cols-1 gap-2 text-white/70 text-xs sm:grid-cols-2 lg:grid-cols-3">
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={receiverStream}
						onChange={(e) => setReceiverStream(e.target.checked)}
						type="checkbox"
					/>
					stream
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={receiverPreviewUseCache}
						onChange={(e) => setReceiverPreviewUseCache(e.target.checked)}
						type="checkbox"
					/>
					use_cache (preview_post)
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={validateUseTermsCache}
						onChange={(e) => setValidateUseTermsCache(e.target.checked)}
						type="checkbox"
					/>
					use_terms_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={validatePersistTermsCache}
						onChange={(e) => setValidatePersistTermsCache(e.target.checked)}
						type="checkbox"
					/>
					persist_terms_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={validateUseFetchCache}
						onChange={(e) => setValidateUseFetchCache(e.target.checked)}
						type="checkbox"
					/>
					use_fetch_cache
				</label>
				<label className="flex cursor-pointer items-center gap-2">
					<input
						checked={validateAllowAnglesFallback}
						onChange={(e) => setValidateAllowAnglesFallback(e.target.checked)}
						type="checkbox"
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
		setTabError,
	} = props;

	const send = () => {
		const postIds = parsePostIdsFromMultiline(batchAnglesDeterminismPostIds);
		if (postIds.length === 0) {
			setTabError(
				tabId,
				`${base}${BATCH_ANGLES_DETERMINISM_PATH}`,
				"POST",
				"At least one post_id is required (one per line or comma-separated)",
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
				stream: batchAnglesDeterminismStream,
			},
			tabId,
		);
	};

	const previewCount = parsePostIdsFromMultiline(
		batchAnglesDeterminismPostIds,
	).length;

	return (
		<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 className="font-semibold text-lg">Batch angles determinism</h2>
			<p className="text-white/60 text-xs">
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
					className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
					onChange={(e) => setBatchAnglesDeterminismPostIds(e.target.value)}
					placeholder={"post_id_one\npost_id_two"}
					title="post_ids — one per line or comma-separated"
					value={batchAnglesDeterminismPostIds}
				/>
				<button
					className="h-fit rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
					onClick={send}
					type="button"
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
					className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
					onChange={(e) => setBatchAnglesDeterminismStep(e.target.value)}
					placeholder="step (default: angles-step)"
					value={batchAnglesDeterminismStep}
				/>
				<label className="flex cursor-pointer items-center gap-2 text-white/70 text-xs">
					<input
						checked={batchAnglesDeterminismStream}
						onChange={(e) => setBatchAnglesDeterminismStream(e.target.checked)}
						type="checkbox"
					/>
					stream (SSE)
				</label>
			</div>
		</section>
	);
}

function TriggerAnglesPanel(props: {
	tabId: string;
	base: string;
	triggerAnglesMode: TriggerAnglesMode;
	setTriggerAnglesMode: (value: TriggerAnglesMode) => void;
	genAnglesCount: string;
	setGenAnglesCount: (value: string) => void;
	genAnglesOffset: string;
	setGenAnglesOffset: (value: string) => void;
	genAnglesStream: boolean;
	setGenAnglesStream: (value: boolean) => void;
	stegoReceiverLiveSenderUserId: string;
	setStegoReceiverLiveSenderUserId: (value: string) => void;
	stegoReceiverLivePostId: string;
	setStegoReceiverLivePostId: (value: string) => void;
	stegoReceiverLivePayload: string;
	setStegoReceiverLivePayload: (value: string) => void;
	stegoReceiverLiveTag: string;
	setStegoReceiverLiveTag: (value: string) => void;
	stegoReceiverLiveListOffset: string;
	setStegoReceiverLiveListOffset: (value: string) => void;
	stegoReceiverLiveSimulationRoot: string;
	setStegoReceiverLiveSimulationRoot: (value: string) => void;
	stegoReceiverLiveCompressedBitstring: string;
	setStegoReceiverLiveCompressedBitstring: (value: string) => void;
	stegoReceiverLiveAllowFallback: boolean;
	setStegoReceiverLiveAllowFallback: (value: boolean) => void;
	stegoReceiverLiveMaxPaddingBits: string;
	setStegoReceiverLiveMaxPaddingBits: (value: string) => void;
	stegoReceiverLiveMaxPostAttempts: string;
	setStegoReceiverLiveMaxPostAttempts: (value: string) => void;
	stegoReceiverLiveStream: boolean;
	setStegoReceiverLiveStream: (value: boolean) => void;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
}) {
	const {
		tabId,
		base,
		triggerAnglesMode,
		setTriggerAnglesMode,
		genAnglesCount,
		setGenAnglesCount,
		genAnglesOffset,
		setGenAnglesOffset,
		genAnglesStream,
		setGenAnglesStream,
		stegoReceiverLiveSenderUserId,
		setStegoReceiverLiveSenderUserId,
		stegoReceiverLivePostId,
		setStegoReceiverLivePostId,
		stegoReceiverLivePayload,
		setStegoReceiverLivePayload,
		stegoReceiverLiveTag,
		setStegoReceiverLiveTag,
		stegoReceiverLiveListOffset,
		setStegoReceiverLiveListOffset,
		stegoReceiverLiveSimulationRoot,
		setStegoReceiverLiveSimulationRoot,
		stegoReceiverLiveCompressedBitstring,
		setStegoReceiverLiveCompressedBitstring,
		stegoReceiverLiveAllowFallback,
		setStegoReceiverLiveAllowFallback,
		stegoReceiverLiveMaxPaddingBits,
		setStegoReceiverLiveMaxPaddingBits,
		stegoReceiverLiveMaxPostAttempts,
		setStegoReceiverLiveMaxPostAttempts,
		stegoReceiverLiveStream,
		setStegoReceiverLiveStream,
		callApi,
		setTabError,
	} = props;

	const send = () => {
		const built = buildTriggerAnglesRequest({
			mode: triggerAnglesMode,
			genAnglesCount,
			genAnglesOffset,
			genAnglesStream,
			stegoReceiverLiveSenderUserId,
			stegoReceiverLivePostId,
			stegoReceiverLivePayload,
			stegoReceiverLiveTag,
			stegoReceiverLiveListOffset,
			stegoReceiverLiveSimulationRoot,
			stegoReceiverLiveCompressedBitstring,
			stegoReceiverLiveAllowFallback,
			stegoReceiverLiveMaxPaddingBits,
			stegoReceiverLiveMaxPostAttempts,
			stegoReceiverLiveStream,
		});
		if ("error" in built) {
			setTabError(tabId, `${base}(trigger angles)`, "POST", built.error);
			return;
		}
		void callApi("POST", built.path, undefined, built.body, tabId);
	};

	return (
		<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 className="font-semibold text-lg">Trigger angles</h2>
			<p className="text-white/60 text-xs">
				Endpoints that run <code className="text-white/80">gen_angles</code>{" "}
				include batch{" "}
				<code className="text-white/80">POST /workflows/gen-angles</code>, live
				stego+receiver{" "}
				<code className="text-white/80">
					POST /workflows/stego-receiver-live
				</code>{" "}
				(receiver rebuild), plus validate-post, angles-preview, receiver,
				double-process-new-post, and batch-angles-determinism elsewhere in this
				console.
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<label className="text-white/70 text-xs">
					Mode
					<select
						className="ml-2 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm"
						onChange={(e) =>
							setTriggerAnglesMode(e.target.value as TriggerAnglesMode)
						}
						title="Which workflow to call"
						value={triggerAnglesMode}
					>
						<option value="gen-angles">Batch queue (gen-angles)</option>
						<option value="stego-receiver-live">Stego + receiver live</option>
					</select>
				</label>
				<button
					className="rounded-md bg-teal-500/25 px-3 py-2 text-sm hover:bg-teal-500/35"
					onClick={send}
					type="button"
				>
					Run
				</button>
			</div>
			{triggerAnglesMode === "gen-angles" ? (
				<div className="space-y-2">
					<p className="text-white/60 text-xs">
						<code className="text-white/80">POST /workflows/gen-angles</code> —
						angles-step queue window; SSE by default when{" "}
						<code className="text-white/80">stream</code> is checked.
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setGenAnglesCount(e.target.value)}
							placeholder="count (default 1)"
							value={genAnglesCount}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setGenAnglesOffset(e.target.value)}
							placeholder="offset (default 0)"
							value={genAnglesOffset}
						/>
						<label className="flex cursor-pointer items-center gap-2 text-white/70 text-xs">
							<input
								checked={genAnglesStream}
								onChange={(e) => setGenAnglesStream(e.target.checked)}
								type="checkbox"
							/>
							stream (SSE)
						</label>
					</div>
				</div>
			) : (
				<div className="space-y-2">
					<p className="text-white/60 text-xs">
						<code className="text-white/80">
							POST /workflows/stego-receiver-live
						</code>{" "}
						— cold-receiver simulation; receiver context rebuild runs
						gen-angles. Typical:{" "}
						<code className="text-white/80">stream: true</code>.
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setStegoReceiverLiveSenderUserId(e.target.value)}
							placeholder="sender_user_id (required)"
							value={stegoReceiverLiveSenderUserId}
						/>
						<label className="flex cursor-pointer items-center gap-2 text-white/70 text-xs sm:justify-end">
							<input
								checked={stegoReceiverLiveStream}
								onChange={(e) => setStegoReceiverLiveStream(e.target.checked)}
								type="checkbox"
							/>
							stream
						</label>
					</div>
					<input
						className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
						onChange={(e) => setStegoReceiverLivePostId(e.target.value)}
						placeholder="post_id (optional)"
						value={stegoReceiverLivePostId}
					/>
					<p className="text-[11px] text-white/50">payload (optional)</p>
					<textarea
						className="min-h-14 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
						onChange={(e) => setStegoReceiverLivePayload(e.target.value)}
						placeholder="string or JSON; empty omits (API default)"
						value={stegoReceiverLivePayload}
					/>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setStegoReceiverLiveTag(e.target.value)}
							placeholder="tag (optional)"
							value={stegoReceiverLiveTag}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setStegoReceiverLiveListOffset(e.target.value)}
							placeholder="list_offset (optional, default 1)"
							value={stegoReceiverLiveListOffset}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) =>
								setStegoReceiverLiveSimulationRoot(e.target.value)
							}
							placeholder="simulation_root (optional)"
							value={stegoReceiverLiveSimulationRoot}
						/>
					</div>
					<p className="text-[11px] text-white/50">
						compressed_bitstring (optional)
					</p>
					<textarea
						className="min-h-12 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
						onChange={(e) =>
							setStegoReceiverLiveCompressedBitstring(e.target.value)
						}
						placeholder="override for decode"
						value={stegoReceiverLiveCompressedBitstring}
					/>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) =>
								setStegoReceiverLiveMaxPaddingBits(e.target.value)
							}
							placeholder="max_padding_bits (optional)"
							value={stegoReceiverLiveMaxPaddingBits}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) =>
								setStegoReceiverLiveMaxPostAttempts(e.target.value)
							}
							placeholder="max_post_attempts (optional, ≥1)"
							value={stegoReceiverLiveMaxPostAttempts}
						/>
					</div>
					<label className="flex cursor-pointer items-center gap-2 text-white/70 text-xs">
						<input
							checked={stegoReceiverLiveAllowFallback}
							onChange={(e) =>
								setStegoReceiverLiveAllowFallback(e.target.checked)
							}
							type="checkbox"
						/>
						allow_fallback
					</label>
				</div>
			)}
		</section>
	);
}

function WorkflowRunsToolPanel(props: { tabId: string; callApi: CallApiFn }) {
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
				tabId,
			);
		};
		tick();
		const id = window.setInterval(tick, autoMs);
		return () => window.clearInterval(id);
	}, [autoMs, tabId]);

	return (
		<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
			<h2 className="font-semibold text-lg">Workflow runs</h2>
			<p className="text-white/60 text-xs">
				<code className="text-white/80">GET /workflows/runs</code> — active
				workflow runs in the API process. Use{" "}
				<strong className="text-white/70">Run selected API</strong> for a
				one-shot fetch, or refresh / auto-refresh here.
			</p>
			<div className="flex flex-wrap items-center gap-2">
				<button
					className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
					onClick={() =>
						void callApi("GET", "/workflows/runs", undefined, undefined, tabId)
					}
					type="button"
				>
					Refresh now
				</button>
				<label className="inline-flex items-center gap-2 text-white/70 text-xs">
					<span>Auto-refresh</span>
					<select
						className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm"
						onChange={(e) => setAutoMs(Number(e.target.value))}
						title="Auto-refresh interval"
						value={String(autoMs)}
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
	props: AdminApiToolPanelsProps,
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
		triggerAnglesMode,
		setTriggerAnglesMode,
		genAnglesCount,
		setGenAnglesCount,
		genAnglesOffset,
		setGenAnglesOffset,
		genAnglesStream,
		setGenAnglesStream,
		stegoReceiverLiveSenderUserId,
		setStegoReceiverLiveSenderUserId,
		stegoReceiverLivePostId,
		setStegoReceiverLivePostId,
		stegoReceiverLivePayload,
		setStegoReceiverLivePayload,
		stegoReceiverLiveTag,
		setStegoReceiverLiveTag,
		stegoReceiverLiveListOffset,
		setStegoReceiverLiveListOffset,
		stegoReceiverLiveSimulationRoot,
		setStegoReceiverLiveSimulationRoot,
		stegoReceiverLiveCompressedBitstring,
		setStegoReceiverLiveCompressedBitstring,
		stegoReceiverLiveAllowFallback,
		setStegoReceiverLiveAllowFallback,
		stegoReceiverLiveMaxPaddingBits,
		setStegoReceiverLiveMaxPaddingBits,
		stegoReceiverLiveMaxPostAttempts,
		setStegoReceiverLiveMaxPostAttempts,
		stegoReceiverLiveStream,
		setStegoReceiverLiveStream,
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
		artifactsStep,
		setArtifactsStep,
		artifactsListCount,
		setArtifactsListCount,
		artifactsListOffset,
		setArtifactsListOffset,
		artifactsListTag,
		setArtifactsListTag,
		artifactsPostFilename,
		setArtifactsPostFilename,
		artifactsPostSaveBody,
		setArtifactsPostSaveBody,
		artifactsObjectFilename,
		setArtifactsObjectFilename,
		artifactsObjectBody,
		setArtifactsObjectBody,
		toolsProcessFileName,
		setToolsProcessFileName,
		toolsProcessFileStep,
		setToolsProcessFileStep,
		toolsFetchUrl,
		setToolsFetchUrl,
		toolsFetchUseCrawl4ai,
		setToolsFetchUseCrawl4ai,
		toolsSemanticText,
		setToolsSemanticText,
		toolsSemanticObjectsJson,
		setToolsSemanticObjectsJson,
		toolsSemanticN,
		setToolsSemanticN,
		toolsNeedle,
		setToolsNeedle,
		toolsHaystackJson,
		setToolsHaystackJson,
		toolsAnglesTextsJson,
		setToolsAnglesTextsJson,
		callApi,
		setTabError,
		submitWorkflowRequest,
	} = props;

	switch (tab.apiToolId) {
		case "artifacts-workflows":
			if (tab.apiActionId === "workflows-pipelines") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Workflow pipelines</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">GET /workflows/pipelines</code> —
							available pipeline commands and workflow execution endpoints.
						</p>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								void callApi(
									"GET",
									"/workflows/pipelines",
									undefined,
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							Fetch pipelines
						</button>
					</section>
				);
			}
			if (tab.apiActionId === "artifacts-posts-list") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">List artifact posts</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">GET /artifacts/posts</code>
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsStep(e.target.value)}
								placeholder="step (required)"
								value={artifactsStep}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsListTag(e.target.value)}
								placeholder="tag (optional)"
								value={artifactsListTag}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsListCount(e.target.value)}
								placeholder="count"
								value={artifactsListCount}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsListOffset(e.target.value)}
								placeholder="offset"
								value={artifactsListOffset}
							/>
						</div>
					</section>
				);
			}
			if (tab.apiActionId === "artifacts-post-get") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Get one artifact post</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">GET /artifacts/post</code>
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsStep(e.target.value)}
								placeholder="step"
								value={artifactsStep}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsPostFilename(e.target.value)}
								placeholder="post filename"
								value={artifactsPostFilename}
							/>
						</div>
					</section>
				);
			}
			if (tab.apiActionId === "artifacts-post-save") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Save artifact post</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /artifacts/post</code> — body
							must include <code className="text-white/80">id</code>.
						</p>
						<input
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setArtifactsStep(e.target.value)}
							placeholder="step (query)"
							value={artifactsStep}
						/>
						<textarea
							className="min-h-28 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
							onChange={(e) => setArtifactsPostSaveBody(e.target.value)}
							placeholder='{\n  "id": "post-id",\n  "field": "..."\n}'
							title="Post JSON body"
							value={artifactsPostSaveBody}
						/>
					</section>
				);
			}
			if (tab.apiActionId === "artifacts-object-save") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Save artifact object</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /artifacts/object</code>
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsStep(e.target.value)}
								placeholder="step"
								value={artifactsStep}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setArtifactsObjectFilename(e.target.value)}
								placeholder="filename.json"
								value={artifactsObjectFilename}
							/>
						</div>
						<textarea
							className="min-h-28 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
							onChange={(e) => setArtifactsObjectBody(e.target.value)}
							placeholder="{}"
							title="Object JSON body"
							value={artifactsObjectBody}
						/>
					</section>
				);
			}
			if (tab.apiActionId === "workflows-runs") {
				return <WorkflowRunsToolPanel callApi={callApi} tabId={tab.id} />;
			}
			if (tab.apiActionId === "workflows-receiver") {
				return (
					<ReceiverWorkflowPanel
						base={base}
						callApi={callApi}
						receiverCompressedBitstring={receiverCompressedBitstring}
						receiverMaxPaddingBits={receiverMaxPaddingBits}
						receiverPostJson={receiverPostJson}
						receiverPreviewUseCache={receiverPreviewUseCache}
						receiverSenderUserId={receiverSenderUserId}
						receiverStream={receiverStream}
						setReceiverCompressedBitstring={setReceiverCompressedBitstring}
						setReceiverMaxPaddingBits={setReceiverMaxPaddingBits}
						setReceiverPostJson={setReceiverPostJson}
						setReceiverPreviewUseCache={setReceiverPreviewUseCache}
						setReceiverSenderUserId={setReceiverSenderUserId}
						setReceiverStream={setReceiverStream}
						setTabError={setTabError}
						setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
						setValidatePersistTermsCache={setValidatePersistTermsCache}
						setValidateUseFetchCache={setValidateUseFetchCache}
						setValidateUseTermsCache={setValidateUseTermsCache}
						tabId={tab.id}
						validateAllowAnglesFallback={validateAllowAnglesFallback}
						validatePersistTermsCache={validatePersistTermsCache}
						validateUseFetchCache={validateUseFetchCache}
						validateUseTermsCache={validateUseTermsCache}
					/>
				);
			}
			if (tab.apiActionId === "workflows-batch-angles-determinism") {
				return (
					<BatchAnglesDeterminismPanel
						base={base}
						batchAnglesDeterminismPostIds={batchAnglesDeterminismPostIds}
						batchAnglesDeterminismStep={batchAnglesDeterminismStep}
						batchAnglesDeterminismStream={batchAnglesDeterminismStream}
						callApi={callApi}
						setBatchAnglesDeterminismPostIds={setBatchAnglesDeterminismPostIds}
						setBatchAnglesDeterminismStep={setBatchAnglesDeterminismStep}
						setBatchAnglesDeterminismStream={setBatchAnglesDeterminismStream}
						setTabError={setTabError}
						tabId={tab.id}
					/>
				);
			}
			if (tab.apiActionId === "workflows-trigger-angles") {
				return (
					<TriggerAnglesPanel
						base={base}
						callApi={callApi}
						genAnglesCount={genAnglesCount}
						genAnglesOffset={genAnglesOffset}
						genAnglesStream={genAnglesStream}
						setGenAnglesCount={setGenAnglesCount}
						setGenAnglesOffset={setGenAnglesOffset}
						setGenAnglesStream={setGenAnglesStream}
						setStegoReceiverLiveAllowFallback={
							setStegoReceiverLiveAllowFallback
						}
						setStegoReceiverLiveCompressedBitstring={
							setStegoReceiverLiveCompressedBitstring
						}
						setStegoReceiverLiveListOffset={setStegoReceiverLiveListOffset}
						setStegoReceiverLiveMaxPaddingBits={
							setStegoReceiverLiveMaxPaddingBits
						}
						setStegoReceiverLiveMaxPostAttempts={
							setStegoReceiverLiveMaxPostAttempts
						}
						setStegoReceiverLivePayload={setStegoReceiverLivePayload}
						setStegoReceiverLivePostId={setStegoReceiverLivePostId}
						setStegoReceiverLiveSenderUserId={setStegoReceiverLiveSenderUserId}
						setStegoReceiverLiveSimulationRoot={
							setStegoReceiverLiveSimulationRoot
						}
						setStegoReceiverLiveStream={setStegoReceiverLiveStream}
						setStegoReceiverLiveTag={setStegoReceiverLiveTag}
						setTabError={setTabError}
						setTriggerAnglesMode={setTriggerAnglesMode}
						stegoReceiverLiveAllowFallback={stegoReceiverLiveAllowFallback}
						stegoReceiverLiveCompressedBitstring={
							stegoReceiverLiveCompressedBitstring
						}
						stegoReceiverLiveListOffset={stegoReceiverLiveListOffset}
						stegoReceiverLiveMaxPaddingBits={stegoReceiverLiveMaxPaddingBits}
						stegoReceiverLiveMaxPostAttempts={stegoReceiverLiveMaxPostAttempts}
						stegoReceiverLivePayload={stegoReceiverLivePayload}
						stegoReceiverLivePostId={stegoReceiverLivePostId}
						stegoReceiverLiveSenderUserId={stegoReceiverLiveSenderUserId}
						stegoReceiverLiveSimulationRoot={stegoReceiverLiveSimulationRoot}
						stegoReceiverLiveStream={stegoReceiverLiveStream}
						stegoReceiverLiveTag={stegoReceiverLiveTag}
						tabId={tab.id}
						triggerAnglesMode={triggerAnglesMode}
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
						apiActionId={tab.apiActionId}
						base={base}
						callApi={callApi}
						protocolIncludePost={protocolIncludePost}
						protocolPersistCache={protocolPersistCache}
						protocolUseCache={protocolUseCache}
						setProtocolIncludePost={setProtocolIncludePost}
						setProtocolPersistCache={setProtocolPersistCache}
						setProtocolUseCache={setProtocolUseCache}
						setTabError={setTabError}
						setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
						setValidatePersistTermsCache={setValidatePersistTermsCache}
						setValidatePostId={setValidatePostId}
						setValidatePostStream={setValidatePostStream}
						setValidateUseFetchCache={setValidateUseFetchCache}
						setValidateUseTermsCache={setValidateUseTermsCache}
						tabId={tab.id}
						validateAllowAnglesFallback={validateAllowAnglesFallback}
						validatePersistTermsCache={validatePersistTermsCache}
						validatePostId={validatePostId}
						validatePostStream={validatePostStream}
						validateUseFetchCache={validateUseFetchCache}
						validateUseTermsCache={validateUseTermsCache}
					/>
				);
			}
			return (
				<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 className="font-semibold text-lg">Artifacts + Workflows</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<select
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => {
								const next = e.target.value as WorkflowCommand;
								setWorkflowCommand(next);
								setWorkflowBody(getWorkflowTemplate(next));
							}}
							title="Workflow command"
							value={workflowCommand}
						>
							{WORKFLOW_COMMAND_OPTIONS.map((cmd) => (
								<option key={cmd} value={cmd}>
									{cmd}
								</option>
							))}
						</select>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setArtifactTag(e.target.value)}
							placeholder="tag (optional)"
							value={artifactTag}
						/>
					</div>
					{workflowCommand === "stego" ? (
						<div className="space-y-1">
							<p className="text-white/60 text-xs">
								Payload (optional — string or JSON; empty omits and uses API
								default)
							</p>
							<textarea
								className="min-h-18 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
								onChange={(e) => setStegoPayload(e.target.value)}
								placeholder='e.g. hello world or {"k":"v"}'
								title="Stego secret payload"
								value={stegoPayload}
							/>
						</div>
					) : null}
					<p className="text-white/60 text-xs">
						Generic runner: body JSON (no <code>command</code> required inside —
						it is set from the dropdown) plus optional{" "}
						<code>stream: false</code>.{" "}
						<code>POST {WORKFLOW_ENDPOINT_PATH}</code> with{" "}
						<code>command: {workflowCommand}</code>.
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
						<button
							className="rounded-md bg-violet-500/20 px-3 py-2 text-sm hover:bg-violet-500/30"
							onClick={() => {
								setWorkflowBody(getWorkflowTemplate(workflowCommand));
								if (workflowCommand === "stego") {
									setStegoPayload("hello world");
								}
							}}
							type="button"
						>
							Fill sample body
						</button>
						<button
							className="rounded-md bg-fuchsia-500/20 px-3 py-2 text-sm hover:bg-fuchsia-500/30 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={workflowCommand !== "stego"}
							onClick={() => {
								setWorkflowBody(getWorkflowRunAllTemplate(workflowCommand));
								if (workflowCommand === "stego") {
									setStegoPayload("hello world");
								}
							}}
							type="button"
						>
							Fill run-all sample
						</button>
						<button
							className="rounded-md bg-indigo-500/20 px-3 py-2 text-sm hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={workflowCommand !== "stego"}
							onClick={() => {
								void submitWorkflowRequest(tab.id, { forceRunAll: true });
							}}
							type="button"
						>
							Run all now
						</button>
						<button
							className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
							onClick={() => {
								void submitWorkflowRequest(tab.id);
							}}
							type="button"
						>
							Send request
						</button>
					</div>
					<p className="text-[11px] text-white/50">
						Tag field is auto-injected for stego requests.
					</p>
					<textarea
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
						onChange={(e) => setWorkflowBody(e.target.value)}
						placeholder='{"count":3}'
						title="Workflow request body JSON"
						value={workflowBody}
					/>
				</section>
			);
		case "kv-store":
			return (
				<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 className="font-semibold text-lg">KV Store</h2>
					<div className="grid grid-cols-2 gap-2">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setKvLimit(e.target.value)}
							placeholder="limit"
							value={kvLimit}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setKvOffset(e.target.value)}
							placeholder="offset"
							value={kvOffset}
						/>
					</div>
					<button
						className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						onClick={() =>
							callApi(
								"GET",
								"/kv",
								{ limit: kvLimit, offset: kvOffset },
								undefined,
								tab.id,
							)
						}
						type="button"
					>
						List KV
					</button>

					<input
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						onChange={(e) => setKvKey(e.target.value)}
						placeholder="key"
						value={kvKey}
					/>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi(
									"GET",
									`/kv/${encodeURIComponent(kvKey)}`,
									undefined,
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							Get
						</button>
						<button
							className="rounded-md bg-amber-500/20 px-3 py-2 text-sm hover:bg-amber-500/30"
							onClick={() => {
								try {
									callApi(
										"PUT",
										`/kv/${encodeURIComponent(kvKey)}`,
										undefined,
										JSON.parse(kvValue),
										tab.id,
									);
								} catch {
									setTabError(
										tab.id,
										`${base}/kv/${encodeURIComponent(kvKey)}`,
										"PUT",
										"Invalid JSON for KV value body",
									);
								}
							}}
							type="button"
						>
							Put
						</button>
						<button
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							onClick={() =>
								callApi(
									"DELETE",
									`/kv/${encodeURIComponent(kvKey)}`,
									undefined,
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							Delete
						</button>
					</div>
					<textarea
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
						onChange={(e) => setKvValue(e.target.value)}
						placeholder='{"value":{"ok":true}}'
						title="KV PUT request body JSON"
						value={kvValue}
					/>
				</section>
			);
		case "search-tools":
			if (tab.apiActionId === "search-run") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Provider search</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">GET /tools/search/…</code>
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<select
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								onChange={(e) => setSearchProvider(e.target.value)}
								title="Search provider"
								value={searchProvider}
							>
								<option value="news">news</option>
								<option value="ollama">ollama</option>
								<option value="bing">bing</option>
								<option value="google">google</option>
							</select>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="query"
								value={searchQuery}
							/>
						</div>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() => {
								const query =
									searchProvider === "bing" || searchProvider === "google"
										? { query: searchQuery, first: 0, count: 5 }
										: { query: searchQuery };
								callApi(
									"GET",
									`/tools/search/${searchProvider}`,
									query,
									undefined,
									tab.id,
								);
							}}
							type="button"
						>
							Run search
						</button>
					</section>
				);
			}
			if (tab.apiActionId === "tools-process-file") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Process file</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /tools/process-file</code>
						</p>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setToolsProcessFileName(e.target.value)}
								placeholder="name (stem)"
								value={toolsProcessFileName}
							/>
							<input
								className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
								onChange={(e) => setToolsProcessFileStep(e.target.value)}
								placeholder="step"
								value={toolsProcessFileStep}
							/>
						</div>
					</section>
				);
			}
			if (tab.apiActionId === "tools-fetch-url") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Fetch URL</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /tools/fetch-url</code>
						</p>
						<input
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setToolsFetchUrl(e.target.value)}
							placeholder="https://…"
							value={toolsFetchUrl}
						/>
						<label className="flex cursor-pointer items-center gap-2 text-white/70 text-xs">
							<input
								checked={toolsFetchUseCrawl4ai}
								onChange={(e) => setToolsFetchUseCrawl4ai(e.target.checked)}
								type="checkbox"
							/>
							use_crawl4ai
						</label>
					</section>
				);
			}
			if (tab.apiActionId === "tools-semantic-search") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Semantic search</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /tools/semantic/search</code>
						</p>
						<input
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setToolsSemanticText(e.target.value)}
							placeholder="text"
							value={toolsSemanticText}
						/>
						<p className="text-white/50 text-xs">objects (JSON)</p>
						<textarea
							className="min-h-20 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
							onChange={(e) => setToolsSemanticObjectsJson(e.target.value)}
							placeholder="[]"
							title="objects JSON"
							value={toolsSemanticObjectsJson}
						/>
						<input
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm"
							onChange={(e) => setToolsSemanticN(e.target.value)}
							placeholder="n (optional)"
							value={toolsSemanticN}
						/>
					</section>
				);
			}
			if (tab.apiActionId === "tools-semantic-needle") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Semantic needle</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /tools/semantic/needle</code>
						</p>
						<input
							className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setToolsNeedle(e.target.value)}
							placeholder="needle"
							value={toolsNeedle}
						/>
						<p className="text-white/50 text-xs">
							haystack (JSON string array)
						</p>
						<textarea
							className="min-h-24 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
							onChange={(e) => setToolsHaystackJson(e.target.value)}
							placeholder='["a","b"]'
							title="haystack JSON array"
							value={toolsHaystackJson}
						/>
					</section>
				);
			}
			if (tab.apiActionId === "tools-angles-analyze") {
				return (
					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<h2 className="font-semibold text-lg">Angles analyze</h2>
						<p className="text-white/60 text-xs">
							<code className="text-white/80">POST /tools/angles/analyze</code>
						</p>
						<p className="text-white/50 text-xs">texts (JSON string array)</p>
						<textarea
							className="min-h-28 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
							onChange={(e) => setToolsAnglesTextsJson(e.target.value)}
							placeholder='["paragraph one","paragraph two"]'
							title="texts JSON"
							value={toolsAnglesTextsJson}
						/>
					</section>
				);
			}
			return null;
		default:
			return null;
	}
}
