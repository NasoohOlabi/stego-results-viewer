import type { ReactNode } from "react";
import type { AdminApiToolPanelsProps } from "./admin-api-tool-panels-props";

export function AdminApiToolPanelsCore(
	props: AdminApiToolPanelsProps
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
		setTabError
	} = props;

	switch (tab.apiToolId) {
		case "service":
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">Service</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/health",
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							GET /health
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/state/steps",
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							GET /state/steps
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/state/paths",
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							GET /state/paths
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"POST",
									"/admin/kv/migrate",
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
						>
							POST /admin/kv/migrate
						</button>
					</div>
				</section>
			);
		case "cache-admin":
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">Cache Admin</h2>
					<div className="flex gap-2">
						<select
							title="Cache clear target"
							value={cacheTarget}
							onChange={(e) => setCacheTarget(e.target.value)}
							className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						>
							<option value="all">all</option>
							<option value="flask">flask</option>
							<option value="url">url</option>
							<option value="angles">angles</option>
						</select>
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/admin/cache/stats",
									undefined,
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							Stats
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"POST",
									"/admin/cache/clear",
									undefined,
									{ target: cacheTarget },
									tab.id
								)
							}
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
						>
							Clear
						</button>
					</div>
				</section>
			);
		case "state-filesystem":
			return (
				<section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
					<h2 className="text-lg font-semibold">State Filesystem</h2>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
						<input
							value={fsPath}
							onChange={(e) => setFsPath(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="path"
						/>
						<input
							value={fsLimit}
							onChange={(e) => setFsLimit(e.target.value)}
							className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
							placeholder="limit"
						/>
						<label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm">
							<input
								type="checkbox"
								checked={fsRecursive}
								onChange={(e) => setFsRecursive(e.target.checked)}
							/>
							recursive
						</label>
					</div>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={() =>
								callApi(
									"GET",
									"/state/fs/list",
									{
										path: fsPath,
										recursive: fsRecursive,
										limit: fsLimit
									},
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
						>
							List
						</button>
						<button
							type="button"
							onClick={() =>
								callApi(
									"DELETE",
									"/state/fs/delete",
									{ path: fsPath, recursive: fsRecursive },
									undefined,
									tab.id
								)
							}
							className="rounded-md bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
						>
							Delete
						</button>
					</div>

					<input
						value={jsonReadPath}
						onChange={(e) => setJsonReadPath(e.target.value)}
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						placeholder="read json path"
					/>
					<button
						type="button"
						onClick={() =>
							callApi(
								"GET",
								"/state/fs/read-json",
								{ path: jsonReadPath },
								undefined,
								tab.id
							)
						}
						className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30"
					>
						Read JSON
					</button>

					<input
						value={jsonWritePath}
						onChange={(e) => setJsonWritePath(e.target.value)}
						className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
						placeholder="write json path"
					/>
					<textarea
						title="JSON body for write-json"
						placeholder='{"hello":"world"}'
						value={jsonWriteBody}
						onChange={(e) => setJsonWriteBody(e.target.value)}
						className="min-h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono"
					/>
					<button
						type="button"
						onClick={() => {
							try {
								callApi(
									"POST",
									"/state/fs/write-json",
									undefined,
									{
										path: jsonWritePath,
										data: JSON.parse(jsonWriteBody),
										overwrite: true
									},
									tab.id
								);
							} catch {
								setTabError(
									tab.id,
									`${base}/state/fs/write-json`,
									"POST",
									"Invalid JSON body for write-json"
								);
							}
						}}
						className="rounded-md bg-blue-500/20 px-3 py-2 text-sm hover:bg-blue-500/30"
					>
						Write JSON
					</button>
				</section>
			);
		default:
			return null;
	}
}
