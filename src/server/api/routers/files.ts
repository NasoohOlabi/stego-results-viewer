import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getResolvedPath, getResultSources } from "~/server/paths";

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(process.cwd(), "..", "stego-side-wing");
const SCRIPT_PATH = join(
	REPO_ROOT,
	"scripts",
	"run_single_post_twice_no_cache.py",
);

export const filesRouter = createTRPCRouter({
	listSources: publicProcedure.query(async () => {
		return getResultSources();
	}),

	listFiles: publicProcedure
		.input(z.object({ pathId: z.string().default("side-wing") }))
		.query(async ({ input }) => {
			try {
				const path = getResolvedPath(input.pathId);
				const entries = await readdir(path, { withFileTypes: true });
				// Filter out directories and only return files
				const fileList = entries
					.filter((entry) => entry.isFile())
					.map((entry) => entry.name)
					.sort();
				return fileList;
			} catch (error) {
				console.error("Error reading directory:", error);
				throw new Error(`Failed to read directory: ${input.pathId}`);
			}
		}),

	getFileContent: publicProcedure
		.input(
			z.object({
				filename: z.string(),
				pathId: z.string().default("side-wing"),
			}),
		)
		.query(async ({ input }) => {
			try {
				const path = getResolvedPath(input.pathId);
				const filePath = join(path, input.filename);
				const content = await readFile(filePath, "utf-8");
				return content;
			} catch (error) {
				console.error("Error reading file:", error);
				throw new Error(
					`Failed to read file: ${input.filename} in ${input.pathId}`,
				);
			}
		}),

	updateFileContent: publicProcedure
		.input(
			z.object({
				filename: z.string(),
				content: z.string(),
				pathId: z.string().default("side-wing"),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				const path = getResolvedPath(input.pathId);
				const filePath = join(path, input.filename);
				await writeFile(filePath, input.content, "utf-8");
				return { ok: true as const };
			} catch (error) {
				console.error("Error writing file:", error);
				throw new Error(
					`Failed to write file: ${input.filename} in ${input.pathId}`,
				);
			}
		}),

	runSinglePostTwiceNoCache: publicProcedure
		.input(
			z.object({
				postId: z.string().optional(),
				payload: z.string().optional(),
				tag: z.string().optional(),
				runDir: z.string().optional(),
				overwrite: z.boolean().default(false),
			}),
		)
		.mutation(async ({ input }) => {
			const args = [SCRIPT_PATH];
			if (input.postId?.trim()) {
				args.push("--post-id", input.postId.trim());
			}
			if (input.payload?.trim()) {
				args.push("--payload", input.payload.trim());
			}
			if (input.tag?.trim()) {
				args.push("--tag", input.tag.trim());
			}
			if (input.runDir?.trim()) {
				args.push("--run-dir", input.runDir.trim());
			}
			if (input.overwrite) {
				args.push("--overwrite");
			}

			const { stdout, stderr } = await execFileAsync(
				"powershell.exe",
				[
					"-NoProfile",
					"-ExecutionPolicy",
					"Bypass",
					"-File",
					args[0]!,
					...args.slice(1),
				],
				{
					cwd: REPO_ROOT,
					maxBuffer: 10 * 1024 * 1024,
				},
			);

			const text = `${stdout}\n${stderr}`.trim();
			const match = text.match(/\{[\s\S]*\}$/);
			if (!match) {
				return { ok: true as const, rawOutput: text };
			}
			try {
				return { ok: true as const, result: JSON.parse(match[0] as string) };
			} catch {
				return { ok: true as const, rawOutput: text };
			}
		}),
});
