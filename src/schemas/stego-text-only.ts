import { z } from "zod";

const angleSchema = z.object({
	category: z.string().optional(),
	source_quote: z.string().optional(),
	tangent: z.string().optional(),
}).passthrough();

export const stegoTextOnlySchema = z.array(
	z.object({
		stegoText: z.string(),
		embedding: z.object({
			compression: z.object({
				method: z.string().optional(),
				payload: z.string().optional(),
				compressed: z.string().optional(),
				compressedLength: z.number().optional(),
				originalLength: z.number().optional(),
				ratio: z.number().optional(),
				references: z.array(z.any()).optional(),
			}).passthrough().optional(),
			commentEmbedding: z.object({
				bitsUsed: z.string().optional(),
				bitsCount: z.number().optional(),
			}).passthrough().optional(),
			angleEmbedding: z.object({
				bitsUsed: z.string().optional(),
				bitsCount: z.number().optional(),
				totalAnglesSelectedFirst: z.array(z.any()).optional(),
			}).passthrough().optional(),
			totalBitsEmbedded: z.number().optional(),
			warnings: z.array(z.any()).optional(),
		}).passthrough(),
		post: z.object({
			id: z.string().optional(),
			title: z.string().optional(),
			author: z.string().optional(),
			subreddit: z.string().optional(),
			score: z.number().optional(),
			permalink: z.string().optional(),
			search_results: z.array(z.string()),
		}).passthrough(),
	}).passthrough()
);

export type StegoTextOnly = z.infer<typeof stegoTextOnlySchema>;
