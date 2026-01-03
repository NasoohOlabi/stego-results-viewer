import { HydrateClient } from "~/trpc/server";
import { FileViewer } from "./_components/file-viewer";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="h-screen w-full text-white">
				<FileViewer />
			</main>
		</HydrateClient>
	);
}
