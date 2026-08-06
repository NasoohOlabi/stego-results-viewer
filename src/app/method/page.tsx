import type { Metadata } from "next";
import { MethodContent } from "./method-content";

export const metadata: Metadata = {
	title: "How it works",
};

export default function MethodPage() {
	return <MethodContent />;
}
