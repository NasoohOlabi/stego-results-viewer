import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getResolvedPath, getResultSources } from "~/server/paths";

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
});
