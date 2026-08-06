import type { ReactNode } from "react";
import type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";

export function AdminApiToolPanelsCore(
	props: AdminApiToolPanelsProps,
): ReactNode {
	const {
		tab,
		base,
		cacheTarget,
		setCacheTarget,
		fsPath,
		setFsPath,
		fsRecursive,
		setFsRecursive,
		fsLimit,
		setFsLimit,
		jsonReadPath,
		setJsonReadPath,
		jsonWritePath,
		setJsonWritePath,
		jsonWriteBody,
		setJsonWriteBody,
		callApi,
		setTabError,
	} = props;

	switch (tab.apiToolId) {
		case "service":
			return (
				<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 className="font-semibold text-lg">Service</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi("GET", "/health", undefined, undefined, tab.id)
							}
							type="button"
						>
							GET /health
						</button>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi("GET", "/state/steps", undefined, undefined, tab.id)
							}
							type="button"
						>
							GET /state/steps
						</button>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi("GET", "/state/paths", undefined, undefined, tab.id)
							}
							type="button"
						>
							GET /state/paths
						</button>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi("GET", "/state/logs", undefined, undefined, tab.id)
							}
							type="button"
						>
							GET /state/logs
						</button>
						<button
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							onClick={() =>
								callApi("DELETE", "/state/logs", undefined, undefined, tab.id)
							}
							type="button"
						>
							DELETE /state/logs
						</button>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi("GET", "/logging/tags", undefined, undefined, tab.id)
							}
							type="button"
						>
							GET /logging/tags
						</button>
						<button
							className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
							onClick={() =>
								callApi(
									"POST",
									"/admin/kv/migrate",
									undefined,
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							POST /admin/kv/migrate
						</button>
					</div>
				</section>
			);
		case "cache-admin":
			return (
				<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 className="font-semibold text-lg">Cache Admin</h2>
					<div className="flex gap-2">
						<select
							className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setCacheTarget(e.target.value)}
							title="Cache clear target"
							value={cacheTarget}
						>
							<option value="all">all</option>
							<option value="flask">flask</option>
							<option value="url">url</option>
							<option value="angles">angles</option>
						</select>
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi(
									"GET",
									"/admin/cache/stats",
									undefined,
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							Stats
						</button>
						<button
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							onClick={() =>
								callApi(
									"POST",
									"/admin/cache/clear",
									undefined,
									{ target: cacheTarget },
									tab.id,
								)
							}
							type="button"
						>
							Clear
						</button>
					</div>
				</section>
			);
		case "state-filesystem":
			return (
				<section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
					<h2 className="font-semibold text-lg">State Filesystem</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setFsPath(e.target.value)}
							placeholder="path"
							value={fsPath}
						/>
						<input
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							onChange={(e) => setFsLimit(e.target.value)}
							placeholder="limit"
							value={fsLimit}
						/>
						<label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
							<input
								checked={fsRecursive}
								onChange={(e) => setFsRecursive(e.target.checked)}
								type="checkbox"
							/>
							recursive
						</label>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
							onClick={() =>
								callApi(
									"GET",
									"/state/fs/list",
									{
										path: fsPath,
										recursive: fsRecursive,
										limit: fsLimit,
									},
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							List
						</button>
						<button
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
							onClick={() =>
								callApi(
									"DELETE",
									"/state/fs/delete",
									{ path: fsPath, recursive: fsRecursive },
									undefined,
									tab.id,
								)
							}
							type="button"
						>
							Delete
						</button>
					</div>

					<input
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						onChange={(e) => setJsonReadPath(e.target.value)}
						placeholder="read json path"
						value={jsonReadPath}
					/>
					<button
						className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						onClick={() =>
							callApi(
								"GET",
								"/state/fs/read-json",
								{ path: jsonReadPath },
								undefined,
								tab.id,
							)
						}
						type="button"
					>
						Read JSON
					</button>

					<input
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						onChange={(e) => setJsonWritePath(e.target.value)}
						placeholder="write json path"
						value={jsonWritePath}
					/>
					<textarea
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
						onChange={(e) => setJsonWriteBody(e.target.value)}
						placeholder='{"hello":"world"}'
						title="JSON body for write-json"
						value={jsonWriteBody}
					/>
					<button
						className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
						onClick={() => {
							try {
								callApi(
									"POST",
									"/state/fs/write-json",
									undefined,
									{
										path: jsonWritePath,
										data: JSON.parse(jsonWriteBody),
										overwrite: true,
									},
									tab.id,
								);
							} catch {
								setTabError(
									tab.id,
									`${base}/state/fs/write-json`,
									"POST",
									"Invalid JSON body for write-json",
								);
							}
						}}
						type="button"
					>
						Write JSON
					</button>
				</section>
			);
		default:
			return null;
	}
}
