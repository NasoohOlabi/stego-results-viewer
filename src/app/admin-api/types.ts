export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export const WORKFLOW_COMMAND_OPTIONS = [
	"data-load",
	"research",
	"gen-angles",
	"validate-post",
	"receiver",
	"stego-receiver-live",
	"double-process-new-post",
	"batch-angles-determinism",
	"stego",
	"decode",
	"gen-terms",
	"full",
] as const;
export type WorkflowCommand = (typeof WORKFLOW_COMMAND_OPTIONS)[number];

export function isWorkflowCommand(value: string): value is WorkflowCommand {
	return (WORKFLOW_COMMAND_OPTIONS as readonly string[]).includes(value);
}

export type TriggerAnglesMode = "gen-angles" | "stego-receiver-live";

export interface ApiResponseView {
	status: "idle" | "loading" | "success" | "error";
	endpoint: string;
	method: HttpMethod;
	request: {
		url: string;
		path: string;
		query: Record<string, string | number | boolean | undefined> | null;
		body: unknown;
	} | null;
	data: unknown;
}

export interface StreamEventView {
	event: string;
	data: unknown;
	rawData: string;
	id?: string;
	retry?: number;
	receivedAt: string;
}

export interface StreamEventDisplayItem {
	type: "event" | "heartbeat-group";
	event?: StreamEventView;
	heartbeats?: StreamEventView[];
}

export type ApiToolId =
	| "service"
	| "cache-admin"
	| "state-filesystem"
	| "artifacts-workflows"
	| "kv-store"
	| "search-tools";
export type ApiActionId =
	| "service-health"
	| "service-state-steps"
	| "service-state-paths"
	| "service-state-logs"
	| "service-state-logs-truncate"
	| "service-logging-tags"
	| "service-kv-migrate"
	| "cache-stats"
	| "cache-clear"
	| "fs-list"
	| "fs-delete"
	| "fs-read-json"
	| "fs-write-json"
	| "workflows-pipelines"
	| "artifacts-posts-list"
	| "artifacts-post-get"
	| "artifacts-post-save"
	| "artifacts-object-save"
	| "workflows-runs"
	| "workflows-validate-post"
	| "workflows-receiver"
	| "workflows-batch-angles-determinism"
	| "workflows-trigger-angles"
	| "protocol-gen-terms"
	| "protocol-data-load-preview"
	| "protocol-research-preview"
	| "protocol-angles-preview"
	| "workflows-run"
	| "kv-list"
	| "kv-get"
	| "kv-put"
	| "kv-delete"
	| "search-run"
	| "tools-process-file"
	| "tools-fetch-url"
	| "tools-semantic-search"
	| "tools-semantic-needle"
	| "tools-angles-analyze";

export interface ApiWorkspaceTab {
	id: string;
	apiToolId: ApiToolId;
	apiActionId: ApiActionId;
	response: ApiResponseView;
}

export const API_TOOL_OPTIONS: Array<{ id: ApiToolId; label: string }> = [
	{ id: "service", label: "Service" },
	{ id: "cache-admin", label: "Cache Admin" },
	{ id: "state-filesystem", label: "State Filesystem" },
	{ id: "artifacts-workflows", label: "Artifacts + Workflows" },
	{ id: "kv-store", label: "KV Store" },
	{ id: "search-tools", label: "Search & tools" },
];
export const API_ACTION_OPTIONS: Array<{
	id: ApiActionId;
	apiToolId: ApiToolId;
	label: string;
}> = [
	{ id: "service-health", apiToolId: "service", label: "GET /health" },
	{
		id: "service-state-steps",
		apiToolId: "service",
		label: "GET /state/steps",
	},
	{
		id: "service-state-paths",
		apiToolId: "service",
		label: "GET /state/paths",
	},
	{
		id: "service-state-logs",
		apiToolId: "service",
		label: "GET /state/logs",
	},
	{
		id: "service-state-logs-truncate",
		apiToolId: "service",
		label: "DELETE /state/logs",
	},
	{
		id: "service-logging-tags",
		apiToolId: "service",
		label: "GET /logging/tags",
	},
	{
		id: "service-kv-migrate",
		apiToolId: "service",
		label: "POST /admin/kv/migrate",
	},
	{
		id: "cache-stats",
		apiToolId: "cache-admin",
		label: "GET /admin/cache/stats",
	},
	{
		id: "cache-clear",
		apiToolId: "cache-admin",
		label: "POST /admin/cache/clear",
	},
	{ id: "fs-list", apiToolId: "state-filesystem", label: "GET /state/fs/list" },
	{
		id: "fs-delete",
		apiToolId: "state-filesystem",
		label: "DELETE /state/fs/delete",
	},
	{
		id: "fs-read-json",
		apiToolId: "state-filesystem",
		label: "GET /state/fs/read-json",
	},
	{
		id: "fs-write-json",
		apiToolId: "state-filesystem",
		label: "POST /state/fs/write-json",
	},
	{
		id: "workflows-runs",
		apiToolId: "artifacts-workflows",
		label: "GET /workflows/runs",
	},
	{
		id: "workflows-validate-post",
		apiToolId: "artifacts-workflows",
		label: "POST /workflows/validate-post",
	},
	{
		id: "workflows-receiver",
		apiToolId: "artifacts-workflows",
		label: "POST /workflows/receiver",
	},
	{
		id: "workflows-batch-angles-determinism",
		apiToolId: "artifacts-workflows",
		label: "POST /workflows/batch-angles-determinism",
	},
	{
		id: "workflows-trigger-angles",
		apiToolId: "artifacts-workflows",
		label: "POST gen-angles / stego-receiver-live (trigger angles)",
	},
	{
		id: "protocol-gen-terms",
		apiToolId: "artifacts-workflows",
		label: "POST /tools/protocol/gen-terms",
	},
	{
		id: "protocol-data-load-preview",
		apiToolId: "artifacts-workflows",
		label: "POST /tools/protocol/data-load-preview",
	},
	{
		id: "protocol-research-preview",
		apiToolId: "artifacts-workflows",
		label: "POST /tools/protocol/research-preview",
	},
	{
		id: "protocol-angles-preview",
		apiToolId: "artifacts-workflows",
		label: "POST /tools/protocol/angles-preview",
	},
	{
		id: "workflows-run",
		apiToolId: "artifacts-workflows",
		label: "POST /workflows/run",
	},
	{
		id: "workflows-pipelines",
		apiToolId: "artifacts-workflows",
		label: "GET /workflows/pipelines",
	},
	{
		id: "artifacts-posts-list",
		apiToolId: "artifacts-workflows",
		label: "GET /artifacts/posts",
	},
	{
		id: "artifacts-post-get",
		apiToolId: "artifacts-workflows",
		label: "GET /artifacts/post",
	},
	{
		id: "artifacts-post-save",
		apiToolId: "artifacts-workflows",
		label: "POST /artifacts/post",
	},
	{
		id: "artifacts-object-save",
		apiToolId: "artifacts-workflows",
		label: "POST /artifacts/object",
	},
	{ id: "kv-list", apiToolId: "kv-store", label: "GET /kv" },
	{ id: "kv-get", apiToolId: "kv-store", label: "GET /kv/{key}" },
	{ id: "kv-put", apiToolId: "kv-store", label: "PUT /kv/{key}" },
	{ id: "kv-delete", apiToolId: "kv-store", label: "DELETE /kv/{key}" },
	{
		id: "search-run",
		apiToolId: "search-tools",
		label: "GET /tools/search/{provider}",
	},
	{
		id: "tools-process-file",
		apiToolId: "search-tools",
		label: "POST /tools/process-file",
	},
	{
		id: "tools-fetch-url",
		apiToolId: "search-tools",
		label: "POST /tools/fetch-url",
	},
	{
		id: "tools-semantic-search",
		apiToolId: "search-tools",
		label: "POST /tools/semantic/search",
	},
	{
		id: "tools-semantic-needle",
		apiToolId: "search-tools",
		label: "POST /tools/semantic/needle",
	},
	{
		id: "tools-angles-analyze",
		apiToolId: "search-tools",
		label: "POST /tools/angles/analyze",
	},
];

export const ADMIN_API_STORAGE_KEY = "admin-api-console:v1";

export function getApiToolLabel(apiToolId: ApiToolId): string {
	return (
		API_TOOL_OPTIONS.find((option) => option.id === apiToolId)?.label ?? "API"
	);
}

export function isApiToolId(value: unknown): value is ApiToolId {
	return API_TOOL_OPTIONS.some((option) => option.id === value);
}

export function isApiActionId(value: unknown): value is ApiActionId {
	return API_ACTION_OPTIONS.some((option) => option.id === value);
}

export function getApiActionLabel(apiActionId: ApiActionId): string {
	return (
		API_ACTION_OPTIONS.find((option) => option.id === apiActionId)?.label ??
		"API"
	);
}

export function getApiToolForAction(apiActionId: ApiActionId): ApiToolId {
	return (
		API_ACTION_OPTIONS.find((option) => option.id === apiActionId)?.apiToolId ??
		"service"
	);
}

export function getDefaultApiActionForTool(apiToolId: ApiToolId): ApiActionId {
	return (
		API_ACTION_OPTIONS.find((option) => option.apiToolId === apiToolId)?.id ??
		"service-health"
	);
}

export function createIdleResponse(): ApiResponseView {
	return {
		status: "idle",
		endpoint: "",
		method: "GET",
		request: null,
		data: null,
	};
}

export interface PersistedAdminApiState {
	baseUrl: string;
	tabs: ApiWorkspaceTab[];
	activeTabId: string;
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
	/** Optional stego secret payload (string or JSON); empty uses body/API default. */
	stegoPayload: string;
	/** POST /workflows/validate-post */
	validatePostId: string;
	validatePostStream: boolean;
	/** POST /workflows/receiver */
	receiverPostJson: string;
	receiverSenderUserId: string;
	receiverCompressedBitstring: string;
	receiverStream: boolean;
	receiverPreviewUseCache: boolean;
	receiverMaxPaddingBits: string;
	/** POST /workflows/batch-angles-determinism — one id per line or comma-separated */
	batchAnglesDeterminismPostIds: string;
	batchAnglesDeterminismStep: string;
	batchAnglesDeterminismStream: boolean;
	triggerAnglesMode: TriggerAnglesMode;
	genAnglesCount: string;
	genAnglesOffset: string;
	genAnglesStream: boolean;
	stegoReceiverLiveSenderUserId: string;
	stegoReceiverLivePostId: string;
	stegoReceiverLivePayload: string;
	stegoReceiverLiveTag: string;
	stegoReceiverLiveListOffset: string;
	stegoReceiverLiveSimulationRoot: string;
	stegoReceiverLiveCompressedBitstring: string;
	stegoReceiverLiveAllowFallback: boolean;
	stegoReceiverLiveMaxPaddingBits: string;
	stegoReceiverLiveMaxPostAttempts: string;
	stegoReceiverLiveStream: boolean;
	validateUseTermsCache: boolean;
	validatePersistTermsCache: boolean;
	validateUseFetchCache: boolean;
	validateAllowAnglesFallback: boolean;
	protocolIncludePost: boolean;
	protocolUseCache: boolean;
	protocolPersistCache: boolean;
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
	showHeartbeatEvents: boolean;
	streamSearchText: string;
	showAdvancedApiControls: boolean;
}
