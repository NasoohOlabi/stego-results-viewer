import type { Metadata } from "next";
import { StegoProcessPageContent } from "./stego-process-page-content";

export const metadata: Metadata = {
	title: "Stego Process",
};

export default function StegoProcessPage() {
	return <StegoProcessPageContent />;
}
