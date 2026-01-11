"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { CodeViewer } from "./code-viewer";
import { FileExplorer } from "./file-explorer";

export function FileViewer() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	const selectedFile = searchParams.get("filename");
	const selectedFolder =
		(searchParams.get("folder") as "side-wing" | "local") ?? "side-wing";

	const handleFileSelect = (filename: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("filename", filename);
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const handleFolderSelect = (folder: "side-wing" | "local") => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", folder);
		params.delete("filename"); // Clear selection when switching folders
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const { data: files = [], isLoading: filesLoading } =
		api.files.listFiles.useQuery({ folder: selectedFolder });

	const { data: fileContent, isLoading: contentLoading } =
		api.files.getFileContent.useQuery(
			{ filename: selectedFile!, folder: selectedFolder },
			{ enabled: !!selectedFile }
		);

	if (filesLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<p className="text-white/50">Loading files...</p>
			</div>
		);
	}

	return (
		<div className="flex h-screen w-full">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					selectedFile={selectedFile}
					onFileSelect={handleFileSelect}
					selectedFolder={selectedFolder}
					onFolderSelect={handleFolderSelect}
				/>
			</div>
			<div className="flex-1 min-w-0">
				{contentLoading && selectedFile ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-white/50">Loading file content...</p>
					</div>
				) : (
					<CodeViewer
						content={fileContent ?? null}
						filename={selectedFile}
					/>
				)}
			</div>
		</div>
	);
}
