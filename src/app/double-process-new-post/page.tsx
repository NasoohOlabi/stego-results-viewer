import type { Metadata } from "next";
import { Suspense } from "react";
import { DoubleProcessNewPostContent } from "./double-process-new-post-content";

export const metadata: Metadata = {
	title: "Double-process new post"
};

export default function DoubleProcessNewPostPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<DoubleProcessNewPostContent />
		</Suspense>
	);
}
