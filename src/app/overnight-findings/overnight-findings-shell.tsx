"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

function setFolderParam(pathname: string, folder: string) {
	const params = new URLSearchParams();
	params.set("folder", folder);
	return `${pathname}?${params.toString()}`;
}

export function OvernightFindingsShell({ children }: { children: ReactNode }) {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((path) => path.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const fallbackPath = enabledPaths[0];
			if (fallbackPath) {
				router.replace(setFolderParam(pathname, fallbackPath.id));
			}
		}
	}, [enabledPaths, isValidPath, pathname, router]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const handleFileSelect = (filename: string) => {
		const params = new URLSearchParams();
		params.set("filename", filename);
		params.set("folder", selectedPathId);
		router.push(`/?${params.toString()}`);
	};

	const handlePathSelect = (pathId: string) => {
		router.push(setFolderParam(pathname, pathId));
	};

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={handleFileSelect}
					onPathSelect={handlePathSelect}
					selectedFile={null}
					selectedPathId={selectedPathId}
				/>
			</div>
			<div className="flex-1 overflow-y-auto">{children}</div>
		</div>
	);
}
