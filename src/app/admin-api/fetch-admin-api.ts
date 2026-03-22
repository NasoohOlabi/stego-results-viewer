import type { ApiResponseView, HttpMethod, StreamEventView } from "./types";
import { parseJsonOrText, parseSseEvent } from "./utils";

export async function executeAdminApiRequest(options: {
	method: HttpMethod;
	path: string;
	base: string;
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
	tabId: string;
	updateTabResponse: (tabId: string, response: ApiResponseView) => void;
}): Promise<{ ok: boolean; payload: unknown } | null> {
	const { method, path, base, query, body, tabId, updateTabResponse } =
		options;

	const qs = new URLSearchParams();
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined && value !== "") qs.set(key, String(value));
		}
	}

	const url = `${base}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
	const requestPayload = {
		url,
		path,
		query: query ?? null,
		body: body ?? null
	};

	updateTabResponse(tabId, {
		status: "loading",
		endpoint: url,
		method,
		request: requestPayload,
		data: null
	});

	try {
		const res = await fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json"
			},
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		const contentType = res.headers.get("content-type") ?? "";

		if (contentType.includes("text/event-stream")) {
			const stream = res.body;
			if (!stream) {
				updateTabResponse(tabId, {
					status: "error",
					endpoint: url,
					method,
					request: requestPayload,
					data: {
						httpStatus: res.status,
						httpStatusText: res.statusText,
						message: "SSE response did not include a readable body."
					}
				});
				return { ok: false, payload: null };
			}

			const reader = stream.getReader();
			const decoder = new TextDecoder();
			const events: StreamEventView[] = [];
			const maxEvents = 300;
			let buffer = "";
			let sawEventError = false;

			const pushEvent = (event: StreamEventView) => {
				if (events.length >= maxEvents) events.shift();
				events.push(event);
				if (event.event === "error") sawEventError = true;
				updateTabResponse(tabId, {
					status: sawEventError ? "error" : "loading",
					endpoint: url,
					method,
					request: requestPayload,
					data: {
						httpStatus: res.status,
						httpStatusText: res.statusText,
						contentType,
						streaming: true,
						complete: false,
						eventCount: events.length,
						lastEvent: event,
						events
					}
				});
			};

			const flushBufferEvents = () => {
				let separatorIndex = buffer.indexOf("\n\n");
				while (separatorIndex >= 0) {
					const rawBlock = buffer
						.slice(0, separatorIndex)
						.replace(/\r/g, "");
					buffer = buffer.slice(separatorIndex + 2);
					const parsed = parseSseEvent(rawBlock);
					if (parsed) pushEvent(parsed);
					separatorIndex = buffer.indexOf("\n\n");
				}
			};

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				flushBufferEvents();
			}

			buffer += decoder.decode();
			buffer = buffer.replace(/\r/g, "");
			if (buffer.trim()) {
				const parsed = parseSseEvent(buffer);
				if (parsed) pushEvent(parsed);
			}

			const finalPayload = {
				httpStatus: res.status,
				httpStatusText: res.statusText,
				contentType,
				streaming: true,
				complete: true,
				eventCount: events.length,
				events,
				finishedAt: new Date().toISOString()
			};
			const success = res.ok && !sawEventError;
			updateTabResponse(tabId, {
				status: success ? "success" : "error",
				endpoint: url,
				method,
				request: requestPayload,
				data: finalPayload
			});
			return {
				ok: success,
				payload: finalPayload
			};
		}

		const text = await res.text();
		const parsed = parseJsonOrText(text);

		updateTabResponse(tabId, {
			status: res.ok ? "success" : "error",
			endpoint: url,
			method,
			request: requestPayload,
			data: {
				httpStatus: res.status,
				httpStatusText: res.statusText,
				payload: parsed
			}
		});
		return {
			ok: res.ok,
			payload: parsed
		};
	} catch (error) {
		updateTabResponse(tabId, {
			status: "error",
			endpoint: url,
			method,
			request: requestPayload,
			data: {
				message: "Request failed",
				error: error instanceof Error ? error.message : String(error)
			}
		});
		return null;
	}
}
