import { readFile } from "fs/promises";
import {
	API_LOG_FILE_PATH,
	parseApiLogLine,
	type ApiLogEntry
} from "~/server/logs/api-log-utils";

export const runtime = "nodejs";

function encodeSseEvent(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseEntriesFromLines(lines: string[], startAtLine = 1): ApiLogEntry[] {
	const entries: ApiLogEntry[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		const entry = parseApiLogLine(lines[index] ?? "", startAtLine + index);
		if (entry) entries.push(entry);
	}
	return entries;
}

function splitLines(content: string): string[] {
	return content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export async function GET(request: Request): Promise<Response> {
	const encoder = new TextEncoder();
	const url = new URL(request.url);
	const backfill = Math.max(
		1,
		Math.min(Number(url.searchParams.get("backfill") ?? "200"), 1000)
	);

	const stream = new ReadableStream({
		async start(controller) {
			let closed = false;
			let knownLines = 0;
			let pollTimer: ReturnType<typeof setInterval> | null = null;
			let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

			const safeEnqueue = (value: string) => {
				if (closed) return;
				controller.enqueue(encoder.encode(value));
			};

			const closeStream = () => {
				if (closed) return;
				closed = true;
				if (pollTimer) clearInterval(pollTimer);
				if (heartbeatTimer) clearInterval(heartbeatTimer);
				controller.close();
			};

			request.signal.addEventListener("abort", closeStream);

			try {
				const initialContent = await readFile(API_LOG_FILE_PATH, "utf-8");
				const initialLines = splitLines(initialContent);
				knownLines = initialLines.length;
				const initialEntries = parseEntriesFromLines(initialLines).slice(-backfill);
				safeEnqueue(encodeSseEvent("init", { entries: initialEntries }));
			} catch (error) {
				safeEnqueue(
					encodeSseEvent("error", {
						message: error instanceof Error ? error.message : "Failed to read api.jsonl"
					})
				);
			}

			pollTimer = setInterval(async () => {
				try {
					const content = await readFile(API_LOG_FILE_PATH, "utf-8");
					const lines = splitLines(content);
					if (lines.length === knownLines) return;

					if (lines.length < knownLines) {
						knownLines = lines.length;
						const resetEntries = parseEntriesFromLines(lines).slice(-backfill);
						safeEnqueue(encodeSseEvent("reset", { entries: resetEntries }));
						return;
					}

					const newLines = lines.slice(knownLines);
					const newEntries = parseEntriesFromLines(newLines, knownLines + 1);
					knownLines = lines.length;
					if (newEntries.length > 0) {
						safeEnqueue(encodeSseEvent("append", { entries: newEntries }));
					}
				} catch (error) {
					safeEnqueue(
						encodeSseEvent("error", {
							message:
								error instanceof Error ? error.message : "Failed to stream api.jsonl"
						})
					);
				}
			}, 1500);

			heartbeatTimer = setInterval(() => {
				safeEnqueue(": keepalive\n\n");
			}, 15000);
		}
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive"
		}
	});
}
