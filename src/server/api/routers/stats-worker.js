import { parentPort } from "worker_threads";
import { readFile } from "fs/promises";

parentPort?.on("message", async ({ filePath }) => {
	try {
		const content = await readFile(filePath, "utf-8");
		const data = JSON.parse(content);

		if (!Array.isArray(data)) {
			parentPort?.postMessage({ filePath, stats: null });
			return;
		}

		const fileStats = {
			bits: 0,
			ratio: 0,
			ratioCount: 0,
			postCount: 0,
			warnings: 0,
			postsWithWarnings: 0,
			angles: 0,
			commentChain: 0,
			dictUsage: 0,
		};

		for (const item of data) {
			if (item && typeof item === "object" && "embedding" in item) {
				const embedding = item.embedding;
				if (embedding) {
					fileStats.postCount++;
					if (typeof embedding.totalBitsEmbedded === "number") {
						fileStats.bits += embedding.totalBitsEmbedded;
					}
					if (embedding.compression) {
						if (typeof embedding.compression.ratio === "number") {
							fileStats.ratio += embedding.compression.ratio;
							fileStats.ratioCount++;
						}
						if (embedding.compression.usedDict) {
							fileStats.dictUsage++;
						}
					}
					if (Array.isArray(embedding.warnings) && embedding.warnings.length > 0) {
						fileStats.warnings += embedding.warnings.length;
						fileStats.postsWithWarnings++;
					}
					if (embedding.angleEmbedding?.totalAnglesSelectedFirst) {
						fileStats.angles += embedding.angleEmbedding.totalAnglesSelectedFirst.length;
					}
					if (embedding.commentEmbedding?.pickedCommentChain) {
						fileStats.commentChain += embedding.commentEmbedding.pickedCommentChain.length;
					}
				}
			}
		}

		parentPort?.postMessage({ filePath, stats: fileStats });
	} catch (e) {
		parentPort?.postMessage({ filePath, error: String(e) });
	}
});
