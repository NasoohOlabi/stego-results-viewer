import { readdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { getResolvedPath } from "~/server/paths";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { Worker } from "worker_threads";
import { cpus } from "os";

// Simple in-memory cache for file stats
interface FileStatsCache {
	mtime: number;
	stats: {
		bits: number;
		ratio: number;
		ratioCount: number;
		postCount: number;
		warnings: number;
		postsWithWarnings: number;
		angles: number;
		commentChain: number;
		dictUsage: number;
	};
}

const statsCache = new Map<string, FileStatsCache>();

// Worker pool setup
const numCPUs = cpus().length;
const workerPath = join(process.cwd(), "src/server/api/routers/stats-worker.ts");

async function processFileWithWorker(filePath: string): Promise<FileStatsCache["stats"] | null> {
	return new Promise((resolve) => {
		const worker = new Worker(workerPath);
		worker.postMessage({ filePath });
		worker.on("message", (msg) => {
			if (msg.error) {
				console.warn(`Worker error for ${filePath}:`, msg.error);
				resolve(null);
			} else {
				resolve(msg.stats);
			}
			worker.terminate();
		});
		worker.on("error", (err) => {
			console.error(`Worker crash for ${filePath}:`, err);
			resolve(null);
			worker.terminate();
		});
	});
}

async function getFileStats(filePath: string): Promise<FileStatsCache["stats"] | null> {
	try {
		const s = await stat(filePath);
		const cached = statsCache.get(filePath);

		if (cached && cached.mtime === s.mtimeMs) {
			return cached.stats;
		}

		const fileStats = await processFileWithWorker(filePath);

		if (fileStats) {
			statsCache.set(filePath, {
				mtime: s.mtimeMs,
				stats: fileStats,
			});
		}

		return fileStats;
	} catch (e) {
		console.warn(`Error processing ${filePath}:`, e);
		return null;
	}
}

export const statsRouter = createTRPCRouter({
	getStats: publicProcedure
		.input(z.object({ pathId: z.string().default("side-wing") }))
		.query(async ({ input }) => {
			const path = getResolvedPath(input.pathId);
			let files: string[] = [];
			try {
				const entries = await readdir(path, { withFileTypes: true });
				files = entries
					.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
					.map((entry) => entry.name);
			} catch (error) {
				console.error("Error reading directory for stats:", error);
				return {
					avgBitsPerPost: 0,
					avgCompressionRatio: 0,
					totalPosts: 0,
					totalFiles: 0,
					totalWarnings: 0,
					postsWithWarnings: 0,
					avgAngles: 0,
					avgCommentChain: 0,
					dictUsageRate: 0,
				};
			}

			// Process files in parallel with a limit
			const CONCURRENCY_LIMIT = numCPUs;
			const results: (FileStatsCache["stats"] | null)[] = [];
			
			for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
				const chunk = files.slice(i, i + CONCURRENCY_LIMIT);
				const chunkResults = await Promise.all(
					chunk.map((file) => getFileStats(join(path, file)))
				);
				results.push(...chunkResults);
			}

			let totalBits = 0;
			let totalRatio = 0;
			let postCount = 0;
			let fileCount = 0;
			let ratioCount = 0;
			let totalWarnings = 0;
			let postsWithWarnings = 0;
			let totalAngles = 0;
			let totalCommentChain = 0;
			let postsUsingDict = 0;

			for (const res of results) {
				if (res) {
					fileCount++;
					totalBits += res.bits;
					totalRatio += res.ratio;
					postCount += res.postCount;
					ratioCount += res.ratioCount;
					totalWarnings += res.warnings;
					postsWithWarnings += res.postsWithWarnings;
					totalAngles += res.angles;
					totalCommentChain += res.commentChain;
					postsUsingDict += res.dictUsage;
				}
			}

			return {
				avgBitsPerPost: postCount > 0 ? totalBits / postCount : 0,
				avgCompressionRatio: ratioCount > 0 ? totalRatio / ratioCount : 0,
				totalPosts: postCount,
				totalFiles: fileCount,
				totalWarnings,
				postsWithWarnings,
				avgAngles: postCount > 0 ? totalAngles / postCount : 0,
				avgCommentChain: postCount > 0 ? totalCommentChain / postCount : 0,
				dictUsageRate: postCount > 0 ? postsUsingDict / postCount : 0,
			};
		}),
});
