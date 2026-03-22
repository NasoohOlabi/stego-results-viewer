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
	runTabAction,
	submitWorkflowRequest as submitWorkflowRequestImpl,
	type CallApiFn
} from "./tab-actions";
import {
	ADMIN_API_STORAGE_KEY,
	createIdleResponse,
	getApiToolForAction,
	getDefaultApiActionForTool,
	isApiActionId,
	isApiToolId,
	isWorkflowCommand,
	type ApiActionId,
	type ApiResponseView,
	type ApiWorkspaceTab,
	type PersistedAdminApiState,
	type StreamEventView,
	type WorkflowCommand
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
		{ enabled: isValidPath }
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [tabs, setTabs] = useState<ApiWorkspaceTab[]>([
		{
			id: "tab-1",
			apiToolId: "service",
			apiActionId: "service-health",
			response: createIdleResponse()
		}
	]);
	const [activeTabId, setActiveTabId] = useState("tab-1");

	const [cacheTarget, setCacheTarget] = useState("all");
	const [fsPath, setFsPath] = useState("metrics");
	const [fsRecursive, setFsRecursive] = useState(false);
	const [fsLimit, setFsLimit] = useState("100");
	const [jsonReadPath, setJsonReadPath] = useState(
		"metrics/divergence_metrics_latest.json"
	);
	const [jsonWritePath, setJsonWritePath] = useState(
		"metrics/manual_write.json"
	);
	const [jsonWriteBody, setJsonWriteBody] = useState(
		'{\n  "hello": "world"\n}'
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
	const [workflowBody, setWorkflowBody] = useState(
		getWorkflowTemplate("data-load")
	);
	const [kvKey, setKvKey] = useState("test_key");
	const [kvValue, setKvValue] = useState(
		'{\n  "value": {\n    "ok": true\n  }\n}'
	);
	const [kvLimit, setKvLimit] = useState("20");
	const [kvOffset, setKvOffset] = useState("0");
	const [searchQuery, setSearchQuery] = useState("steganography");
	const [searchProvider, setSearchProvider] = useState("bing");
	const [copyErrorReportState, setCopyErrorReportState] = useState<
		"idle" | "copied" | "failed"
	>("idle");
	const [copiedStreamEventKey, setCopiedStreamEventKey] = useState<
		string | null
	>(null);
	const [showHeartbeatEvents, setShowHeartbeatEvents] = useState(false);
	const [streamSearchText, setStreamSearchText] = useState("");
	const [showAdvancedApiControls, setShowAdvancedApiControls] =
		useState(false);
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
				typeof (parsed as { artifactStep?: string }).artifactStep ===
				"string"
			) {
				const legacy = (parsed as { artifactStep: string }).artifactStep;
				const fromStep: Partial<Record<string, WorkflowCommand>> = {
					"filter-url-unresolved": "data-load",
					"filter-researched": "research",
					"angles-step": "gen-angles",
					"final-step": "stego"
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
			if (typeof parsed.kvKey === "string") setKvKey(parsed.kvKey);
			if (typeof parsed.kvValue === "string") setKvValue(parsed.kvValue);
			if (typeof parsed.kvLimit === "string") setKvLimit(parsed.kvLimit);
			if (typeof parsed.kvOffset === "string") setKvOffset(parsed.kvOffset);
			if (typeof parsed.searchQuery === "string")
				setSearchQuery(parsed.searchQuery);
			if (typeof parsed.searchProvider === "string")
				setSearchProvider(parsed.searchProvider);
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
							typeof (candidate.response as ApiResponseView).status ===
								"string"
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
			kvKey,
			kvValue,
			kvLimit,
			kvOffset,
			searchQuery,
			searchProvider,
			showHeartbeatEvents,
			streamSearchText,
			showAdvancedApiControls
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
		kvKey,
		kvValue,
		kvLimit,
		kvOffset,
		searchQuery,
		searchProvider,
		showHeartbeatEvents,
		streamSearchText,
		showAdvancedApiControls
	]);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);
	const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
	const activeTabResponse = activeTab?.response ?? createIdleResponse();

	const updateTabResponse = (tabId: string, response: ApiResponseView) => {
		setTabs((prevTabs) =>
			prevTabs.map((tab) => (tab.id === tabId ? { ...tab, response } : tab))
		);
	};

	const callApi: CallApiFn = async (
		method,
		path,
		query,
		body,
		tabId = activeTabId
	) => {
		setCopyErrorReportState("idle");
		return executeAdminApiRequest({
			method,
			path,
			base,
			query,
			body,
			tabId,
			updateTabResponse
		});
	};

	const setTabError = (
		tabId: string,
		endpoint: string,
		method: ApiResponseView["method"],
		message: string,
		request: ApiResponseView["request"] = null
	) => {
		setCopyErrorReportState("idle");
		updateTabResponse(tabId, {
			status: "error",
			endpoint,
			method,
			request,
			data: { message }
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
				body: null
			},
			response: activeTabResponse.data
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
			data: event.data
		};

		try {
			await navigator.clipboard.writeText(toPrettyJson(payload));
			setCopiedStreamEventKey(eventKey);
			setTimeout(() => {
				setCopiedStreamEventKey((current) =>
					current === eventKey ? null : current
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
				response: createIdleResponse()
			}
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
							response: createIdleResponse()
						}
					: tab
			)
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
		options?: { forceRunAll?: boolean }
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
			options
		});
	};

	const runTabActionForTab = async (tab: ApiWorkspaceTab) => {
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
			validatePostId,
			validatePostStream,
			validateUseTermsCache,
			validatePersistTermsCache,
			validateUseFetchCache,
			validateAllowAnglesFallback,
			protocolIncludePost,
			protocolUseCache,
			protocolPersistCache,
			callApi,
			setTabError,
			submitWorkflowRequest: submitWorkflowRequestForTab
		});
	};

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					selectedFile={null}
					onFileSelect={handleFileSelect}
					selectedPathId={selectedPathId}
					onPathSelect={handlePathSelect}
				/>
			</div>

			<div className="flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-7xl space-y-6">
					<header className="space-y-2">
						<h1 className="text-3xl font-bold">Admin API Console</h1>
						<p className="text-sm text-white/50">
							Open APIs in tabs, run calls, compare responses.
						</p>
						<div className="rounded-lg border border-white/10 bg-white/5 p-3">
							<label className="text-xs text-white/60">
								Backend Base URL
							</label>
							<input
								value={baseUrl}
								onChange={(e) => setBaseUrl(e.target.value)}
								className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								placeholder="http://localhost:5001/api/v1"
							/>
						</div>
					</header>

					<AdminApiTabWorkspace
						tabs={tabs}
						activeTabId={activeTabId}
						activeTab={activeTab}
						onSelectTab={setActiveTabId}
						onCloseTab={closeTab}
						onAddTab={addNewTab}
						onUpdateTabApiAction={updateTabApiAction}
						onRunTabAction={runTabActionForTab}
						showAdvancedApiControls={showAdvancedApiControls}
						onShowAdvancedApiControlsChange={setShowAdvancedApiControls}
						base={base}
						cacheTarget={cacheTarget}
						setCacheTarget={setCacheTarget}
						fsPath={fsPath}
						setFsPath={setFsPath}
						fsRecursive={fsRecursive}
						setFsRecursive={setFsRecursive}
						fsLimit={fsLimit}
						setFsLimit={setFsLimit}
						jsonReadPath={jsonReadPath}
						setJsonReadPath={setJsonReadPath}
						jsonWritePath={jsonWritePath}
						setJsonWritePath={setJsonWritePath}
						jsonWriteBody={jsonWriteBody}
						setJsonWriteBody={setJsonWriteBody}
						workflowCommand={workflowCommand}
						setWorkflowCommand={setWorkflowCommand}
						artifactTag={artifactTag}
						setArtifactTag={setArtifactTag}
						workflowBody={workflowBody}
						setWorkflowBody={setWorkflowBody}
						stegoPayload={stegoPayload}
						setStegoPayload={setStegoPayload}
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
						setValidateAllowAnglesFallback={
							setValidateAllowAnglesFallback
						}
						protocolIncludePost={protocolIncludePost}
						setProtocolIncludePost={setProtocolIncludePost}
						protocolUseCache={protocolUseCache}
						setProtocolUseCache={setProtocolUseCache}
						protocolPersistCache={protocolPersistCache}
						setProtocolPersistCache={setProtocolPersistCache}
						kvKey={kvKey}
						setKvKey={setKvKey}
						kvValue={kvValue}
						setKvValue={setKvValue}
						kvLimit={kvLimit}
						setKvLimit={setKvLimit}
						kvOffset={kvOffset}
						setKvOffset={setKvOffset}
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						searchProvider={searchProvider}
						setSearchProvider={setSearchProvider}
						callApi={callApi}
						setTabError={setTabError}
						submitWorkflowRequest={submitWorkflowRequestForTab}
					/>

					<AdminApiActiveResponse
						activeTabResponse={activeTabResponse}
						copyErrorReportState={copyErrorReportState}
						onCopyActiveErrorReport={copyActiveErrorReport}
						showHeartbeatEvents={showHeartbeatEvents}
						onShowHeartbeatEventsChange={setShowHeartbeatEvents}
						streamSearchText={streamSearchText}
						onStreamSearchTextChange={setStreamSearchText}
						copiedStreamEventKey={copiedStreamEventKey}
						onCopyStreamEvent={copyStreamEvent}
					/>
				</div>
			</div>
		</div>
	);
}
