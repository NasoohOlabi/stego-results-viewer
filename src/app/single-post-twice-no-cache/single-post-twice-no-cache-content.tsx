"use client";

import { useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

export function SinglePostTwiceNoCacheContent() {
	const { enabledPaths, getPathIdForApiById } = usePathConfig();
	const selectedPathId = "single-post-twice-no-cache";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: enabledPaths.some((p) => p.id === selectedPathId) },
	);

	const [postId, setPostId] = useState("");
	const [payload, setPayload] = useState("");
	const [tag, setTag] = useState("");
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<unknown>(null);

	const runMutation = api.files.runSinglePostTwiceNoCache.useMutation();

	const postIdOptions = useMemo(() => {
		const ids = new Set<string>();
		for (const filename of files) {
			const stem = filename.replace(/\.json$/i, "");
			const underscoreIdx = stem.indexOf("_");
			ids.add(underscoreIdx === -1 ? stem : stem.slice(0, underscoreIdx));
		}
		return Array.from(ids).sort();
	}, [files]);

	const summary = useMemo(() => {
		if (isRecord(result) && isRecord(result.result)) return result.result;
		return null;
	}, [result]);

	const handleRun = async () => {
		setStatus("loading");
		setError(null);
		try {
			const res = await runMutation.mutateAsync({
				postId: postId.trim() || undefined,
				payload: payload.trim() || undefined,
				tag: tag.trim() || undefined,
				overwrite: true,
			});
			setResult(res);
			setStatus("success");
		} catch (e) {
			setStatus("error");
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	return (
		<div className="flex h-screen w-full text-white">
			<div className="shrink-0">
				<FileExplorer
					files={files}
					onFileSelect={() => {}}
					onPathSelect={() => {}}
					selectedFile={null}
					selectedPathId={selectedPathId}
				/>
			</div>
			<div className="min-w-0 flex-1 overflow-y-auto p-8">
				<div className="mx-auto max-w-5xl space-y-4">
					<header className="space-y-2">
						<h1 className="font-bold text-3xl">Single post twice no cache</h1>
						<p className="text-sm text-white/60">
							Runs the local script twice with fresh caches each pass, then
							shows the returned summary and the saved run folder.
						</p>
					</header>

					<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<div className="grid gap-3 md:grid-cols-2">
							<div className="flex flex-col gap-1">
								<input
									className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
									list="post-id-options"
									onChange={(e) => setPostId(e.target.value)}
									placeholder="post_id optional (pick or type)"
									value={postId}
								/>
								<datalist id="post-id-options">
									{postIdOptions.map((id) => (
										<option key={id} value={id} />
									))}
								</datalist>
							</div>
							<div className="flex gap-2">
								<input
									className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
									onChange={(e) => setTag(e.target.value)}
									placeholder="tag optional"
									value={tag}
								/>
								<button
									className="shrink-0 rounded-md border border-white/10 bg-white/10 px-3 py-2 font-medium text-xs hover:bg-white/20"
									onClick={() => setTag(String(Math.floor(Date.now() / 1000)))}
									title="Fill tag with the current Unix epoch (seconds)"
									type="button"
								>
									Use Unix epoch
								</button>
							</div>
							<div className="flex flex-col gap-1 md:col-span-2">
								<input
									className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
									onChange={(e) => setPayload(e.target.value)}
									placeholder="payload optional — plain text message (not raw bits); it is compressed/encoded automatically"
									value={payload}
								/>
								<span className="text-white/40 text-xs">
									Plain text, e.g. &quot;hello world&quot; — not a 0/1 bit
									string.
								</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								className="rounded-md bg-violet-600 px-4 py-2 font-semibold text-sm disabled:opacity-50"
								disabled={status === "loading"}
								onClick={() => void handleRun()}
								type="button"
							>
								{status === "loading" ? "Running..." : "Run script"}
							</button>
							<span className="text-sm text-white/60">{status}</span>
						</div>
						{error ? (
							<div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-red-200 text-sm">
								{error}
							</div>
						) : null}
					</section>

					{summary ? (
						<section className="rounded-xl border border-white/10 bg-white/5 p-4">
							<h2 className="mb-2 font-semibold">Latest result</h2>
							<pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap text-white/70 text-xs">
								{JSON.stringify(summary, null, 2)}
							</pre>
						</section>
					) : null}

					{result ? (
						<section className="rounded-xl border border-white/10 bg-white/5 p-4">
							<h2 className="mb-2 font-semibold">Raw response</h2>
							<pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap text-white/70 text-xs">
								{JSON.stringify(result, null, 2)}
							</pre>
						</section>
					) : null}
				</div>
			</div>
		</div>
	);
}
