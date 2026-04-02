"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";
import { AdminApiActiveResponse } from "./admin-api-active-response";
import { AdminApiTabWorkspace } from "./admin-api-tab-workspace";
import { executeAdminApiRequest } from "./fetch-admin-api";
import {
	type CallApiFn,
	runTabAction,
	submitWorkflowRequest as submitWorkflowRequestImpl,
} from "./tab-actions";
import {
	ADMIN_API_STORAGE_KEY,
	type ApiActionId,
	type ApiResponseView,
	type ApiWorkspaceTab,
	bumpAdminApiActionUseCount,
	createIdleResponse,
	getApiToolForAction,
	getDefaultApiActionForTool,
	isApiActionId,
	isApiToolId,
	isWorkflowCommand,
	type PersistedAdminApiState,
	type StreamEventView,
	type TriggerAnglesMode,
	type WorkflowCommand,
} from "./types";
import { getWorkflowTemplate, toPrettyJson } from "./utils";

export function DashboardAdminContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [tabs, setTabs] = useState<ApiWorkspaceTab[]>([
		{
			id: "tab-1",
			apiToolId: "service",
			apiActionId: "service-health",
			response: createIdleResponse(),
		},
	]);
	const [activeTabId, setActiveTabId] = useState("tab-1");

	const [cacheTarget, setCacheTarget] = useState("all");
	const [fsPath, setFsPath] = useState("metrics");
	const [fsRecursive, setFsRecursive] = useState(false);
	const [fsLimit, setFsLimit] = useState("100");
	const [jsonReadPath, setJsonReadPath] = useState(
		"metrics/divergence_metrics_latest.json",
	);
	const [jsonWritePath, setJsonWritePath] = useState(
		"metrics/manual_write.json",
	);
	const [jsonWriteBody, setJsonWriteBody] = useState(
		'{\n  "hello": "world"\n}',
	);
	const [workflowCommand, setWorkflowCommand] =
		useState<WorkflowCommand>("data-load");
	const [artifactTag, setArtifactTag] = useState("");
	const [stegoPayload, setStegoPayload] = useState("");
	const [validatePostId, setValidatePostId] = useState("");
	const [validatePostStream, setValidatePostStream] = useState(false);
	const [validateUseTermsCache, setValidateUseTermsCache] = useState(false);
	const [validatePersistTermsCache, setValidatePersistTermsCache] =
		useState(false);
	const [validateUseFetchCache, setValidateUseFetchCache] = useState(false);
	const [validateAllowAnglesFallback, setValidateAllowAnglesFallback] =
		useState(false);
	const [protocolIncludePost, setProtocolIncludePost] = useState(false);
	const [protocolUseCache, setProtocolUseCache] = useState(false);
	const [protocolPersistCache, setProtocolPersistCache] = useState(false);
	const [batchAnglesDeterminismPostIds, setBatchAnglesDeterminismPostIds] =
		useState("");
	const [batchAnglesDeterminismStep, setBatchAnglesDeterminismStep] =
		useState("angles-step");
	const [batchAnglesDeterminismStream, setBatchAnglesDeterminismStream] =
		useState(false);
	const [triggerAnglesMode, setTriggerAnglesMode] = useState<TriggerAnglesMode>(
		"stego-receiver-live",
	);
	const [genAnglesCount, setGenAnglesCount] = useState("1");
	const [genAnglesOffset, setGenAnglesOffset] = useState("0");
	const [genAnglesStream, setGenAnglesStream] = useState(true);
	const [stegoReceiverLiveSenderUserId, setStegoReceiverLiveSenderUserId] =
		useState("");
	const [stegoReceiverLivePostId, setStegoReceiverLivePostId] = useState("");
	const [stegoReceiverLivePayload, setStegoReceiverLivePayload] = useState("");
	const [stegoReceiverLiveTag, setStegoReceiverLiveTag] = useState("");
	const [stegoReceiverLiveListOffset, setStegoReceiverLiveListOffset] =
		useState("");
	const [stegoReceiverLiveSimulationRoot, setStegoReceiverLiveSimulationRoot] =
		useState("");
	const [
		stegoReceiverLiveCompressedBitstring,
		setStegoReceiverLiveCompressedBitstring,
	] = useState("");
	const [stegoReceiverLiveAllowFallback, setStegoReceiverLiveAllowFallback] =
		useState(false);
	const [stegoReceiverLiveMaxPaddingBits, setStegoReceiverLiveMaxPaddingBits] =
		useState("");
	const [
		stegoReceiverLiveMaxPostAttempts,
		setStegoReceiverLiveMaxPostAttempts,
	] = useState("");
	const [stegoReceiverLiveStream, setStegoReceiverLiveStream] = useState(true);
	const [receiverPostJson, setReceiverPostJson] = useState(
		'{\n  "id": "example-post",\n  "author": "sender",\n  "selftext": "",\n  "comments": []\n}',
	);
	const [receiverSenderUserId, setReceiverSenderUserId] = useState("");
	const [receiverCompressedBitstring, setReceiverCompressedBitstring] =
		useState("");
	const [receiverStream, setReceiverStream] = useState(false);
	const [receiverPreviewUseCache, setReceiverPreviewUseCache] = useState(false);
	const [receiverMaxPaddingBits, setReceiverMaxPaddingBits] = useState("");
	const [workflowBody, setWorkflowBody] = useState(
		getWorkflowTemplate("data-load"),
	);
	const [kvKey, setKvKey] = useState("test_key");
	const [kvValue, setKvValue] = useState(
		'{\n  "value": {\n    "ok": true\n  }\n}',
	);
	const [kvLimit, setKvLimit] = useState("20");
	const [kvOffset, setKvOffset] = useState("0");
	const [searchQuery, setSearchQuery] = useState("steganography");
	const [searchProvider, setSearchProvider] = useState("bing");
	const [artifactsStep, setArtifactsStep] = useState("angles-step");
	const [artifactsListCount, setArtifactsListCount] = useState("20");
	const [artifactsListOffset, setArtifactsListOffset] = useState("0");
	const [artifactsListTag, setArtifactsListTag] = useState("");
	const [artifactsPostFilename, setArtifactsPostFilename] = useState("");
	const [artifactsPostSaveBody, setArtifactsPostSaveBody] = useState(
		'{\n  "id": "example-post"\n}',
	);
	const [artifactsObjectFilename, setArtifactsObjectFilename] =
		useState("object.json");
	const [artifactsObjectBody, setArtifactsObjectBody] = useState("{}");
	const [toolsProcessFileName, setToolsProcessFileName] = useState("");
	const [toolsProcessFileStep, setToolsProcessFileStep] =
		useState("angles-step");
	const [toolsFetchUrl, setToolsFetchUrl] = useState("");
	const [toolsFetchUseCrawl4ai, setToolsFetchUseCrawl4ai] = useState(false);
	const [toolsSemanticText, setToolsSemanticText] = useState("");
	const [toolsSemanticObjectsJson, setToolsSemanticObjectsJson] =
		useState("[]");
	const [toolsSemanticN, setToolsSemanticN] = useState("");
	const [toolsNeedle, setToolsNeedle] = useState("");
	const [toolsHaystackJson, setToolsHaystackJson] = useState('["a","b"]');
	const [toolsAnglesTextsJson, setToolsAnglesTextsJson] =
		useState('["Sample text"]');
	const [copyErrorReportState, setCopyErrorReportState] = useState<
		"idle" | "copied" | "failed"
	>("idle");
	const [copiedStreamEventKey, setCopiedStreamEventKey] = useState<
		string | null
	>(null);
	const [showHeartbeatEvents, setShowHeartbeatEvents] = useState(false);
	const [streamSearchText, setStreamSearchText] = useState("");
	const [showAdvancedApiControls, setShowAdvancedApiControls] = useState(false);
	const didHydrateFromStorageRef = useRef(false);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
			if (!raw) {
				didHydrateFromStorageRef.current = true;
				return;
			}

			const parsed = JSON.parse(raw) as Partial<PersistedAdminApiState>;
			if (typeof parsed.baseUrl === "string") setBaseUrl(parsed.baseUrl);
			if (typeof parsed.cacheTarget === "string")
				setCacheTarget(parsed.cacheTarget);
			if (typeof parsed.fsPath === "string") setFsPath(parsed.fsPath);
			if (typeof parsed.fsRecursive === "boolean")
				setFsRecursive(parsed.fsRecursive);
			if (typeof parsed.fsLimit === "string") setFsLimit(parsed.fsLimit);
			if (typeof parsed.jsonReadPath === "string")
				setJsonReadPath(parsed.jsonReadPath);
			if (typeof parsed.jsonWritePath === "string")
				setJsonWritePath(parsed.jsonWritePath);
			if (typeof parsed.jsonWriteBody === "string")
				setJsonWriteBody(parsed.jsonWriteBody);
			if (
				typeof parsed.workflowCommand === "string" &&
				isWorkflowCommand(parsed.workflowCommand)
			) {
				setWorkflowCommand(parsed.workflowCommand);
			} else if (
				typeof (parsed as { artifactStep?: string }).artifactStep === "string"
			) {
				const legacy = (parsed as { artifactStep: string }).artifactStep;
				const fromStep: Partial<Record<string, WorkflowCommand>> = {
					"filter-url-unresolved": "data-load",
					"filter-researched": "research",
					"angles-step": "gen-angles",
					"final-step": "stego",
				};
				const mapped = fromStep[legacy];
				if (mapped) setWorkflowCommand(mapped);
			}
			if (typeof parsed.artifactTag === "string")
				setArtifactTag(parsed.artifactTag);
			if (typeof parsed.workflowBody === "string")
				setWorkflowBody(parsed.workflowBody);
			if (typeof parsed.stegoPayload === "string")
				setStegoPayload(parsed.stegoPayload);
			if (typeof parsed.validatePostId === "string")
				setValidatePostId(parsed.validatePostId);
			if (typeof parsed.validatePostStream === "boolean")
				setValidatePostStream(parsed.validatePostStream);
			if (typeof parsed.validateUseTermsCache === "boolean")
				setValidateUseTermsCache(parsed.validateUseTermsCache);
			if (typeof parsed.validatePersistTermsCache === "boolean")
				setValidatePersistTermsCache(parsed.validatePersistTermsCache);
			if (typeof parsed.validateUseFetchCache === "boolean")
				setValidateUseFetchCache(parsed.validateUseFetchCache);
			if (typeof parsed.validateAllowAnglesFallback === "boolean")
				setValidateAllowAnglesFallback(parsed.validateAllowAnglesFallback);
			if (typeof parsed.protocolIncludePost === "boolean")
				setProtocolIncludePost(parsed.protocolIncludePost);
			if (typeof parsed.protocolUseCache === "boolean")
				setProtocolUseCache(parsed.protocolUseCache);
			if (typeof parsed.protocolPersistCache === "boolean")
				setProtocolPersistCache(parsed.protocolPersistCache);
			if (typeof parsed.batchAnglesDeterminismPostIds === "string")
				setBatchAnglesDeterminismPostIds(parsed.batchAnglesDeterminismPostIds);
			if (typeof parsed.batchAnglesDeterminismStep === "string")
				setBatchAnglesDeterminismStep(parsed.batchAnglesDeterminismStep);
			if (typeof parsed.batchAnglesDeterminismStream === "boolean")
				setBatchAnglesDeterminismStream(parsed.batchAnglesDeterminismStream);
			if (
				parsed.triggerAnglesMode === "gen-angles" ||
				parsed.triggerAnglesMode === "stego-receiver-live"
			) {
				setTriggerAnglesMode(parsed.triggerAnglesMode);
			}
			if (typeof parsed.genAnglesCount === "string")
				setGenAnglesCount(parsed.genAnglesCount);
			if (typeof parsed.genAnglesOffset === "string")
				setGenAnglesOffset(parsed.genAnglesOffset);
			if (typeof parsed.genAnglesStream === "boolean")
				setGenAnglesStream(parsed.genAnglesStream);
			if (typeof parsed.stegoReceiverLiveSenderUserId === "string")
				setStegoReceiverLiveSenderUserId(parsed.stegoReceiverLiveSenderUserId);
			if (typeof parsed.stegoReceiverLivePostId === "string")
				setStegoReceiverLivePostId(parsed.stegoReceiverLivePostId);
			if (typeof parsed.stegoReceiverLivePayload === "string")
				setStegoReceiverLivePayload(parsed.stegoReceiverLivePayload);
			if (typeof parsed.stegoReceiverLiveTag === "string")
				setStegoReceiverLiveTag(parsed.stegoReceiverLiveTag);
			if (typeof parsed.stegoReceiverLiveListOffset === "string")
				setStegoReceiverLiveListOffset(parsed.stegoReceiverLiveListOffset);
			if (typeof parsed.stegoReceiverLiveSimulationRoot === "string")
				setStegoReceiverLiveSimulationRoot(
					parsed.stegoReceiverLiveSimulationRoot,
				);
			if (typeof parsed.stegoReceiverLiveCompressedBitstring === "string")
				setStegoReceiverLiveCompressedBitstring(
					parsed.stegoReceiverLiveCompressedBitstring,
				);
			if (typeof parsed.stegoReceiverLiveAllowFallback === "boolean")
				setStegoReceiverLiveAllowFallback(
					parsed.stegoReceiverLiveAllowFallback,
				);
			if (typeof parsed.stegoReceiverLiveMaxPaddingBits === "string")
				setStegoReceiverLiveMaxPaddingBits(
					parsed.stegoReceiverLiveMaxPaddingBits,
				);
			if (typeof parsed.stegoReceiverLiveMaxPostAttempts === "string")
				setStegoReceiverLiveMaxPostAttempts(
					parsed.stegoReceiverLiveMaxPostAttempts,
				);
			if (typeof parsed.stegoReceiverLiveStream === "boolean")
				setStegoReceiverLiveStream(parsed.stegoReceiverLiveStream);
			if (typeof parsed.receiverPostJson === "string")
				setReceiverPostJson(parsed.receiverPostJson);
			if (typeof parsed.receiverSenderUserId === "string")
				setReceiverSenderUserId(parsed.receiverSenderUserId);
			if (typeof parsed.receiverCompressedBitstring === "string")
				setReceiverCompressedBitstring(parsed.receiverCompressedBitstring);
			if (typeof parsed.receiverStream === "boolean")
				setReceiverStream(parsed.receiverStream);
			if (typeof parsed.receiverPreviewUseCache === "boolean")
				setReceiverPreviewUseCache(parsed.receiverPreviewUseCache);
			if (typeof parsed.receiverMaxPaddingBits === "string")
				setReceiverMaxPaddingBits(parsed.receiverMaxPaddingBits);
			if (typeof parsed.kvKey === "string") setKvKey(parsed.kvKey);
			if (typeof parsed.kvValue === "string") setKvValue(parsed.kvValue);
			if (typeof parsed.kvLimit === "string") setKvLimit(parsed.kvLimit);
			if (typeof parsed.kvOffset === "string") setKvOffset(parsed.kvOffset);
			if (typeof parsed.searchQuery === "string")
				setSearchQuery(parsed.searchQuery);
			if (typeof parsed.searchProvider === "string")
				setSearchProvider(parsed.searchProvider);
			if (typeof parsed.artifactsStep === "string")
				setArtifactsStep(parsed.artifactsStep);
			if (typeof parsed.artifactsListCount === "string")
				setArtifactsListCount(parsed.artifactsListCount);
			if (typeof parsed.artifactsListOffset === "string")
				setArtifactsListOffset(parsed.artifactsListOffset);
			if (typeof parsed.artifactsListTag === "string")
				setArtifactsListTag(parsed.artifactsListTag);
			if (typeof parsed.artifactsPostFilename === "string")
				setArtifactsPostFilename(parsed.artifactsPostFilename);
			if (typeof parsed.artifactsPostSaveBody === "string")
				setArtifactsPostSaveBody(parsed.artifactsPostSaveBody);
			if (typeof parsed.artifactsObjectFilename === "string")
				setArtifactsObjectFilename(parsed.artifactsObjectFilename);
			if (typeof parsed.artifactsObjectBody === "string")
				setArtifactsObjectBody(parsed.artifactsObjectBody);
			if (typeof parsed.toolsProcessFileName === "string")
				setToolsProcessFileName(parsed.toolsProcessFileName);
			if (typeof parsed.toolsProcessFileStep === "string")
				setToolsProcessFileStep(parsed.toolsProcessFileStep);
			if (typeof parsed.toolsFetchUrl === "string")
				setToolsFetchUrl(parsed.toolsFetchUrl);
			if (typeof parsed.toolsFetchUseCrawl4ai === "boolean")
				setToolsFetchUseCrawl4ai(parsed.toolsFetchUseCrawl4ai);
			if (typeof parsed.toolsSemanticText === "string")
				setToolsSemanticText(parsed.toolsSemanticText);
			if (typeof parsed.toolsSemanticObjectsJson === "string")
				setToolsSemanticObjectsJson(parsed.toolsSemanticObjectsJson);
			if (typeof parsed.toolsSemanticN === "string")
				setToolsSemanticN(parsed.toolsSemanticN);
			if (typeof parsed.toolsNeedle === "string")
				setToolsNeedle(parsed.toolsNeedle);
			if (typeof parsed.toolsHaystackJson === "string")
				setToolsHaystackJson(parsed.toolsHaystackJson);
			if (typeof parsed.toolsAnglesTextsJson === "string")
				setToolsAnglesTextsJson(parsed.toolsAnglesTextsJson);
			if (typeof parsed.showHeartbeatEvents === "boolean")
				setShowHeartbeatEvents(parsed.showHeartbeatEvents);
			if (typeof parsed.streamSearchText === "string")
				setStreamSearchText(parsed.streamSearchText);
			if (typeof parsed.showAdvancedApiControls === "boolean")
				setShowAdvancedApiControls(parsed.showAdvancedApiControls);

			if (Array.isArray(parsed.tabs)) {
				const normalizedTabs = parsed.tabs
					.map((tab, index): ApiWorkspaceTab | null => {
						if (!tab || typeof tab !== "object") return null;
						const candidate = tab as Partial<ApiWorkspaceTab>;
						const id =
							typeof candidate.id === "string" && candidate.id
								? candidate.id
								: `tab-${index + 1}`;
						const apiActionId = isApiActionId(candidate.apiActionId)
							? candidate.apiActionId
							: isApiToolId(candidate.apiToolId)
								? getDefaultApiActionForTool(candidate.apiToolId)
								: "service-health";
						const apiToolId = getApiToolForAction(apiActionId);
						const response =
							candidate.response &&
							typeof candidate.response === "object" &&
							typeof (candidate.response as ApiResponseView).status === "string"
								? (candidate.response as ApiResponseView)
								: createIdleResponse();
						return { id, apiToolId, apiActionId, response };
					})
					.filter((tab): tab is ApiWorkspaceTab => tab !== null);
				if (normalizedTabs.length > 0) {
					setTabs(normalizedTabs);
					if (
						typeof parsed.activeTabId === "string" &&
						normalizedTabs.some((tab) => tab.id === parsed.activeTabId)
					) {
						setActiveTabId(parsed.activeTabId);
					} else {
						setActiveTabId(normalizedTabs[0]!.id);
					}
				}
			}
		} catch {
			// Ignore malformed storage state and start fresh.
		} finally {
			didHydrateFromStorageRef.current = true;
		}
	}, []);

	useEffect(() => {
		if (!didHydrateFromStorageRef.current) return;
		const state: PersistedAdminApiState = {
			baseUrl,
			tabs,
			activeTabId,
			cacheTarget,
			fsPath,
			fsRecursive,
			fsLimit,
			jsonReadPath,
			jsonWritePath,
			jsonWriteBody,
			workflowCommand,
			artifactTag,
			workflowBody,
			stegoPayload,
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
			triggerAnglesMode,
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
			receiverPostJson,
			receiverSenderUserId,
			receiverCompressedBitstring,
			receiverStream,
			receiverPreviewUseCache,
			receiverMaxPaddingBits,
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
			showHeartbeatEvents,
			streamSearchText,
			showAdvancedApiControls,
		};
		try {
			localStorage.setItem(ADMIN_API_STORAGE_KEY, JSON.stringify(state));
		} catch {
			// Ignore storage quota errors.
		}
	}, [
		baseUrl,
		tabs,
		activeTabId,
		cacheTarget,
		fsPath,
		fsRecursive,
		fsLimit,
		jsonReadPath,
		jsonWritePath,
		jsonWriteBody,
		workflowCommand,
		artifactTag,
		workflowBody,
		stegoPayload,
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
		triggerAnglesMode,
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
		receiverPostJson,
		receiverSenderUserId,
		receiverCompressedBitstring,
		receiverStream,
		receiverPreviewUseCache,
		receiverMaxPaddingBits,
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
		showHeartbeatEvents,
		streamSearchText,
		showAdvancedApiControls,
	]);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
	const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
	const activeTabResponse = activeTab?.response ?? createIdleResponse();

	const updateTabResponse = (tabId: string, response: ApiResponseView) => {
		setTabs((prevTabs) =>
			prevTabs.map((tab) => (tab.id === tabId ? { ...tab, response } : tab)),
		);
	};

	const callApi: CallApiFn = async (
		method,
		path,
		query,
		body,
		tabId = activeTabId,
	) => {
		setCopyErrorReportState("idle");
		return executeAdminApiRequest({
			method,
			path,
			base,
			query,
			body,
			tabId,
			updateTabResponse,
		});
	};

	const setTabError = (
		tabId: string,
		endpoint: string,
		method: ApiResponseView["method"],
		message: string,
		request: ApiResponseView["request"] = null,
	) => {
		setCopyErrorReportState("idle");
		updateTabResponse(tabId, {
			status: "error",
			endpoint,
			method,
			request,
			data: { message },
		});
	};

	const copyActiveErrorReport = async () => {
		if (activeTabResponse.status !== "error") return;

		const payload = {
			generatedAt: new Date().toISOString(),
			request: activeTabResponse.request ?? {
				url: activeTabResponse.endpoint,
				path: "",
				query: null,
				body: null,
			},
			response: activeTabResponse.data,
		};

		try {
			await navigator.clipboard.writeText(toPrettyJson(payload));
			setCopyErrorReportState("copied");
		} catch {
			setCopyErrorReportState("failed");
		}
	};

	const copyStreamEvent = async (event: StreamEventView, eventKey: string) => {
		const payload = {
			event: event.event,
			id: event.id,
			retry: event.retry,
			receivedAt: event.receivedAt,
			rawData: event.rawData,
			data: event.data,
		};

		try {
			await navigator.clipboard.writeText(toPrettyJson(payload));
			setCopiedStreamEventKey(eventKey);
			setTimeout(() => {
				setCopiedStreamEventKey((current) =>
					current === eventKey ? null : current,
				);
			}, 1200);
		} catch {
			setCopiedStreamEventKey(null);
		}
	};

	const addNewTab = () => {
		const nextId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		setTabs((prevTabs) => [
			...prevTabs,
			{
				id: nextId,
				apiToolId: "service",
				apiActionId: "service-health",
				response: createIdleResponse(),
			},
		]);
		setActiveTabId(nextId);
	};

	const closeTab = (tabId: string) => {
		if (tabs.length <= 1) return;
		const closingIndex = tabs.findIndex((tab) => tab.id === tabId);
		const nextTabs = tabs.filter((tab) => tab.id !== tabId);
		setTabs(nextTabs);

		if (activeTabId === tabId) {
			const nextActive =
				nextTabs[Math.max(0, closingIndex - 1)]?.id ?? nextTabs[0]?.id;
			if (nextActive) setActiveTabId(nextActive);
		}
	};

	const updateTabApiAction = (tabId: string, apiActionId: ApiActionId) => {
		setTabs((prevTabs) =>
			prevTabs.map((tab) =>
				tab.id === tabId
					? {
							...tab,
							apiActionId,
							apiToolId: getApiToolForAction(apiActionId),
							response: createIdleResponse(),
						}
					: tab,
			),
		);
	};

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const submitWorkflowRequestForTab = async (
		tabId: string,
		options?: { forceRunAll?: boolean },
	) => {
		await submitWorkflowRequestImpl({
			tabId,
			base,
			workflowBody,
			workflowCommand,
			artifactTag,
			stegoPayload,
			callApi,
			setTabError,
			options,
		});
	};

	const runTabActionForTab = async (tab: ApiWorkspaceTab) => {
		bumpAdminApiActionUseCount(tab.apiActionId);
		await runTabAction({
			tab,
			base,
			cacheTarget,
			fsPath,
			fsRecursive,
			fsLimit,
			jsonReadPath,
			jsonWritePath,
			jsonWriteBody,
			workflowCommand,
			artifactTag,
			workflowBody,
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
			triggerAnglesMode,
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
			receiverPostJson,
			receiverSenderUserId,
			receiverCompressedBitstring,
			receiverStream,
			receiverPreviewUseCache,
			receiverMaxPaddingBits,
			callApi,
			setTabError,
			submitWorkflowRequest: submitWorkflowRequestForTab,
		});
	};

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={handleFileSelect}
					onPathSelect={handlePathSelect}
					selectedFile={null}
					selectedPathId={selectedPathId}
				/>
			</div>

			<div className="flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="space-y-2">
						<h1 className="font-bold text-3xl">Admin API Console</h1>
						<p className="text-sm text-white/50">
							Open APIs in tabs, run calls, compare responses.
						</p>
						<div className="rounded-lg border border-white/10 bg-white/5 p-3">
							<label className="text-white/60 text-xs">Backend Base URL</label>
							<input
								className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								onChange={(e) => setBaseUrl(e.target.value)}
								placeholder="http://localhost:5001/api/v1"
								value={baseUrl}
							/>
						</div>
					</header>

					<AdminApiTabWorkspace
						activeTab={activeTab}
						activeTabId={activeTabId}
						artifactsListCount={artifactsListCount}
						artifactsListOffset={artifactsListOffset}
						artifactsListTag={artifactsListTag}
						artifactsObjectBody={artifactsObjectBody}
						artifactsObjectFilename={artifactsObjectFilename}
						artifactsPostFilename={artifactsPostFilename}
						artifactsPostSaveBody={artifactsPostSaveBody}
						artifactsStep={artifactsStep}
						artifactTag={artifactTag}
						base={base}
						batchAnglesDeterminismPostIds={batchAnglesDeterminismPostIds}
						batchAnglesDeterminismStep={batchAnglesDeterminismStep}
						batchAnglesDeterminismStream={batchAnglesDeterminismStream}
						cacheTarget={cacheTarget}
						callApi={callApi}
						fsLimit={fsLimit}
						fsPath={fsPath}
						fsRecursive={fsRecursive}
						genAnglesCount={genAnglesCount}
						genAnglesOffset={genAnglesOffset}
						genAnglesStream={genAnglesStream}
						jsonReadPath={jsonReadPath}
						jsonWriteBody={jsonWriteBody}
						jsonWritePath={jsonWritePath}
						kvKey={kvKey}
						kvLimit={kvLimit}
						kvOffset={kvOffset}
						kvValue={kvValue}
						onAddTab={addNewTab}
						onCloseTab={closeTab}
						onRunTabAction={runTabActionForTab}
						onSelectTab={setActiveTabId}
						onShowAdvancedApiControlsChange={setShowAdvancedApiControls}
						onUpdateTabApiAction={updateTabApiAction}
						protocolIncludePost={protocolIncludePost}
						protocolPersistCache={protocolPersistCache}
						protocolUseCache={protocolUseCache}
						receiverCompressedBitstring={receiverCompressedBitstring}
						receiverMaxPaddingBits={receiverMaxPaddingBits}
						receiverPostJson={receiverPostJson}
						receiverPreviewUseCache={receiverPreviewUseCache}
						receiverSenderUserId={receiverSenderUserId}
						receiverStream={receiverStream}
						searchProvider={searchProvider}
						searchQuery={searchQuery}
						setArtifactsListCount={setArtifactsListCount}
						setArtifactsListOffset={setArtifactsListOffset}
						setArtifactsListTag={setArtifactsListTag}
						setArtifactsObjectBody={setArtifactsObjectBody}
						setArtifactsObjectFilename={setArtifactsObjectFilename}
						setArtifactsPostFilename={setArtifactsPostFilename}
						setArtifactsPostSaveBody={setArtifactsPostSaveBody}
						setArtifactsStep={setArtifactsStep}
						setArtifactTag={setArtifactTag}
						setBatchAnglesDeterminismPostIds={setBatchAnglesDeterminismPostIds}
						setBatchAnglesDeterminismStep={setBatchAnglesDeterminismStep}
						setBatchAnglesDeterminismStream={setBatchAnglesDeterminismStream}
						setCacheTarget={setCacheTarget}
						setFsLimit={setFsLimit}
						setFsPath={setFsPath}
						setFsRecursive={setFsRecursive}
						setGenAnglesCount={setGenAnglesCount}
						setGenAnglesOffset={setGenAnglesOffset}
						setGenAnglesStream={setGenAnglesStream}
						setJsonReadPath={setJsonReadPath}
						setJsonWriteBody={setJsonWriteBody}
						setJsonWritePath={setJsonWritePath}
						setKvKey={setKvKey}
						setKvLimit={setKvLimit}
						setKvOffset={setKvOffset}
						setKvValue={setKvValue}
						setProtocolIncludePost={setProtocolIncludePost}
						setProtocolPersistCache={setProtocolPersistCache}
						setProtocolUseCache={setProtocolUseCache}
						setReceiverCompressedBitstring={setReceiverCompressedBitstring}
						setReceiverMaxPaddingBits={setReceiverMaxPaddingBits}
						setReceiverPostJson={setReceiverPostJson}
						setReceiverPreviewUseCache={setReceiverPreviewUseCache}
						setReceiverSenderUserId={setReceiverSenderUserId}
						setReceiverStream={setReceiverStream}
						setSearchProvider={setSearchProvider}
						setSearchQuery={setSearchQuery}
						setStegoPayload={setStegoPayload}
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
						setToolsAnglesTextsJson={setToolsAnglesTextsJson}
						setToolsFetchUrl={setToolsFetchUrl}
						setToolsFetchUseCrawl4ai={setToolsFetchUseCrawl4ai}
						setToolsHaystackJson={setToolsHaystackJson}
						setToolsNeedle={setToolsNeedle}
						setToolsProcessFileName={setToolsProcessFileName}
						setToolsProcessFileStep={setToolsProcessFileStep}
						setToolsSemanticN={setToolsSemanticN}
						setToolsSemanticObjectsJson={setToolsSemanticObjectsJson}
						setToolsSemanticText={setToolsSemanticText}
						setTriggerAnglesMode={setTriggerAnglesMode}
						setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
						setValidatePersistTermsCache={setValidatePersistTermsCache}
						setValidatePostId={setValidatePostId}
						setValidatePostStream={setValidatePostStream}
						setValidateUseFetchCache={setValidateUseFetchCache}
						setValidateUseTermsCache={setValidateUseTermsCache}
						setWorkflowBody={setWorkflowBody}
						setWorkflowCommand={setWorkflowCommand}
						showAdvancedApiControls={showAdvancedApiControls}
						stegoPayload={stegoPayload}
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
						submitWorkflowRequest={submitWorkflowRequestForTab}
						tabs={tabs}
						toolsAnglesTextsJson={toolsAnglesTextsJson}
						toolsFetchUrl={toolsFetchUrl}
						toolsFetchUseCrawl4ai={toolsFetchUseCrawl4ai}
						toolsHaystackJson={toolsHaystackJson}
						toolsNeedle={toolsNeedle}
						toolsProcessFileName={toolsProcessFileName}
						toolsProcessFileStep={toolsProcessFileStep}
						toolsSemanticN={toolsSemanticN}
						toolsSemanticObjectsJson={toolsSemanticObjectsJson}
						toolsSemanticText={toolsSemanticText}
						triggerAnglesMode={triggerAnglesMode}
						validateAllowAnglesFallback={validateAllowAnglesFallback}
						validatePersistTermsCache={validatePersistTermsCache}
						validatePostId={validatePostId}
						validatePostStream={validatePostStream}
						validateUseFetchCache={validateUseFetchCache}
						validateUseTermsCache={validateUseTermsCache}
						workflowBody={workflowBody}
						workflowCommand={workflowCommand}
					/>

					<AdminApiActiveResponse
						activeTabResponse={activeTabResponse}
						copiedStreamEventKey={copiedStreamEventKey}
						copyErrorReportState={copyErrorReportState}
						onCopyActiveErrorReport={copyActiveErrorReport}
						onCopyStreamEvent={copyStreamEvent}
						onShowHeartbeatEventsChange={setShowHeartbeatEvents}
						onStreamSearchTextChange={setStreamSearchText}
						showHeartbeatEvents={showHeartbeatEvents}
						streamSearchText={streamSearchText}
					/>
				</div>
			</div>
		</div>
	);
}
