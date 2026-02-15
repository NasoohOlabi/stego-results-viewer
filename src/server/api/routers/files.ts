import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";

import { getResolvedPath } from "~/server/paths";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const filesRouter = createTRPCRouter({
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
		.input(z.object({
			filename: z.string(),
			pathId: z.string().default("side-wing"),
		}))
		.query(async ({ input }) => {
			try {
				const path = getResolvedPath(input.pathId);
				const filePath = join(path, input.filename);
				const content = await readFile(filePath, "utf-8");
				return content;
			} catch (error) {
				console.error("Error reading file:", error);
				throw new Error(`Failed to read file: ${input.filename} in ${input.pathId}`);
			}
		}),
});
