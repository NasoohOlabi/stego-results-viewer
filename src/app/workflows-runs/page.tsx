import type { Metadata } from "next";
import { Suspense } from "react";
import { WorkflowsRunsContent } from "./workflows-runs-content";

export const metadata: Metadata = {
	title: "Workflow runs"
};

export default function WorkflowsRunsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<WorkflowsRunsContent />
		</Suspense>
	);
}
