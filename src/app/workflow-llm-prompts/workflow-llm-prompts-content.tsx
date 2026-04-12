"use client";

import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileExplorer } from "~/app/_components/file-explorer";
import { ADMIN_API_STORAGE_KEY } from "~/app/admin-api/types";
import { usePathConfig } from "~/hooks/use-path-config";
import { api } from "~/trpc/react";

const PROMPTS_PATH = "/prompts/workflow-llm";
const RESET_PATH = "/prompts/workflow-llm/reset";

interface PromptsEnvelope {
	ok?: boolean;
	data?: { prompts?: unknown; path?: string };
	error?: string;
	message?: string;
}

function formatPromptsJson(prompts: unknown): string {
	return JSON.stringify(prompts, null, 2);
}

function tryParseJson(
	text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
	try {
		return { ok: true, value: JSON.parse(text) as unknown };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, error: msg };
	}
}

export function WorkflowLlmPromptsContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const { enabledPaths, getPathIdForApiById } = usePathConfig();

	const selectedPathId = searchParams.get("folder") ?? "side-wing";
	const apiPathId = getPathIdForApiById(selectedPathId) ?? selectedPathId;
	const isValidPath = enabledPaths.some((p) => p.id === selectedPathId);

	useEffect(() => {
		if (!isValidPath && enabledPaths.length > 0) {
			const first = enabledPaths[0];
			if (!first) return;
			const params = new URLSearchParams(searchParams.toString());
			params.set("folder", first.id);
			router.replace(`${pathname}?${params.toString()}`);
		}
	}, [enabledPaths, isValidPath, pathname, router, searchParams]);

	const { data: files = [] } = api.files.listFiles.useQuery(
		{ pathId: apiPathId },
		{ enabled: isValidPath },
	);

	const [baseUrl, setBaseUrl] = useState("http://localhost:5001/api/v1");
	const [editorText, setEditorText] = useState("");
	const [baselineText, setBaselineText] = useState("");
	const [serverPath, setServerPath] = useState<string | null>(null);
	const [loadStatus, setLoadStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [saveStatus, setSaveStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [resetStatus, setResetStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const base = useMemo(() => baseUrl.replace(/\/+$/, ""), [baseUrl]);

	const parseState = useMemo(() => tryParseJson(editorText), [editorText]);
	const jsonValid = parseState.ok;
	const dirty = editorText !== baselineText;

	useEffect(() => {
		if (!dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [dirty]);

	const applyLoadedPrompts = useCallback(
		(prompts: unknown, path: string | undefined) => {
			const text = formatPromptsJson(prompts);
			setEditorText(text);
			setBaselineText(text);
			setServerPath(typeof path === "string" ? path : null);
		},
		[],
	);

	const loadPrompts = useCallback(async () => {
		setLoadStatus("loading");
		setSaveStatus("idle");
		setResetStatus("idle");
		setErrorMessage(null);
		try {
			const res = await fetch(`${base}${PROMPTS_PATH}`, {
				method: "GET",
				headers: { "Content-Type": "application/json" },
			});
			const payload = (await res.json()) as PromptsEnvelope;
			if (!res.ok) {
				throw new Error(
					payload.error ?? payload.message ?? `HTTP ${res.status}`,
				);
			}
			if (payload.ok !== true) {
				throw new Error(
					typeof payload.error === "string"
						? payload.error
						: "Server returned ok: false",
				);
			}
			const data = payload.data;
			if (!data || data.prompts === undefined) {
				throw new Error("Response missing data.prompts");
			}
			applyLoadedPrompts(data.prompts, data.path);
			setLoadStatus("success");
		} catch (e) {
			setLoadStatus("error");
			setErrorMessage(e instanceof Error ? e.message : "Request failed");
		}
	}, [base, applyLoadedPrompts]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			let resolvedBase = "http://localhost:5001/api/v1";
			try {
				const raw = localStorage.getItem(ADMIN_API_STORAGE_KEY);
				if (raw) {
					const parsed = JSON.parse(raw) as { baseUrl?: unknown };
					if (typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
						resolvedBase = parsed.baseUrl.trim();
					}
				}
			} catch {
				// ignore
			}
			if (cancelled) return;
			setBaseUrl(resolvedBase);
			const b = resolvedBase.replace(/\/+$/, "");
			setLoadStatus("loading");
			setErrorMessage(null);
			try {
				const res = await fetch(`${b}${PROMPTS_PATH}`, {
					method: "GET",
					headers: { "Content-Type": "application/json" },
				});
				const payload = (await res.json()) as PromptsEnvelope;
				if (cancelled) return;
				if (!res.ok) {
					throw new Error(
						payload.error ?? payload.message ?? `HTTP ${res.status}`,
					);
				}
				if (payload.ok !== true) {
					throw new Error(
						typeof payload.error === "string"
							? payload.error
							: "Server returned ok: false",
					);
				}
				const data = payload.data;
				if (!data || data.prompts === undefined) {
					throw new Error("Response missing data.prompts");
				}
				applyLoadedPrompts(data.prompts, data.path);
				setLoadStatus("success");
			} catch (e) {
				if (cancelled) return;
				setLoadStatus("error");
				setErrorMessage(e instanceof Error ? e.message : "Request failed");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [applyLoadedPrompts]);

	const savePrompts = useCallback(async () => {
		if (!parseState.ok) return;
		setSaveStatus("loading");
		setErrorMessage(null);
		try {
			const res = await fetch(`${base}${PROMPTS_PATH}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompts: parseState.value }),
			});
			const payload = (await res.json()) as PromptsEnvelope;
			if (!res.ok) {
				throw new Error(
					payload.error ?? payload.message ?? `HTTP ${res.status}`,
				);
			}
			if (payload.ok !== true) {
				throw new Error(
					typeof payload.error === "string"
						? payload.error
						: "Server returned ok: false",
				);
			}
			setBaselineText(editorText);
			setSaveStatus("success");
			const pathFromData =
				payload.data &&
				typeof payload.data === "object" &&
				payload.data !== null
					? (payload.data as { path?: string }).path
					: undefined;
			if (typeof pathFromData === "string") setServerPath(pathFromData);
		} catch (e) {
			setSaveStatus("error");
			setErrorMessage(e instanceof Error ? e.message : "Save failed");
		}
	}, [base, editorText, parseState]);

	const resetPrompts = useCallback(async () => {
		if (
			!window.confirm(
				"Reset workflow LLM prompts to baked-in defaults on the server?",
			)
		) {
			return;
		}
		setResetStatus("loading");
		setErrorMessage(null);
		try {
			const res = await fetch(`${base}${RESET_PATH}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			const payload = (await res.json()) as PromptsEnvelope;
			if (!res.ok) {
				throw new Error(
					payload.error ?? payload.message ?? `HTTP ${res.status}`,
				);
			}
			if (payload.ok !== true) {
				throw new Error(
					typeof payload.error === "string"
						? payload.error
						: "Server returned ok: false",
				);
			}
			setResetStatus("success");
			await loadPrompts();
		} catch (e) {
			setResetStatus("error");
			setErrorMessage(e instanceof Error ? e.message : "Reset failed");
		}
	}, [base, loadPrompts]);

	const handleFileSelect = (filename: string) => {
		router.push(`/?filename=${filename}&folder=${selectedPathId}`);
	};

	const handlePathSelect = (pathId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("folder", pathId);
		router.push(`${pathname}?${params.toString()}`);
	};

	const saveDisabled =
		!dirty ||
		!jsonValid ||
		loadStatus === "loading" ||
		saveStatus === "loading";

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
			<div className="min-w-0 flex-1 overflow-hidden p-8">
				<div className="mx-auto flex h-full max-w-7xl flex-col space-y-4">
					<header className="shrink-0 space-y-2">
						<h1 className="font-bold text-3xl">Workflow LLM prompts</h1>
						<p className="text-sm text-white/55">
							View and edit <code>GET/PUT /prompts/workflow-llm</code> and reset
							via <code>POST /prompts/workflow-llm/reset</code>. Templates use
							Python <code className="text-white/70">str.format</code>; keep
							required <code className="text-white/70">{"{placeholders}"}</code>{" "}
							or workflows may fail at runtime.
						</p>
					</header>

					<section className="shrink-0 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
						<div className="flex flex-wrap items-center gap-3">
							<input
								className="min-w-[200px] flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm"
								onChange={(event) => setBaseUrl(event.target.value)}
								placeholder="http://localhost:5001/api/v1"
								value={baseUrl}
							/>
							<button
								className="rounded-md bg-emerald-500/20 px-3 py-2 text-sm hover:bg-emerald-500/30 disabled:opacity-50"
								disabled={loadStatus === "loading"}
								onClick={() => void loadPrompts()}
								type="button"
							>
								Reload
							</button>
							<button
								className="rounded-md bg-sky-500/20 px-3 py-2 text-sm hover:bg-sky-500/30 disabled:opacity-50"
								disabled={saveDisabled}
								onClick={() => void savePrompts()}
								type="button"
							>
								Save
							</button>
							<button
								className="rounded-md bg-amber-500/20 px-3 py-2 text-sm hover:bg-amber-500/30 disabled:opacity-50"
								disabled={resetStatus === "loading" || loadStatus === "loading"}
								onClick={() => void resetPrompts()}
								type="button"
							>
								Reset defaults
							</button>
						</div>
						<div className="text-white/60 text-xs">
							<span className="font-medium text-white/85">
								Load:{" "}
								{loadStatus === "loading"
									? "Loading…"
									: loadStatus === "error"
										? "Error"
										: loadStatus === "success"
											? "Ready"
											: "Idle"}
							</span>
							{" · "}
							<span>
								Save:{" "}
								{saveStatus === "loading"
									? "Saving…"
									: saveStatus === "error"
										? "Error"
										: saveStatus === "success"
											? "Saved"
											: "—"}
							</span>
							{" · "}
							<span>
								Reset:{" "}
								{resetStatus === "loading"
									? "Working…"
									: resetStatus === "error"
										? "Error"
										: resetStatus === "success"
											? "Done"
											: "—"}
							</span>
							{serverPath ? (
								<>
									{" · "}
									<span className="text-white/50">File:</span>{" "}
									<code className="text-white/80">{serverPath}</code>
								</>
							) : null}
							{dirty ? (
								<>
									{" · "}
									<span className="text-amber-300/90">Unsaved changes</span>
								</>
							) : null}
						</div>
						{!jsonValid && editorText.trim() !== "" ? (
							<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 font-mono text-amber-200 text-xs">
								Invalid JSON: {parseState.ok ? "" : parseState.error}
							</div>
						) : null}
						{errorMessage ? (
							<div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-red-200 text-sm">
								{errorMessage}
							</div>
						) : null}
					</section>

					<section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/50">
						<div className="h-full min-h-[50vh]">
							<CodeMirror
								basicSetup={{
									lineNumbers: true,
									foldGutter: true,
									dropCursor: false,
									allowMultipleSelections: false,
									syntaxHighlighting: true,
								}}
								className="h-full [&_.cm-editor]:min-h-[50vh]"
								editable={loadStatus !== "loading"}
								extensions={[json()]}
								height="100%"
								onChange={(value) => {
									setEditorText(value);
									setSaveStatus("idle");
								}}
								theme={oneDark}
								value={editorText}
							/>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
