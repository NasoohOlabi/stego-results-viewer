import { AdminApiToolPanels } from "./admin-api-tool-panels";
import type { CallApiFn, SetTabErrorFn } from "./tab-actions";
import {
	API_ACTION_OPTIONS,
	API_TOOL_OPTIONS,
	type ApiActionId,
	type ApiWorkspaceTab,
	getApiActionLabel,
	getApiToolLabel,
	type TriggerAnglesMode,
	type WorkflowCommand,
} from "./types";

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
		options?: { forceRunAll?: boolean },
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

	return (
		<div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
			<div className="flex flex-wrap items-center gap-2">
				{tabs.map((tab, index) => (
					<div
						className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
							tab.id === activeTabId
								? "border-blue-400/60 bg-blue-500/20"
								: "border-white/10 bg-black/20"
						}`}
						key={tab.id}
					>
						<button
							className="text-sm hover:text-blue-200"
							onClick={() => onSelectTab(tab.id)}
							type="button"
						>
							Tab {index + 1}: {getApiActionLabel(tab.apiActionId)}
						</button>
						<button
							className="rounded px-1 text-white/60 text-xs hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
							disabled={tabs.length === 1}
							onClick={() => onCloseTab(tab.id)}
							title="Close tab"
							type="button"
						>
							x
						</button>
					</div>
				))}
				<button
					className="rounded-md border border-white/20 bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
					onClick={onAddTab}
					type="button"
				>
					+ New Tab
				</button>
			</div>

			{activeTab ? (
				<div className="space-y-4">
					<div className="rounded-lg border border-white/10 bg-black/20 p-3">
						<label className="text-white/60 text-xs">API in this tab</label>
						<div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
							<select
								className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								onChange={(e) =>
									onUpdateTabApiAction(
										activeTab.id,
										e.target.value as ApiActionId,
									)
								}
								title="API in active tab"
								value={activeTab.apiActionId}
							>
								{API_TOOL_OPTIONS.map((tool) => (
									<optgroup key={tool.id} label={tool.label}>
										{API_ACTION_OPTIONS.filter(
											(option) => option.apiToolId === tool.id,
										).map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</select>
							<button
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
								onClick={() => void onRunTabAction(activeTab)}
								type="button"
							>
								Run selected API
							</button>
						</div>
						<label className="mt-2 inline-flex items-center gap-2 text-white/70 text-xs">
							<input
								checked={showAdvancedApiControls}
								onChange={(e) =>
									onShowAdvancedApiControlsChange(e.target.checked)
								}
								type="checkbox"
							/>
							Show advanced controls for this API section (
							{getApiToolLabel(activeTab.apiToolId)})
						</label>
					</div>
					{showAdvancedApiControls ? (
						<AdminApiToolPanels
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
							setBatchAnglesDeterminismPostIds={
								setBatchAnglesDeterminismPostIds
							}
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
							setStegoReceiverLiveSenderUserId={
								setStegoReceiverLiveSenderUserId
							}
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
							stegoPayload={stegoPayload}
							stegoReceiverLiveAllowFallback={stegoReceiverLiveAllowFallback}
							stegoReceiverLiveCompressedBitstring={
								stegoReceiverLiveCompressedBitstring
							}
							stegoReceiverLiveListOffset={stegoReceiverLiveListOffset}
							stegoReceiverLiveMaxPaddingBits={stegoReceiverLiveMaxPaddingBits}
							stegoReceiverLiveMaxPostAttempts={
								stegoReceiverLiveMaxPostAttempts
							}
							stegoReceiverLivePayload={stegoReceiverLivePayload}
							stegoReceiverLivePostId={stegoReceiverLivePostId}
							stegoReceiverLiveSenderUserId={stegoReceiverLiveSenderUserId}
							stegoReceiverLiveSimulationRoot={stegoReceiverLiveSimulationRoot}
							stegoReceiverLiveStream={stegoReceiverLiveStream}
							stegoReceiverLiveTag={stegoReceiverLiveTag}
							submitWorkflowRequest={submitWorkflowRequest}
							tab={activeTab}
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
					) : null}
				</div>
			) : null}
		</div>
	);
}
