import { z } from "zod";

export const perplexityMetricsSchema = z.object({
	created_at_utc: z.string(),
	config: z.object({
		output_dir: z.string(),
		metrics_dir: z.string(),
		model_name: z.string(),
		device: z.string(),
		stride: z.number(),
		max_length: z.number(),
	}),
	dataset_summary: z.object({
		total_output_files: z.number(),
		usable_stego_texts: z.number(),
		skipped_invalid_json: z.number(),
		skipped_missing_stego_text: z.number(),
		skipped_empty_stego_text: z.number(),
		scored_texts: z.number(),
	}),
	perplexity_summary: z.object({
		// Headline. The arithmetic mean is retained for continuity but is dominated by the
		// heavy right tail of per-sample perplexity, so older reports lack these fields.
		median_perplexity: z.number().optional(),
		corpus_perplexity: z.number().optional(),
		scored_tokens: z.number().optional(),
		headline_statistic: z.string().optional(),
		average_perplexity: z.number(),
		min_perplexity: z.number(),
		max_perplexity: z.number(),
	}),
	per_file_perplexity: z.array(
		z.object({
			file: z.string(),
			perplexity: z.number(),
		}),
	),
});

export type PerplexityMetrics = z.infer<typeof perplexityMetricsSchema>;
