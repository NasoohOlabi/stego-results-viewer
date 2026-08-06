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
		// Added alongside the human-control arm; older reports predate these fields.
		divergence_unit: z.string().optional(),
		jsd_upper_bound: z.number().optional(),
		headline_divergence: z.string().optional(),
		control_length_window_tokens: z.array(z.number()).optional(),
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
	/**
	 * A real comment held out of its own post's baseline. Genuine human text scores far
	 * from zero here, so the stego figures above are only interpretable against it.
	 */
	human_control_matched_post: z
		.object({
			comparisons: z.number(),
			posts_represented: z.number(),
			average_kl_human_vs_matched_post: z.number(),
			average_jsd_human_vs_matched_post: z.number(),
			description: z.string().optional(),
		})
		.optional(),
	naturalness_gap_vs_human_control: z
		.object({
			kl_gap: z.number().nullable(),
			jsd_gap: z.number().nullable(),
			interpretation: z.string().optional(),
		})
		.optional(),
	alpha_sensitivity_mean_kl_stego_vs_matched_post: z
		.record(z.string(), z.number().nullable())
		.optional(),
});

export type DivergenceMetrics = z.infer<typeof divergenceMetricsSchema>;
