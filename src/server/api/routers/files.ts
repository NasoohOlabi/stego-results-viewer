import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const SIDE_WING_PATH = join(process.cwd(), "..", "stego-side-wing", "output-results");
const LOCAL_PATH = join(process.cwd(), "output-results");

const PATH_MAP = {
	"side-wing": SIDE_WING_PATH,
	local: LOCAL_PATH,
} as const;

export type FolderType = keyof typeof PATH_MAP;

export const filesRouter = createTRPCRouter({
	listFiles: publicProcedure
		.input(z.object({ folder: z.enum(["side-wing", "local"]).default("side-wing") }))
		.query(async ({ input }) => {
			try {
				const path = PATH_MAP[input.folder];
				const entries = await readdir(path, { withFileTypes: true });
				// Filter out directories and only return files
				const fileList = entries
					.filter((entry) => entry.isFile())
					.map((entry) => entry.name)
					.sort();
				return fileList;
			} catch (error) {
				console.error("Error reading directory:", error);
				throw new Error(`Failed to read directory: ${input.folder}`);
			}
		}),

	getFileContent: publicProcedure
		.input(z.object({
			filename: z.string(),
			folder: z.enum(["side-wing", "local"]).default("side-wing")
		}))
		.query(async ({ input }) => {
			try {
				const path = PATH_MAP[input.folder];
				const filePath = join(path, input.filename);
				const content = await readFile(filePath, "utf-8");
				return content;
			} catch (error) {
				console.error("Error reading file:", error);
				throw new Error(`Failed to read file: ${input.filename} in ${input.folder}`);
			}
		}),
});
