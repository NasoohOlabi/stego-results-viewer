import type { Metadata } from "next";
import { Suspense } from "react";
import { ApiLogsContent } from "./api-logs-content";

export const metadata: Metadata = {
	title: "API logs (live)"
};

export default function ApiLogsPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ApiLogsContent />
		</Suspense>
	);
}
