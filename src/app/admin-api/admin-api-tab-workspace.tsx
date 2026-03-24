import {
	API_ACTION_OPTIONS,
	API_TOOL_OPTIONS,
	type ApiActionId,
	type ApiWorkspaceTab,
	type WorkflowCommand,
	getApiActionLabel,
	getApiToolLabel
} from "./types";
import { AdminApiToolPanels } from "./admin-api-tool-panels";
import type { CallApiFn, SetTabErrorFn } from "./tab-actions";

export interface AdminApiTabWorkspaceProps {
	tabs: ApiWorkspaceTab[];
	activeTabId: string;
	activeTab: ApiWorkspaceTab | undefined;
	onSelectTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onAddTab: () => void;
	onUpdateTabApiAction: (tabId: string, apiActionId: ApiActionId) => void;
	onRunTabAction: (tab: ApiWorkspaceTab) => void;
	showAdvancedApiControls: boolean;
	onShowAdvancedApiControlsChange: (value: boolean) => void;
	base: string;
	cacheTarget: string;
	setCacheTarget: (value: string) => void;
	fsPath: string;
	setFsPath: (value: string) => void;
	fsRecursive: boolean;
	setFsRecursive: (value: boolean) => void;
	fsLimit: string;
	setFsLimit: (value: string) => void;
	jsonReadPath: string;
	setJsonReadPath: (value: string) => void;
	jsonWritePath: string;
	setJsonWritePath: (value: string) => void;
	jsonWriteBody: string;
	setJsonWriteBody: (value: string) => void;
	workflowCommand: WorkflowCommand;
	setWorkflowCommand: (value: WorkflowCommand) => void;
	artifactTag: string;
	setArtifactTag: (value: string) => void;
	workflowBody: string;
	setWorkflowBody: (value: string) => void;
	stegoPayload: string;
	setStegoPayload: (value: string) => void;
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
	batchAnglesDeterminismPostIds: string;
	setBatchAnglesDeterminismPostIds: (value: string) => void;
	batchAnglesDeterminismStep: string;
	setBatchAnglesDeterminismStep: (value: string) => void;
	batchAnglesDeterminismStream: boolean;
	setBatchAnglesDeterminismStream: (value: boolean) => void;
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
	kvKey: string;
	setKvKey: (value: string) => void;
	kvValue: string;
	setKvValue: (value: string) => void;
	kvLimit: string;
	setKvLimit: (value: string) => void;
	kvOffset: string;
	setKvOffset: (value: string) => void;
	searchQuery: string;
	setSearchQuery: (value: string) => void;
	searchProvider: string;
	setSearchProvider: (value: string) => void;
	artifactsStep: string;
	setArtifactsStep: (value: string) => void;
	artifactsListCount: string;
	setArtifactsListCount: (value: string) => void;
	artifactsListOffset: string;
	setArtifactsListOffset: (value: string) => void;
	artifactsListTag: string;
	setArtifactsListTag: (value: string) => void;
	artifactsPostFilename: string;
	setArtifactsPostFilename: (value: string) => void;
	artifactsPostSaveBody: string;
	setArtifactsPostSaveBody: (value: string) => void;
	artifactsObjectFilename: string;
	setArtifactsObjectFilename: (value: string) => void;
	artifactsObjectBody: string;
	setArtifactsObjectBody: (value: string) => void;
	toolsProcessFileName: string;
	setToolsProcessFileName: (value: string) => void;
	toolsProcessFileStep: string;
	setToolsProcessFileStep: (value: string) => void;
	toolsFetchUrl: string;
	setToolsFetchUrl: (value: string) => void;
	toolsFetchUseCrawl4ai: boolean;
	setToolsFetchUseCrawl4ai: (value: boolean) => void;
	toolsSemanticText: string;
	setToolsSemanticText: (value: string) => void;
	toolsSemanticObjectsJson: string;
	setToolsSemanticObjectsJson: (value: string) => void;
	toolsSemanticN: string;
	setToolsSemanticN: (value: string) => void;
	toolsNeedle: string;
	setToolsNeedle: (value: string) => void;
	toolsHaystackJson: string;
	setToolsHaystackJson: (value: string) => void;
	toolsAnglesTextsJson: string;
	setToolsAnglesTextsJson: (value: string) => void;
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
	submitWorkflowRequest: (
		tabId: string,
		options?: { forceRunAll?: boolean }
	) => void | Promise<void>;
}

export function AdminApiTabWorkspace(props: AdminApiTabWorkspaceProps) {
	const {
		tabs,
		activeTabId,
		activeTab,
		onSelectTab,
		onCloseTab,
		onAddTab,
		onUpdateTabApiAction,
		onRunTabAction,
		showAdvancedApiControls,
		onShowAdvancedApiControlsChange,
		base,
		cacheTarget,
		setCacheTarget,
		fsPath,
		setFsPath,
		fsRecursive,
		setFsRecursive,
		fsLimit,
		setFsLimit,
		jsonReadPath,
		setJsonReadPath,
		jsonWritePath,
		setJsonWritePath,
		jsonWriteBody,
		setJsonWriteBody,
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
		submitWorkflowRequest
	} = props;

	return (
		<div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				{tabs.map((tab, index) => (
					<div
						key={tab.id}
						className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
							tab.id === activeTabId
								? "border-blue-400/60 bg-blue-500/20"
								: "border-white/10 bg-black/20"
						}`}
					>
						<button
							type="button"
							onClick={() => onSelectTab(tab.id)}
							className="text-sm hover:text-blue-200"
						>
							Tab {index + 1}: {getApiActionLabel(tab.apiActionId)}
						</button>
						<button
							type="button"
							onClick={() => onCloseTab(tab.id)}
							disabled={tabs.length === 1}
							className="rounded px-1 text-xs text-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
							title="Close tab"
						>
							x
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={onAddTab}
					className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
				>
					+ New Tab
				</button>
			</div>

			{activeTab ? (
				<div className="space-y-4">
					<div className="rounded-lg border border-white/10 bg-black/20 p-3">
						<label className="text-xs text-white/60">API in this tab</label>
						<div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
							<select
								title="API in active tab"
								value={activeTab.apiActionId}
								onChange={(e) =>
									onUpdateTabApiAction(
										activeTab.id,
										e.target.value as ApiActionId
									)
								}
								className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							>
								{API_TOOL_OPTIONS.map((tool) => (
									<optgroup key={tool.id} label={tool.label}>
										{API_ACTION_OPTIONS.filter(
											(option) => option.apiToolId === tool.id
										).map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</select>
							<button
								type="button"
								onClick={() => void onRunTabAction(activeTab)}
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							>
								Run selected API
							</button>
						</div>
						<label className="mt-2 inline-flex items-center gap-2 text-xs text-white/70">
							<input
								type="checkbox"
								checked={showAdvancedApiControls}
								onChange={(e) =>
									onShowAdvancedApiControlsChange(e.target.checked)
								}
							/>
							Show advanced controls for this API section (
							{getApiToolLabel(activeTab.apiToolId)})
						</label>
					</div>
					{showAdvancedApiControls ? (
						<AdminApiToolPanels
							tab={activeTab}
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
							setValidateAllowAnglesFallback={setValidateAllowAnglesFallback}
							protocolIncludePost={protocolIncludePost}
							setProtocolIncludePost={setProtocolIncludePost}
							protocolUseCache={protocolUseCache}
							setProtocolUseCache={setProtocolUseCache}
							protocolPersistCache={protocolPersistCache}
							setProtocolPersistCache={setProtocolPersistCache}
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
							artifactsStep={artifactsStep}
							setArtifactsStep={setArtifactsStep}
							artifactsListCount={artifactsListCount}
							setArtifactsListCount={setArtifactsListCount}
							artifactsListOffset={artifactsListOffset}
							setArtifactsListOffset={setArtifactsListOffset}
							artifactsListTag={artifactsListTag}
							setArtifactsListTag={setArtifactsListTag}
							artifactsPostFilename={artifactsPostFilename}
							setArtifactsPostFilename={setArtifactsPostFilename}
							artifactsPostSaveBody={artifactsPostSaveBody}
							setArtifactsPostSaveBody={setArtifactsPostSaveBody}
							artifactsObjectFilename={artifactsObjectFilename}
							setArtifactsObjectFilename={setArtifactsObjectFilename}
							artifactsObjectBody={artifactsObjectBody}
							setArtifactsObjectBody={setArtifactsObjectBody}
							toolsProcessFileName={toolsProcessFileName}
							setToolsProcessFileName={setToolsProcessFileName}
							toolsProcessFileStep={toolsProcessFileStep}
							setToolsProcessFileStep={setToolsProcessFileStep}
							toolsFetchUrl={toolsFetchUrl}
							setToolsFetchUrl={setToolsFetchUrl}
							toolsFetchUseCrawl4ai={toolsFetchUseCrawl4ai}
							setToolsFetchUseCrawl4ai={setToolsFetchUseCrawl4ai}
							toolsSemanticText={toolsSemanticText}
							setToolsSemanticText={setToolsSemanticText}
							toolsSemanticObjectsJson={toolsSemanticObjectsJson}
							setToolsSemanticObjectsJson={setToolsSemanticObjectsJson}
							toolsSemanticN={toolsSemanticN}
							setToolsSemanticN={setToolsSemanticN}
							toolsNeedle={toolsNeedle}
							setToolsNeedle={setToolsNeedle}
							toolsHaystackJson={toolsHaystackJson}
							setToolsHaystackJson={setToolsHaystackJson}
							toolsAnglesTextsJson={toolsAnglesTextsJson}
							setToolsAnglesTextsJson={setToolsAnglesTextsJson}
							callApi={callApi}
							setTabError={setTabError}
							submitWorkflowRequest={submitWorkflowRequest}
						/>
					) : null}
				</div>
			) : null}
		</div>
	);
}
