import type { ApiWorkspaceTab, WorkflowCommand } from "./types";
import type { CallApiFn, SetTabErrorFn } from "./tab-actions";

export interface AdminApiToolPanelsProps {
	tab: ApiWorkspaceTab;
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
	callApi: CallApiFn;
	setTabError: SetTabErrorFn;
	submitWorkflowRequest: (
		tabId: string,
		options?: { forceRunAll?: boolean }
	) => void | Promise<void>;
}
