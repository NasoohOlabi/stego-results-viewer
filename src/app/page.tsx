import { Suspense } from "react";
import { HydrateClient } from "~/trpc/server";
import { FileViewer } from "./_components/file-viewer";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="h-screen w-full text-white">
				<Suspense
					fallback={
						<div className="flex h-screen items-center justify-center">
							<p className="text-white/50">Loading...</p>
						</div>
					}
				>
					<FileViewer />
				</Suspense>
			</main>
		</HydrateClient>
	);
}
