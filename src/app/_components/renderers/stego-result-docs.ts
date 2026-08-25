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

type SearchResultLike = {
	content_analysis?: string;
	content_fetched?: boolean;
	fetched_content?: string;
	snippet?: string;
};

function searchResultItemToString(x: unknown): string | null {
	if (typeof x === "string") return x;
	if (!x || typeof x !== "object") return null;
	const item = x as SearchResultLike;
	const text =
		item.content_analysis ??
		(item.content_fetched ? item.fetched_content : null) ??
		item.snippet;
	return typeof text === "string" ? text : null;
}

/** Normalize `post.search_results` to plain strings (same idea as stego-result-renderer). */
export function searchResultsAsStrings(
	post: StegoResultItem["post"],
): string[] {
	if (!post?.search_results) return [];
	const raw = Array.isArray(post.search_results)
		? post.search_results
		: Object.values(post.search_results).flat();
	return raw
		.map(searchResultItemToString)
		.filter((x): x is string => typeof x === "string");
}

/** Document index 0 = selftext, then search strings, then flattened comment bodies. */
export function buildAllDocs(item: StegoResultItem): string[] {
	const searchResults = searchResultsAsStrings(item.post);
	const comments = flattenCommentBodies(item.post?.comments ?? []);
	return [item.post?.selftext ?? "", ...searchResults, ...comments];
}
