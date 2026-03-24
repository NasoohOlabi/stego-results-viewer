import type {
	ApiResponseView,
	ApiWorkspaceTab,
	HttpMethod,
	WorkflowCommand,
} from "./types";
import { parsePostIdsFromMultiline, parseStegoPayloadInput } from "./utils";

export type CallApiFn = (
	method: HttpMethod,
	path: string,
	query?: Record<string, string | number | boolean | undefined>,
	body?: unknown,
	tabId?: string,
) => Promise<{ ok: boolean; payload: unknown } | null>;

export type SetTabErrorFn = (
	tabId: string,
	endpoint: string,
	method: HttpMethod,
	message: string,
	request?: ApiResponseView["request"],
) => void;

const WORKFLOW_PATH = "/workflows/run";

export async function submitWorkflowRequest(ctx: {
	tabId: string;
	base: string;
	workflowBody: string;
	workflowCommand: WorkflowCommand;
	artifactTag: string;
	stegoPayload: string;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
	options?: { forceRunAll?: boolean };
}): Promise<void> {
	const {
		tabId,
		base,
		workflowBody,
		workflowCommand,
		artifactTag,
		stegoPayload,
		callApi,
		setTabError,
		options,
	} = ctx;
	const forceRunAll = options?.forceRunAll ?? false;
	try {
		const parsed = JSON.parse(workflowBody) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			setTabError(
				tabId,
				`${base}${WORKFLOW_PATH}`,
				"POST",
				"Workflow body must be a JSON object",
			);
			return;
		}

		if (forceRunAll && workflowCommand !== "stego") {
			setTabError(
				tabId,
				`${base}${WORKFLOW_PATH}`,
				"POST",
				"Run-all is only supported for command=stego",
			);
			return;
		}

		const baseFields = { ...(parsed as Record<string, unknown>) };
		if (workflowCommand === "stego") {
			const fromPayloadField = parseStegoPayloadInput(stegoPayload);
			if (fromPayloadField !== undefined) {
				baseFields.payload = fromPayloadField;
			}
		}

		const requestBody: Record<string, unknown> = {
			...baseFields,
			command: workflowCommand,
			...(workflowCommand === "stego" && artifactTag.trim()
				? { tag: artifactTag.trim() }
				: {}),
			...(forceRunAll ? { run_all: true } : {}),
		};
		delete requestBody.max_posts;

		await callApi("POST", WORKFLOW_PATH, undefined, requestBody, tabId);
	} catch {
		setTabError(
			tabId,
			`${base}${WORKFLOW_PATH}`,
			"POST",
			"Invalid JSON workflow body",
		);
	}
}

export type RunTabActionContext = {
	tab: ApiWorkspaceTab;
	base: string;
	cacheTarget: string;
	fsPath: string;
	fsRecursive: boolean;
	fsLimit: string;
	jsonReadPath: string;
	jsonWritePath: string;
	jsonWriteBody: string;
	workflowCommand: WorkflowCommand;
	artifactTag: string;
	workflowBody: string;
	kvKey: string;
	kvValue: string;
	kvLimit: string;
	kvOffset: string;
	searchQuery: string;
	searchProvider: string;
	artifactsStep: string;
	artifactsListCount: string;
	artifactsListOffset: string;
	artifactsListTag: string;
	artifactsPostFilename: string;
	artifactsPostSaveBody: string;
	artifactsObjectFilename: string;
	artifactsObjectBody: string;
	toolsProcessFileName: string;
	toolsProcessFileStep: string;
	toolsFetchUrl: string;
	toolsFetchUseCrawl4ai: boolean;
	toolsSemanticText: string;
	toolsSemanticObjectsJson: string;
	toolsSemanticN: string;
	toolsNeedle: string;
	toolsHaystackJson: string;
	toolsAnglesTextsJson: string;
	validatePostId: string;
	validatePostStream: boolean;
	validateUseTermsCache: boolean;
	validatePersistTermsCache: boolean;
	validateUseFetchCache: boolean;
	validateAllowAnglesFallback: boolean;
	protocolIncludePost: boolean;
	protocolUseCache: boolean;
	protocolPersistCache: boolean;
	batchAnglesDeterminismPostIds: string;
	batchAnglesDeterminismStep: string;
	batchAnglesDeterminismStream: boolean;
	receiverPostJson: string;
	receiverSenderUserId: string;
	receiverCompressedBitstring: string;
	receiverStream: boolean;
	receiverPreviewUseCache: boolean;
	receiverMaxPaddingBits: string;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
	submitWorkflowRequest: (
		tabId: string,
		options?: { forceRunAll?: boolean },
	) => Promise<void>;
};

export async function runTabAction(ctx: RunTabActionContext): Promise<void> {
	const {
		tab,
		base,
		cacheTarget,
		fsPath,
		fsRecursive,
		fsLimit,
		jsonReadPath,
		jsonWritePath,
		jsonWriteBody,
		kvKey,
		kvValue,
		kvLimit,
		kvOffset,
		searchQuery,
		searchProvider,
		artifactsStep,
		artifactsListCount,
		artifactsListOffset,
		artifactsListTag,
		artifactsPostFilename,
		artifactsPostSaveBody,
		artifactsObjectFilename,
		artifactsObjectBody,
		toolsProcessFileName,
		toolsProcessFileStep,
		toolsFetchUrl,
		toolsFetchUseCrawl4ai,
		toolsSemanticText,
		toolsSemanticObjectsJson,
		toolsSemanticN,
		toolsNeedle,
		toolsHaystackJson,
		toolsAnglesTextsJson,
		validatePostId,
		validatePostStream,
		validateUseTermsCache,
		validatePersistTermsCache,
		validateUseFetchCache,
		validateAllowAnglesFallback,
		protocolIncludePost,
		protocolUseCache,
		protocolPersistCache,
		batchAnglesDeterminismPostIds,
		batchAnglesDeterminismStep,
		batchAnglesDeterminismStream,
		receiverPostJson,
		receiverSenderUserId,
		receiverCompressedBitstring,
		receiverStream,
		receiverPreviewUseCache,
		receiverMaxPaddingBits,
		callApi,
		setTabError,
		submitWorkflowRequest,
	} = ctx;

	switch (tab.apiActionId) {
		case "service-health":
			await callApi("GET", "/health", undefined, undefined, tab.id);
			return;
		case "service-state-steps":
			await callApi("GET", "/state/steps", undefined, undefined, tab.id);
			return;
		case "service-state-paths":
			await callApi("GET", "/state/paths", undefined, undefined, tab.id);
			return;
		case "service-state-logs":
			await callApi("GET", "/state/logs", undefined, undefined, tab.id);
			return;
		case "service-state-logs-truncate":
			await callApi("DELETE", "/state/logs", undefined, undefined, tab.id);
			return;
		case "service-logging-tags":
			await callApi("GET", "/logging/tags", undefined, undefined, tab.id);
			return;
		case "service-kv-migrate":
			await callApi("POST", "/admin/kv/migrate", undefined, undefined, tab.id);
			return;
		case "cache-stats":
			await callApi("GET", "/admin/cache/stats", undefined, undefined, tab.id);
			return;
		case "cache-clear":
			await callApi(
				"POST",
				"/admin/cache/clear",
				undefined,
				{ target: cacheTarget },
				tab.id,
			);
			return;
		case "fs-list":
			await callApi(
				"GET",
				"/state/fs/list",
				{ path: fsPath, recursive: fsRecursive, limit: fsLimit },
				undefined,
				tab.id,
			);
			return;
		case "fs-delete":
			await callApi(
				"DELETE",
				"/state/fs/delete",
				{ path: fsPath, recursive: fsRecursive },
				undefined,
				tab.id,
			);
			return;
		case "fs-read-json":
			await callApi(
				"GET",
				"/state/fs/read-json",
				{ path: jsonReadPath },
				undefined,
				tab.id,
			);
			return;
		case "fs-write-json":
			try {
				await callApi(
					"POST",
					"/state/fs/write-json",
					undefined,
					{
						path: jsonWritePath,
						data: JSON.parse(jsonWriteBody),
						overwrite: true,
					},
					tab.id,
				);
			} catch {
				setTabError(
					tab.id,
					`${base}/state/fs/write-json`,
					"POST",
					"Invalid JSON body for write-json",
				);
			}
			return;
		case "workflows-pipelines":
			await callApi(
				"GET",
				"/workflows/pipelines",
				undefined,
				undefined,
				tab.id,
			);
			return;
		case "artifacts-posts-list": {
			const step = artifactsStep.trim();
			if (!step) {
				setTabError(
					tab.id,
					`${base}/artifacts/posts`,
					"GET",
					"step is required",
				);
				return;
			}
			const query: Record<string, string | number | boolean | undefined> = {
				step,
				count: artifactsListCount.trim() || "20",
				offset: artifactsListOffset.trim() || "0",
			};
			const tag = artifactsListTag.trim();
			if (tag) query.tag = tag;
			await callApi("GET", "/artifacts/posts", query, undefined, tab.id);
			return;
		}
		case "artifacts-post-get": {
			const step = artifactsStep.trim();
			const post = artifactsPostFilename.trim();
			if (!step || !post) {
				setTabError(
					tab.id,
					`${base}/artifacts/post`,
					"GET",
					"step and post (filename) are required",
				);
				return;
			}
			await callApi(
				"GET",
				"/artifacts/post",
				{ step, post },
				undefined,
				tab.id,
			);
			return;
		}
		case "artifacts-post-save": {
			const step = artifactsStep.trim();
			if (!step) {
				setTabError(
					tab.id,
					`${base}/artifacts/post`,
					"POST",
					"step is required",
				);
				return;
			}
			let data: unknown;
			try {
				data = JSON.parse(artifactsPostSaveBody) as unknown;
			} catch {
				setTabError(
					tab.id,
					`${base}/artifacts/post`,
					"POST",
					"Body must be valid JSON with an id field",
				);
				return;
			}
			if (
				!data ||
				typeof data !== "object" ||
				Array.isArray(data) ||
				typeof (data as { id?: unknown }).id !== "string"
			) {
				setTabError(
					tab.id,
					`${base}/artifacts/post`,
					"POST",
					"Body must be a JSON object with string id",
				);
				return;
			}
			await callApi("POST", "/artifacts/post", { step }, data, tab.id);
			return;
		}
		case "artifacts-object-save": {
			const step = artifactsStep.trim();
			const filename = artifactsObjectFilename.trim();
			if (!step || !filename) {
				setTabError(
					tab.id,
					`${base}/artifacts/object`,
					"POST",
					"step and filename are required",
				);
				return;
			}
			let data: unknown;
			try {
				data = JSON.parse(artifactsObjectBody) as unknown;
			} catch {
				setTabError(
					tab.id,
					`${base}/artifacts/object`,
					"POST",
					"Body must be valid JSON",
				);
				return;
			}
			await callApi(
				"POST",
				"/artifacts/object",
				{ step, filename },
				data,
				tab.id,
			);
			return;
		}
		case "workflows-runs":
			await callApi("GET", "/workflows/runs", undefined, undefined, tab.id);
			return;
		case "workflows-validate-post": {
			const postId = validatePostId.trim();
			if (!postId) {
				setTabError(
					tab.id,
					`${base}/workflows/validate-post`,
					"POST",
					"post_id is required",
				);
				return;
			}
			const body: Record<string, unknown> = { post_id: postId };
			body.stream = validatePostStream;
			body.use_terms_cache = validateUseTermsCache;
			body.persist_terms_cache = validatePersistTermsCache;
			body.use_fetch_cache = validateUseFetchCache;
			body.allow_angles_fallback = validateAllowAnglesFallback;
			await callApi(
				"POST",
				"/workflows/validate-post",
				undefined,
				body,
				tab.id,
			);
			return;
		}
		case "workflows-receiver": {
			const path = "/workflows/receiver";
			const sender = receiverSenderUserId.trim();
			if (!sender) {
				setTabError(
					tab.id,
					`${base}${path}`,
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
					tab.id,
					`${base}${path}`,
					"POST",
					"post must be valid JSON object",
				);
				return;
			}
			if (!post || typeof post !== "object" || Array.isArray(post)) {
				setTabError(
					tab.id,
					`${base}${path}`,
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
						tab.id,
						`${base}${path}`,
						"POST",
						"max_padding_bits must be a non-negative integer",
					);
					return;
				}
				body.max_padding_bits = n;
			}
			await callApi("POST", path, undefined, body, tab.id);
			return;
		}
		case "protocol-gen-terms": {
			const postId = validatePostId.trim();
			if (!postId) {
				setTabError(
					tab.id,
					`${base}/tools/protocol/gen-terms`,
					"POST",
					"post_id is required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/protocol/gen-terms",
				undefined,
				{
					post_id: postId,
					use_cache: protocolUseCache,
					persist_cache: protocolPersistCache,
				},
				tab.id,
			);
			return;
		}
		case "protocol-data-load-preview": {
			const postId = validatePostId.trim();
			if (!postId) {
				setTabError(
					tab.id,
					`${base}/tools/protocol/data-load-preview`,
					"POST",
					"post_id is required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/protocol/data-load-preview",
				undefined,
				{
					post_id: postId,
					use_cache: protocolUseCache,
					include_post: protocolIncludePost,
				},
				tab.id,
			);
			return;
		}
		case "protocol-research-preview": {
			const postId = validatePostId.trim();
			if (!postId) {
				setTabError(
					tab.id,
					`${base}/tools/protocol/research-preview`,
					"POST",
					"post_id is required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/protocol/research-preview",
				undefined,
				{
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					include_post: protocolIncludePost,
				},
				tab.id,
			);
			return;
		}
		case "protocol-angles-preview": {
			const postId = validatePostId.trim();
			if (!postId) {
				setTabError(
					tab.id,
					`${base}/tools/protocol/angles-preview`,
					"POST",
					"post_id is required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/protocol/angles-preview",
				undefined,
				{
					post_id: postId,
					use_terms_cache: validateUseTermsCache,
					persist_terms_cache: validatePersistTermsCache,
					use_fetch_cache: validateUseFetchCache,
					allow_angles_fallback: validateAllowAnglesFallback,
					include_post: protocolIncludePost,
				},
				tab.id,
			);
			return;
		}
		case "workflows-batch-angles-determinism": {
			const path = "/workflows/batch-angles-determinism";
			const postIds = parsePostIdsFromMultiline(batchAnglesDeterminismPostIds);
			if (postIds.length === 0) {
				setTabError(
					tab.id,
					`${base}${path}`,
					"POST",
					"At least one post_id is required (one per line or comma-separated)",
				);
				return;
			}
			const stepTrimmed = batchAnglesDeterminismStep.trim();
			await callApi(
				"POST",
				path,
				undefined,
				{
					post_ids: postIds,
					...(stepTrimmed ? { step: stepTrimmed } : {}),
					stream: batchAnglesDeterminismStream,
				},
				tab.id,
			);
			return;
		}
		case "workflows-run":
			await submitWorkflowRequest(tab.id);
			return;
		case "kv-list":
			await callApi(
				"GET",
				"/kv",
				{ limit: kvLimit, offset: kvOffset },
				undefined,
				tab.id,
			);
			return;
		case "kv-get":
			await callApi(
				"GET",
				`/kv/${encodeURIComponent(kvKey)}`,
				undefined,
				undefined,
				tab.id,
			);
			return;
		case "kv-put":
			try {
				await callApi(
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
			return;
		case "kv-delete":
			await callApi(
				"DELETE",
				`/kv/${encodeURIComponent(kvKey)}`,
				undefined,
				undefined,
				tab.id,
			);
			return;
		case "search-run": {
			const query =
				searchProvider === "bing" || searchProvider === "google"
					? { query: searchQuery, first: 0, count: 5 }
					: { query: searchQuery };
			await callApi(
				"GET",
				`/tools/search/${searchProvider}`,
				query,
				undefined,
				tab.id,
			);
			return;
		}
		case "tools-process-file": {
			const name = toolsProcessFileName.trim();
			const step = toolsProcessFileStep.trim();
			if (!name || !step) {
				setTabError(
					tab.id,
					`${base}/tools/process-file`,
					"POST",
					"name and step are required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/process-file",
				undefined,
				{ name, step },
				tab.id,
			);
			return;
		}
		case "tools-fetch-url": {
			const url = toolsFetchUrl.trim();
			if (!url) {
				setTabError(
					tab.id,
					`${base}/tools/fetch-url`,
					"POST",
					"url is required",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/fetch-url",
				undefined,
				{ url, use_crawl4ai: toolsFetchUseCrawl4ai },
				tab.id,
			);
			return;
		}
		case "tools-semantic-search": {
			const text = toolsSemanticText.trim();
			if (!text) {
				setTabError(
					tab.id,
					`${base}/tools/semantic/search`,
					"POST",
					"text is required",
				);
				return;
			}
			let objects: unknown;
			try {
				objects = JSON.parse(toolsSemanticObjectsJson) as unknown;
			} catch {
				setTabError(
					tab.id,
					`${base}/tools/semantic/search`,
					"POST",
					"objects must be valid JSON",
				);
				return;
			}
			const body: Record<string, unknown> = { text, objects };
			const nRaw = toolsSemanticN.trim();
			if (nRaw.length > 0) {
				const n = Number(nRaw);
				if (!Number.isFinite(n)) {
					setTabError(
						tab.id,
						`${base}/tools/semantic/search`,
						"POST",
						"n must be a number",
					);
					return;
				}
				body.n = n;
			}
			await callApi("POST", "/tools/semantic/search", undefined, body, tab.id);
			return;
		}
		case "tools-semantic-needle": {
			const needle = toolsNeedle;
			let haystack: unknown;
			try {
				haystack = JSON.parse(toolsHaystackJson) as unknown;
			} catch {
				setTabError(
					tab.id,
					`${base}/tools/semantic/needle`,
					"POST",
					"haystack must be a JSON array of strings",
				);
				return;
			}
			if (!Array.isArray(haystack)) {
				setTabError(
					tab.id,
					`${base}/tools/semantic/needle`,
					"POST",
					"haystack must be a JSON array",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/semantic/needle",
				undefined,
				{ needle, haystack },
				tab.id,
			);
			return;
		}
		case "tools-angles-analyze": {
			let texts: unknown;
			try {
				texts = JSON.parse(toolsAnglesTextsJson) as unknown;
			} catch {
				setTabError(
					tab.id,
					`${base}/tools/angles/analyze`,
					"POST",
					"texts must be valid JSON",
				);
				return;
			}
			if (!Array.isArray(texts)) {
				setTabError(
					tab.id,
					`${base}/tools/angles/analyze`,
					"POST",
					"texts must be a JSON array of strings",
				);
				return;
			}
			await callApi(
				"POST",
				"/tools/angles/analyze",
				undefined,
				{ texts },
				tab.id,
			);
			return;
		}
	}
}
