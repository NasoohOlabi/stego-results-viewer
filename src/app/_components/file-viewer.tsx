"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { CodeViewer } from "./code-viewer";
import { FileExplorer } from "./file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";

export function FileViewer() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedFile = searchParams.get("filename");
	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			params.delete("filename");
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [selectedPathId, enabledPaths, pathname, router, searchParams, isValidPath]);

	const handleFileSelect = (filename: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("filename", filename);
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		params.delete("filename");
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const { data: files = [], isLoading: filesLoading } =
		api.files.listFiles.useQuery(
			{ pathId: apiPathId },
			{ enabled: isValidPath },
		);

	const { data: fileContent, isLoading: contentLoading } =
		api.files.getFileContent.useQuery(
			{ filename: selectedFile!, pathId: apiPathId },
			{ enabled: !!selectedFile && isValidPath },
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
					selectedPathId={selectedPathId}
					onPathSelect={handlePathSelect}
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
