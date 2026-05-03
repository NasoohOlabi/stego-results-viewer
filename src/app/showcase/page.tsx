import type { Metadata } from "next";
import { Suspense } from "react";
import { ShowcaseContent } from "./showcase-content";

export const metadata: Metadata = {
	title: "Research Showcase",
};

export default function ShowcasePage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<ShowcaseContent />
		</Suspense>
	);
}
