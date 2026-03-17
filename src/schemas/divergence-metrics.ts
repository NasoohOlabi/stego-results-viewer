import { z } from "zod";

export const divergenceMetricsSchema = z.object({
	created_at_utc: z.string(),
	config: z.object({
		output_dir: z.string(),
		dataset_dir: z.string(),
		metrics_dir: z.string(),
		tokenization: z.string(),
		token_regex: z.string(),
		smoothing_alpha: z.number(),
		kl_direction: z.string(),
	}),
	dataset_summary: z.object({
		total_output_files: z.number(),
		unique_output_post_ids: z.number(),
		usable_stego_samples: z.number(),
		skipped_missing_stegoText: z.number(),
		skipped_empty_stego_tokens: z.number(),
		skipped_missing_primary_post_file: z.number(),
		skipped_empty_primary_comment_bodies: z.number(),
		global_source_post_files: z.number(),
		global_nonempty_comment_bodies: z.number(),
	}),
	primary_baseline_matched_post: z.object({
		comparisons: z.number(),
		stego_posts_represented: z.number(),
		average_kl_stego_vs_matched_post: z.number(),
		average_jsd_stego_vs_matched_post: z.number(),
	}),
	secondary_baseline_global_corpus: z.object({
		comparisons: z.number(),
		stego_posts_represented: z.number(),
		average_kl_stego_vs_global_corpus: z.number(),
		average_jsd_stego_vs_global_corpus: z.number(),
	}),
});

export type DivergenceMetrics = z.infer<typeof divergenceMetricsSchema>;
