import { parentPort } from "worker_threads";
import { readFile } from "fs/promises";

export type WorkerPostStat = {
	bits: number | null;
	ratio: number | null;
	angles: number | null;
	commentChain: number | null;
	warnings: number;
	usedDict: boolean;
};

parentPort?.on("message", async ({ filePath }) => {
	try {
		const content = await readFile(filePath, "utf-8");
		const data = JSON.parse(content);

		if (!Array.isArray(data)) {
			parentPort?.postMessage({ filePath, posts: null });
			return;
		}

		const posts: WorkerPostStat[] = [];

		for (const item of data) {
			if (item && typeof item === "object" && "embedding" in item) {
				const embedding = item.embedding;
				if (embedding) {
					posts.push({
						bits: typeof embedding.totalBitsEmbedded === "number" ? embedding.totalBitsEmbedded : null,
						ratio: embedding.compression && typeof embedding.compression.ratio === "number" ? embedding.compression.ratio : null,
						angles: embedding.angleEmbedding?.totalAnglesSelectedFirst ? embedding.angleEmbedding.totalAnglesSelectedFirst.length : null,
						commentChain: embedding.commentEmbedding?.pickedCommentChain ? embedding.commentEmbedding.pickedCommentChain.length : null,
						warnings: Array.isArray(embedding.warnings) ? embedding.warnings.length : 0,
						usedDict: embedding.compression?.method === "dictionary" || embedding.compression?.usedDict ? true : false,
					});
				}
			}
		}

		parentPort?.postMessage({ filePath, posts });
	} catch (e) {
		parentPort?.postMessage({ filePath, error: String(e) });
	}
});