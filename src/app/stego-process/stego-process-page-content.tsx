"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { StegoProcessVisual } from "~/app/_components/stego-process/stego-process-visual";
import { usePathConfig } from "~/hooks/use-path-config";
import { stegoResultSchema } from "~/schemas/stego-result";
import { api } from "~/trpc/react";

function parseStegoResult(content: string | null) {
	if (!content) return null;
	try {
		const parsed = JSON.parse(content) as unknown;
		const validated = stegoResultSchema.safeParse(parsed);
		return validated.success ? validated.data : null;
	} catch {
		return null;
	}
}

export function StegoProcessPageContent() {
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

	const resolvedFile = useMemo(() => {
		if (selectedFile && files.includes(selectedFile)) return selectedFile;
		return files.length > 0 ? (files[files.length - 1] ?? null) : null;
	}, [files, selectedFile]);

	const { data: fileContent, isLoading: contentLoading } =
		api.files.getFileContent.useQuery(
			{ filename: resolvedFile ?? "", pathId: apiPathId },
			{ enabled: Boolean(resolvedFile) && isValidPath },
		);

	const stegoData = useMemo(
		() => parseStegoResult(fileContent ?? null),
		[fileContent],
	);

	return (
		<div className="flex h-screen w-full overflow-hidden">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={handleFileSelect}
					onPathSelect={handlePathSelect}
					selectedFile={resolvedFile}
					selectedPathId={selectedPathId}
				/>
			</div>
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="shrink-0 border-white/10 border-b bg-black/20 px-6 py-4 backdrop-blur-sm">
					<div className="mx-auto w-full max-w-[1200px]">
						<h1 className="font-semibold text-2xl text-white">Stego Process</h1>
						<p className="mt-1 text-sm text-white/65">
							Showing process stages from the selected result artifact.
						</p>
						{resolvedFile ? (
							<p className="mt-1 font-mono text-white/45 text-xs">
								{resolvedFile}
							</p>
						) : null}
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-auto px-6 py-6">
					<div className="mx-auto w-full max-w-[1200px]">
						{filesLoading ? (
							<p className="text-white/50">Loading files...</p>
						) : contentLoading ? (
							<p className="text-white/50">Loading artifact...</p>
						) : stegoData ? (
							<StegoProcessVisual data={stegoData} filename={resolvedFile} />
						) : (
							<StegoProcessVisual filename={resolvedFile} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
