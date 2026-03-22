"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";
import { ApiLogStreamPanel } from "../admin-api/api-log-stream-panel";

export function ApiLogsContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", enabledPaths[0]!.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [enabledPaths, isValidPath, pathname, router, searchParams]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath }
	);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					selectedFile={null}
					onFileSelect={handleFileSelect}
					selectedPathId={selectedPathId}
					onPathSelect={handlePathSelect}
				/>
			</div>
			<div className="min-w-0 flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-7xl space-y-4">
					<header className="space-y-2">
						<h1 className="text-3xl font-bold">API Logs (Live)</h1>
						<p className="text-sm text-white/55">
							Dedicated view for live `api.jsonl` streaming and filtering.
						</p>
					</header>
					<ApiLogStreamPanel />
				</div>
			</div>
		</div>
	);
}
