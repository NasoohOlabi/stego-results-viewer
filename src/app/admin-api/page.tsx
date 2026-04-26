import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminApiTabsShell } from "./admin-api-tabs-shell";

export const metadata: Metadata = {
	title: "Admin API",
};

export default function AdminApiPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<AdminApiTabsShell />
		</Suspense>
	);
}
