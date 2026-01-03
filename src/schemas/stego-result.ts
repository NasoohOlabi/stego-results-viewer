import { z } from "zod";

const compressionReferenceSchema = z.object({
	doc: z.number().int().nullable(),
	idx: z.number().int(),
	len: z.number().int(),
});

const compressionSchema = z.object({
	method: z.string(),
	payload: z.string(),
	compressed: z.string(),
	compressedLength: z.number().int(),
	originalLength: z.number().int(),
	ratio: z.number(),
	references: z.array(compressionReferenceSchema),
});

const commentContextSchema = z.object({
	id: z.string(),
	title: z.string(),
	author: z.string(),
	permalink: z.string(),
});

const commentEmbeddingSchema = z.object({
	bitsUsed: z.string(),
	bitsCount: z.number().int(),
	targetType: z.string(),
	context: commentContextSchema,
	pickedCommentChain: z.array(z.unknown()),
	insufficientBits: z.boolean(),
});

const angleSchema = z.object({
	category: z.string(),
	source_quote: z.string(),
	tangent: z.string(),
});

const angleEmbeddingSchema = z.object({
	bitsUsed: z.string(),
	bitsCount: z.number().int(),
	remainingBits: z.string(),
	selectedAngle: angleSchema,
	remainingAngles: z.array(angleSchema),
	totalAnglesSelectedFirst: z.array(angleSchema),
	snippet: z.null(),
	selectedSourceDocumentIndex: z.number().int(),
	selectedSourceDocument: z.null(),
	insufficientBits: z.boolean(),
});

const embeddingSchema = z.object({
	compression: compressionSchema,
	commentEmbedding: commentEmbeddingSchema,
	angleEmbedding: angleEmbeddingSchema,
	totalBitsEmbedded: z.number().int(),
	fullEncodedBits: z.string(),
	warnings: z.array(z.unknown()),
});

const searchResultItemSchema = z.object({
	content_analysis: z.string().optional(),
	content_fetched: z.boolean().optional(),
	date: z.string(),
	displayed_link: z.string(),
	favicon: z.string(),
	fetched_content: z.string().optional(),
	link: z.string(),
	missing: z.array(z.string()),
	page_rank: z.number().int(),
	rank: z.number().int(),
	snippet: z.string(),
	title: z.string(),
});

const postSchema = z.object({
	analysis_timestamp: z.string(),
	angles: z.array(z.array(angleSchema)),
	author: z.string(),
	author_fullname: z.string(),
	comments: z.null(),
	created: z.number().int(),
	domain: z.string(),
	downs: z.number().int(),
	edited: z.boolean(),
	extracted_topics: z.array(z.string()),
	id: z.string(),
	likes: z.null(),
	name: z.string(),
	num_comments: z.number().int(),
	options_count: z.string(),
	permalink: z.string(),
	pinned: z.boolean(),
	removed_by: z.null(),
	retrieved_on: z.number().int(),
	saved: z.boolean(),
	score: z.number().int(),
	search_results: z.record(z.array(searchResultItemSchema)),
	selftext: z.string(),
	send_replies: z.boolean(),
	subreddit: z.string(),
	subreddit_id: z.string(),
	subreddit_name_prefixed: z.string(),
	subreddit_subscribers: z.number().int(),
	subreddit_type: z.string(),
	title: z.string(),
	ups: z.number().int(),
	upvote_ratio: z.number(),
	url: z.string(),
	url_overridden_by_dest: z.string().optional(),
	user_reports: z.array(z.unknown()),
	view_count: z.null(),
});

export const stegoResultSchema = z.array(
	z.object({
		stegoText: z.string(),
		embedding: embeddingSchema,
		post: postSchema,
	}),
);

export type StegoResult = z.infer<typeof stegoResultSchema>;
