import type { Metadata } from "next";
import { Suspense } from "react";
import { StegoProcessPageContent } from "./stego-process-page-content";

export const metadata: Metadata = {
	title: "Stego Process",
};

export default function StegoProcessPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen items-center justify-center text-white/50">
					Loading…
				</div>
			}
		>
			<StegoProcessPageContent />
		</Suspense>
	);
}
