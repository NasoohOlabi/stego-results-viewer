import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";

import { AppNav } from "~/app/_components/nav/app-nav";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: {
		default: "StegoTest Results Viewer",
		template: "%s | StegoTest Results Viewer",
	},
	description: "View the results of your StegoTest runs",
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable}`} lang="en">
			<body>
				<TRPCReactProvider>
					<Suspense fallback={null}>
						<AppNav />
					</Suspense>
					{/* Offset content by the fixed nav rail (w-14 = 3.5rem). */}
					<div className="pl-14">{children}</div>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
