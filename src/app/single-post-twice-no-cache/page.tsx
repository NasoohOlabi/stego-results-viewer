import type { Metadata } from "next";
import { Suspense } from "react";
import { SinglePostTwiceNoCacheContent } from "./single-post-twice-no-cache-content";

export const metadata: Metadata = {
	title: "Single post twice no cache",
};

export default function SinglePostTwiceNoCachePage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<SinglePostTwiceNoCacheContent />
		</Suspense>
	);
}
