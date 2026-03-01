import { z } from "zod";

/**
 * COMPRESSION SCHEMAS
 */
const compressionReferenceSchema = z.object({
	doc: z.number().int().nullable(),
	idx: z.number().int(),
	len: z.number().int(),
});

const compressionSchema = z.object({
	payload: z.string().optional(),
	compressed: z.string().optional(),
	compressedLength: z.number().int().optional(),
	originalLength: z.number().int().optional(),
	ratio: z.number().optional(),
	references: z.array(compressionReferenceSchema).optional(),
	// V2/V3 field
	usedDict: z.boolean().optional(),
	// V1 field
	method: z.string().optional(),
}).passthrough();

/**
 * REDDIT COMMENT SCHEMAS (Recursive)
 */
export type RedditComment = {
	_meta?: {
		retrieved_2nd_on: number;
		is_edited?: boolean;
		removal_type?: string;
		was_deleted_later?: boolean;
		was_initially_deleted?: boolean;
	};
	author: string | null;
	author_fullname?: string;
	body: string | null;
	comment_type?: null;
	controversiality: number;
	created: number;
	created_utc: number;
	distinguished: null;
	downs: number;
	id: string;
	link_id: string;
	name: string;
	parent_id: string;
	permalink: string;
	score?: number;
	ups?: number;
	replies: RedditComment[] | null;
};

const redditCommentSchema = z.lazy(() =>
	z.object({
		_meta: z.object({
			retrieved_2nd_on: z.number().int(),
			is_edited: z.boolean().optional(),
			removal_type: z.string().optional(),
			was_deleted_later: z.boolean().optional(),
			was_initially_deleted: z.boolean().optional(),
		}).optional(),
		author: z.string().nullable(),
		author_fullname: z.string().optional(),
		body: z.string().nullable(),
		comment_type: z.null().optional(),
		controversiality: z.number().int().optional(),
		created: z.number().int().optional(),
		created_utc: z.number().int().optional(),
		distinguished: z.null().optional(),
		downs: z.number().int().optional(),
		id: z.string().optional(),
		link_id: z.string().optional(),
		name: z.string().optional(),
		parent_id: z.string().optional(),
		permalink: z.string().optional(),
		score: z.number().int().optional(),
		ups: z.number().int().optional(),
		replies: z.array(redditCommentSchema).nullable().optional(),
	}).passthrough(),
) as z.ZodType<RedditComment>;

/**
 * EMBEDDING SCHEMAS
 */
const commentContextSchema = z.object({
	id: z.string().optional(),
	title: z.string().optional(),
	author: z.string().optional(),
	selftext: z.string().optional(),
	subreddit: z.string().optional(),
	url: z.string().optional(),
	permalink: z.string().optional(),
}).passthrough();

const commentItemSchema = z.object({
	name: z.string().optional(),
	body: z.string().optional(),
	id: z.string().optional(),
	parent_id: z.string().optional(),
	permalink: z.string().optional(),
}).passthrough();

const commentEmbeddingSchema = z.object({
	bitsUsed: z.string().optional(),
	bitsCount: z.number().int().optional(),
	flatCommentsLength: z.number().int().optional(),
	selectionIndex: z.number().int().optional(),
	targetType: z.string().optional(),
	context: commentContextSchema.optional(),
	// V2/V3 uses commentItemSchema, V1 uses unknown
	pickedCommentChain: z.array(z.union([commentItemSchema, z.unknown()])).optional(),
	insufficientBits: z.boolean().optional(),
}).passthrough();

const angleSchema = z.object({
	category: z.string().optional(),
	source_quote: z.string().optional(),
	tangent: z.string().optional(),
	idx: z.number().int().optional(),
}).passthrough();

const angleWithDocSchema = angleSchema.extend({
	source_document: z.number().int().optional(),
}).passthrough();

const angleEmbeddingSchema = z.object({
	bitsUsed: z.string().optional(),
	bitsCount: z.number().int().optional(),
	remainingBits: z.string().optional(),
	selectedAngle: angleSchema.optional(),
	remainingAngles: z.array(angleSchema).optional(),
	totalAnglesSelectedFirst: z.array(angleWithDocSchema).optional(),
	snippet: z.null().optional(),
	selectedSourceDocumentIndex: z.number().int().optional(),
	selectedSourceDocument: z.null().optional(),
	insufficientBits: z.boolean().optional(),
}).passthrough();

const embeddingSchema = z.object({
	compression: compressionSchema.optional(),
	commentEmbedding: commentEmbeddingSchema.optional(),
	angleEmbedding: angleEmbeddingSchema.optional(),
	totalBitsEmbedded: z.number().int().optional(),
	fullEncodedBits: z.string().optional(),
	warnings: z.array(z.unknown()).optional(),
}).passthrough();

/**
 * SEARCH RESULT SCHEMAS
 */
const searchResultItemSchema = z.object({
	content_analysis: z.string().optional(),
	content_fetched: z.boolean().optional(),
	date: z.string().optional(),
	displayed_link: z.string().optional(),
	favicon: z.string().optional(),
	fetched_content: z.string().optional(),
	link: z.string().optional(),
	missing: z.array(z.string()).optional(),
	page_rank: z.number().int().optional(),
	rank: z.number().int().optional(),
	snippet: z.string().optional(),
	title: z.string().optional(),
	extended_sitelinks: z
		.array(
			z.object({
				link: z.string().optional(),
				title: z.string().optional(),
			}),
		)
		.optional(),
}).passthrough();

/**
 * POST SCHEMAS
 */
const postSchema = z.object({
	analysis_timestamp: z.string().optional(),
	angles: z.array(z.array(angleSchema).nullable()).optional(),
	author: z.string().optional(),
	author_fullname: z.string().optional(),
	comments: z.union([z.array(redditCommentSchema), z.null()]).optional(),
	created: z.number().int().optional(),
	domain: z.string().optional(),
	downs: z.number().int().optional(),
	edited: z.boolean().optional(),
	extracted_topics: z.array(z.string()).optional(),
	id: z.string().optional(),
	likes: z.any().optional(),
	name: z.string().optional(),
	num_comments: z.number().int().optional(),
	options_count: z.union([z.string(), z.null()]).optional(),
	permalink: z.string().optional(),
	pinned: z.boolean().optional(),
	removed_by: z.any().optional(),
	retrieved_on: z.number().int().optional(),
	saved: z.boolean().optional(),
	score: z.number().int().optional(),
	search_results: z.union([
		z.record(z.array(searchResultItemSchema)),
		z.array(z.string())
	]).optional(),
	selftext: z.string().optional(),
	send_replies: z.boolean().optional(),
	subreddit: z.string().optional(),
	subreddit_id: z.string().optional(),
	subreddit_name_prefixed: z.string().optional(),
	subreddit_subscribers: z.number().int().optional(),
	subreddit_type: z.string().optional(),
	title: z.string().optional(),
	ups: z.number().int().optional(),
	upvote_ratio: z.number().optional(),
	url: z.string().optional(),
	url_overridden_by_dest: z.string().optional(),
	user_reports: z.array(z.unknown()).optional(),
	view_count: z.any().optional(),
}).passthrough();

/**
 * UNIFIED STEGO RESULT SCHEMA
 */
export const stegoResultSchema = z.array(
	z.object({
		stegoText: z.string(),
		embedding: embeddingSchema.optional(),
		post: postSchema.optional(),
	}).passthrough(),
);

export type StegoResult = z.infer<typeof stegoResultSchema>;
