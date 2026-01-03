import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const OUTPUT_RESULTS_PATH = join(process.cwd(), "..", "stego-side-wing", "output-results");

export const filesRouter = createTRPCRouter({
	listFiles: publicProcedure.query(async () => {
		try {
			const entries = await readdir(OUTPUT_RESULTS_PATH, { withFileTypes: true });
			// Filter out directories and only return files
			const fileList = entries
				.filter((entry) => entry.isFile())
				.map((entry) => entry.name)
				.sort();
			return fileList;
		} catch (error) {
			console.error("Error reading directory:", error);
			throw new Error("Failed to read files directory");
		}
	}),

	getFileContent: publicProcedure
		.input(z.object({ filename: z.string() }))
		.query(async ({ input }) => {
			try {
				const filePath = join(OUTPUT_RESULTS_PATH, input.filename);
				const content = await readFile(filePath, "utf-8");
				return content;
			} catch (error) {
				console.error("Error reading file:", error);
				throw new Error(`Failed to read file: ${input.filename}`);
			}
		}),
});
