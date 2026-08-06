"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";
import { CodeViewer } from "./code-viewer";
import { FileExplorer } from "./file-explorer";

export function FileViewer() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, defaultPathId, getPathIdForApiById } = usePathConfig();

	const selectedFile = searchParams.get("filename");
	const selectedPathId = searchParams.get("folder") ?? defaultPathId;
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			params.delete("filename");
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [
		selectedPathId,
		enabledPaths,
		pathname,
		router,
		searchParams,
		isValidPath,
	]);

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
		<div className="flex h-screen w-full overflow-hidden">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={handleFileSelect}
					onPathSelect={handlePathSelect}
					selectedFile={selectedFile}
					selectedPathId={selectedPathId}
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="shrink-0 border-white/10 border-b bg-black/20 px-6 py-4 backdrop-blur-sm">
					<div className="mx-auto max-w-6xl">
						<h1 className="font-semibold text-2xl text-white">
							Artifact Explorer
						</h1>
						<p className="mt-1 max-w-3xl text-sm text-white/65">
							Pick a result file on the left. Parsed view is better for quick
							inspection. Raw view is useful when you need exact JSON.
						</p>
					</div>
				</div>
				{contentLoading && selectedFile ? (
					<div className="flex min-h-0 flex-1 items-center justify-center">
						<p className="text-white/50">Loading file content...</p>
					</div>
				) : (
					<div className="min-h-0 flex-1">
						<CodeViewer
							content={fileContent ?? null}
							filename={selectedFile}
							pathId={apiPathId}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
