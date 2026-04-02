import type { RedditComment, StegoResult } from "~/schemas/stego-result";

export type StegoResultItem = StegoResult[number];

export function flattenCommentBodies(comments: RedditComment[]): string[] {
	const flat: string[] = [];
	for (const c of comments) {
		if (c.body) flat.push(c.body);
		if (c.replies) flat.push(...flattenCommentBodies(c.replies));
	}
	return flat;
}

/** Normalize `post.search_results` to plain strings (same idea as stego-result-renderer). */
export function searchResultsAsStrings(
	post: StegoResultItem["post"],
): string[] {
	if (!post?.search_results) return [];
	if (Array.isArray(post.search_results)) {
		return post.search_results.filter(
			(x): x is string => typeof x === "string",
		);
	}
	return Object.values(post.search_results)
		.flat()
		.map(
			(x: {
				content_analysis?: string;
				content_fetched?: boolean;
				fetched_content?: string;
				snippet?: string;
			}) =>
				x?.content_analysis ??
				(x?.content_fetched ? x?.fetched_content : null) ??
				x?.snippet,
		)
		.filter((x): x is string => typeof x === "string");
}

/** Document index 0 = selftext, then search strings, then flattened comment bodies. */
export function buildAllDocs(item: StegoResultItem): string[] {
	const searchResults = searchResultsAsStrings(item.post);
	const comments = flattenCommentBodies(item.post?.comments ?? []);
	return [item.post?.selftext ?? "", ...searchResults, ...comments];
}
