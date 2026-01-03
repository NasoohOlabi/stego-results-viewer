"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CodeViewer } from "./code-viewer";
import { FileExplorer } from "./file-explorer";

export function FileViewer() {
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const { data: files = [], isLoading: filesLoading } = api.files.listFiles.useQuery();

	const { data: fileContent, isLoading: contentLoading } = api.files.getFileContent.useQuery(
		{ filename: selectedFile! },
		{ enabled: !!selectedFile },
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
			<div className="flex-shrink-0">
				<FileExplorer
					files={files}
					selectedFile={selectedFile}
					onFileSelect={setSelectedFile}
				/>
			</div>
			<div className="flex-1 min-w-0">
				{contentLoading && selectedFile ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-white/50">Loading file content...</p>
					</div>
				) : (
					<CodeViewer content={fileContent ?? null} filename={selectedFile} />
				)}
			</div>
		</div>
	);
}
