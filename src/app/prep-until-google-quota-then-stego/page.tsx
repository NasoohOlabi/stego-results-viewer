import type { Metadata } from "next";
import { Suspense } from "react";
import { PrepUntilGoogleQuotaThenStegoContent } from "./prep-until-google-quota-then-stego-content";

export const metadata: Metadata = {
	title: "Prep until Google quota then stego",
};

export default function PrepUntilGoogleQuotaThenStegoPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<PrepUntilGoogleQuotaThenStegoContent />
		</Suspense>
	);
}
