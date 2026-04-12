import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkflowLlmPromptsContent } from "./workflow-llm-prompts-content";

export const metadata: Metadata = {
	title: "Workflow LLM prompts",
};

export default function WorkflowLlmPromptsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<WorkflowLlmPromptsContent />
		</Suspense>
	);
}
