import { readdir, stat } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { getResolvedPath } from "~/server/paths";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { Worker } from "worker_threads";
import { cpus } from "os";
import { db } from "~/server/db/stats";
import type { WorkerPostStat } from "./stats-worker";

const numCPUs = cpus().length;
const workerPath = join(process.cwd(), "src/server/api/routers/stats-worker.ts");

async function processFileWithWorker(filePath: string): Promise<WorkerPostStat[] | null> {
	return new Promise((resolve) => {
		const worker = new Worker(workerPath);
		worker.postMessage({ filePath });
		worker.on("message", (msg) => {
			if (msg.error) {
				console.warn(`Worker error for ${filePath}:`, msg.error);
				resolve(null);
			} else {
				resolve(msg.posts);
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

async function syncStats(pathId: string, directoryPath: string) {
	let files: string[] = [];
	try {
		const entries = await readdir(directoryPath, { withFileTypes: true });
		files = entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
			.map((entry) => entry.name);
	} catch (error) {
		console.error("Error reading directory for stats:", error);
		return;
	}

	const fileStats = files.map((file) => ({
		name: file,
		path: join(directoryPath, file),
	}));

	const mtimes = await Promise.all(
		fileStats.map(async (f) => {
			try {
				const s = await stat(f.path);
				return { ...f, mtime: s.mtimeMs };
			} catch {
				return { ...f, mtime: 0 };
			}
		})
	);

	// Get existing files in DB
	const existingRows = db.prepare(`SELECT file_path, mtime FROM file_stats WHERE path_id = ?`).all(pathId) as { file_path: string; mtime: number }[];
	const existingMap = new Map(existingRows.map((r) => [r.file_path, r.mtime]));

	const currentPaths = new Set(mtimes.map((m) => m.path));

	// Find deleted
	const toDelete = existingRows.filter((r) => !currentPaths.has(r.file_path));
	
	// Find new or modified
	const toProcess = mtimes.filter((m) => {
		if (m.mtime === 0) return false;
		const existingMtime = existingMap.get(m.path);
		return existingMtime === undefined || existingMtime !== m.mtime;
	});

	if (toDelete.length > 0) {
		const deleteStmt = db.prepare(`DELETE FROM file_stats WHERE file_path = ?`);
		const deleteTransaction = db.transaction((files: string[]) => {
			for (const file of files) {
				deleteStmt.run(file);
			}
		});
		deleteTransaction(toDelete.map((d) => d.file_path));
	}

	if (toProcess.length > 0) {
		const CONCURRENCY_LIMIT = numCPUs;
		const insertFileStmt = db.prepare(`INSERT OR REPLACE INTO file_stats (file_path, path_id, mtime, processed_at) VALUES (?, ?, ?, ?)`);
		const insertPostStmt = db.prepare(`INSERT INTO post_stats (file_path, path_id, bits, ratio, angles, comment_chain, warnings, used_dict) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
		const deleteFileStmt = db.prepare(`DELETE FROM file_stats WHERE file_path = ?`);

		for (let i = 0; i < toProcess.length; i += CONCURRENCY_LIMIT) {
			const chunk = toProcess.slice(i, i + CONCURRENCY_LIMIT);
			const results = await Promise.all(
				chunk.map(async (file) => {
					const posts = await processFileWithWorker(file.path);
					return { file, posts };
				})
			);

			const transaction = db.transaction((resultsBatch: typeof results) => {
				for (const { file, posts } of resultsBatch) {
					deleteFileStmt.run(file.path); // Remove old data via cascade
					if (posts) {
						insertFileStmt.run(file.path, pathId, file.mtime, Date.now());
						for (const post of posts) {
							insertPostStmt.run(
								file.path,
								pathId,
								post.bits,
								post.ratio,
								post.angles,
								post.commentChain,
								post.warnings,
								post.usedDict ? 1 : 0
							);
						}
					}
				}
			});
			transaction(results);
		}
	}
}

export const statsRouter = createTRPCRouter({
	getStats: publicProcedure
		.input(z.object({ pathId: z.string().default("side-wing") }))
		.query(async ({ input }) => {
			const path = getResolvedPath(input.pathId);
			await syncStats(input.pathId, path);

			const stats = db.prepare(`
				SELECT 
					COUNT(DISTINCT file_path) as totalFiles,
					COUNT(*) as totalPosts,
					SUM(bits) as totalBitsEmbedded,
					AVG(bits) as avgBitsPerPost,
					AVG(ratio) as avgCompressionRatio,
					SUM(warnings) as totalWarnings,
					SUM(CASE WHEN warnings > 0 THEN 1 ELSE 0 END) as postsWithWarnings,
					AVG(angles) as avgAngles,
					AVG(comment_chain) as avgCommentChain,
					AVG(used_dict) as dictUsageRate
				FROM post_stats
				WHERE path_id = ?
			`).get(input.pathId) as any;

			return {
				avgBitsPerPost: stats.avgBitsPerPost || 0,
				avgCompressionRatio: stats.avgCompressionRatio || 0,
				totalBitsEmbedded: stats.totalBitsEmbedded || 0,
				totalPosts: stats.totalPosts || 0,
				totalFiles: stats.totalFiles || 0,
				totalWarnings: stats.totalWarnings || 0,
				postsWithWarnings: stats.postsWithWarnings || 0,
				avgAngles: stats.avgAngles || 0,
				avgCommentChain: stats.avgCommentChain || 0,
				dictUsageRate: stats.dictUsageRate || 0,
			};
		}),

	getDistributions: publicProcedure
		.input(z.object({ pathId: z.string().default("side-wing") }))
		.query(async ({ input }) => {
			const path = getResolvedPath(input.pathId);
			await syncStats(input.pathId, path);

			const getDynamicDist = (column: string, targetBuckets = 15, maxValLimit?: number) => {
				const colExpr = maxValLimit ? `MIN(${column}, ${maxValLimit})` : column;
				const stats = db.prepare(`SELECT MIN(${colExpr}) as min_val, MAX(${colExpr}) as max_val FROM post_stats WHERE path_id = ? AND ${column} IS NOT NULL`).get(input.pathId) as any;
				if (!stats || stats.min_val === null) return [];
				
				const diff = stats.max_val - stats.min_val;
				let bucketSize = 1;
				if (diff > targetBuckets) {
					const rawSize = diff / targetBuckets;
					const magnitude = Math.pow(10, Math.floor(Math.log10(rawSize)));
					const normalized = rawSize / magnitude;
					
					if (normalized <= 1.5) bucketSize = 1 * magnitude;
					else if (normalized <= 3.5) bucketSize = 2 * magnitude;
					else if (normalized <= 7.5) bucketSize = 5 * magnitude;
					else bucketSize = 10 * magnitude;
					
					bucketSize = Math.max(1, Math.round(bucketSize));
				}

				const rows = db.prepare(`
					SELECT CAST(${colExpr} / ${bucketSize} AS INTEGER) * ${bucketSize} as bucket, COUNT(*) as count
					FROM post_stats
					WHERE path_id = ? AND ${column} IS NOT NULL
					GROUP BY bucket
					ORDER BY bucket
				`).all(input.pathId) as any[];

				return rows.map((r) => {
					let label = bucketSize === 1 ? String(r.bucket) : `${r.bucket} - ${r.bucket + bucketSize - 1}`;
					if (maxValLimit && r.bucket >= maxValLimit) {
						label = `>= ${maxValLimit}`;
					}
					return {
						...r,
						label
					};
				});
			};

			const bitsDist = getDynamicDist('bits', 15);
			const anglesDist = getDynamicDist('angles', 15, 600);

			const ratioDistRows = db.prepare(`
				SELECT CAST(ratio * 10 AS INTEGER) / 10.0 as bucket, COUNT(*) as count
				FROM post_stats
				WHERE path_id = ? AND ratio IS NOT NULL
				GROUP BY bucket
				ORDER BY bucket
			`).all(input.pathId) as any[];

			const ratioDist = ratioDistRows.map((r) => ({
				...r,
				label: `${r.bucket.toFixed(1)} - ${(r.bucket + 0.09).toFixed(2)}`
			}));

			const commentChainDistRows = db.prepare(`
				SELECT comment_chain as bucket, COUNT(*) as count
				FROM post_stats
				WHERE path_id = ? AND comment_chain IS NOT NULL
				GROUP BY bucket
				ORDER BY bucket
			`).all(input.pathId) as any[];

			const commentChainDist = commentChainDistRows.map((r) => ({
				...r,
				label: String(r.bucket)
			}));

			return {
				bits: bitsDist,
				ratio: ratioDist,
				angles: anglesDist,
				commentChain: commentChainDist,
			};
		}),
});
