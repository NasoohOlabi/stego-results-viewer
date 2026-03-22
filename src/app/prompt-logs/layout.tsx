import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Prompt logs"
};

export default function PromptLogsLayout({
	children
}: Readonly<{ children: React.ReactNode }>) {
	return children;
}
