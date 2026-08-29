import { NextResponse } from "next/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * Agent-facing read of the side-wing logs.
 *
 * The `/api-logs` and `/prompt-logs` pages were removed because they existed
 * for manual debugging, but the underlying logs are still the fastest way for
 * an agent to answer "what did the pipeline actually do". This exposes them as
 * plain JSON so an agent can `curl` them without driving a browser.
 *
 *   GET /api/agent/logs?source=api&limit=200
 *   GET /api/agent/logs?source=prompt&file=all
 *
 * Local/dev only, matching the rest of this viewer.
 */

const DEFAULT_API_LIMIT = 200;
const MAX_API_LIMIT = 5000;

function parseLimit(raw: string | null): number {
	const parsed = Number.parseInt(raw ?? "", 10);
	if (!Number.isFinite(parsed)) return DEFAULT_API_LIMIT;
	return Math.min(Math.max(parsed, 1), MAX_API_LIMIT);
}

export async function GET(request: Request) {
	const params = new URL(request.url).searchParams;
	const source = params.get("source") ?? "api";

	const caller = createCaller(
		await createTRPCContext({ headers: new Headers() }),
	);

	try {
		if (source === "api") {
			return NextResponse.json(
				await caller.promptLogs.getApiEntries({
					limit: parseLimit(params.get("limit")),
				}),
			);
		}
		if (source === "prompt") {
			return NextResponse.json(
				await caller.promptLogs.getEntries({
					fileName: params.get("file") ?? "latest",
					limit: parseLimit(params.get("limit")),
				}),
			);
		}
	} catch (cause) {
		return NextResponse.json(
			{ error: cause instanceof Error ? cause.message : "Failed to read logs" },
			{ status: 500 },
		);
	}

	return NextResponse.json(
		{ error: `Unknown source "${source}". Expected "api" or "prompt".` },
		{ status: 400 },
	);
}
