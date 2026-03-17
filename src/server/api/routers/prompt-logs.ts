import { readFile } from "fs/promises";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const PROMPT_LOG_PATH =
	"D:/Master/code/stego-side-wing/logs/stego_prompts_20260317_062808.log";

const promptLogLineSchema = z.object({
	timestamp: z.string().optional(),
	scope: z.string().optional(),
	provider: z.string().optional(),
	model: z.string().optional(),
	temperature: z.number().nullable().optional(),
	max_tokens: z.number().nullable().optional(),
	system_message: z.string().optional(),
	user_prompt: z.string().optional()
});

function toPreview(text: string, max = 160): string {
	const compact = text.replace(/\s+/g, " ").trim();
	if (!compact) return "";
	if (compact.length <= max) return compact;
	return `${compact.slice(0, max - 1)}...`;
}

function toTimestampValue(timestamp: string | undefined): number {
	if (!timestamp) return 0;
	const value = Date.parse(timestamp);
	return Number.isFinite(value) ? value : 0;
}

export const promptLogsRouter = createTRPCRouter({
	getEntries: publicProcedure.query(async () => {
		const content = await readFile(PROMPT_LOG_PATH, "utf-8");
		const lines = content.split(/\r?\n/);

		const entries: Array<{
			id: string;
			lineNumber: number;
			timestamp: string | null;
			scope: string | null;
			provider: string | null;
			model: string | null;
			temperature: number | null;
			maxTokens: number | null;
			userPromptPreview: string;
			systemMessagePreview: string;
			userPrompt: string;
			systemMessage: string;
			raw: Record<string, unknown>;
		}> = [];

		const warnings: Array<{ lineNumber: number; reason: string }> = [];

		for (let i = 0; i < lines.length; i += 1) {
			const lineNumber = i + 1;
			const rawLine = lines[i]?.trim() ?? "";
			if (!rawLine) continue;

			let parsedUnknown: unknown;
			try {
				parsedUnknown = JSON.parse(rawLine);
			} catch {
				warnings.push({ lineNumber, reason: "Invalid JSON" });
				continue;
			}

			const validated = promptLogLineSchema.safeParse(parsedUnknown);
			if (!validated.success) {
				warnings.push({ lineNumber, reason: "Missing expected prompt fields" });
				continue;
			}

			const parsed = validated.data;
			const userPrompt = parsed.user_prompt ?? "";
			const systemMessage = parsed.system_message ?? "";

			entries.push({
				id: `${lineNumber}-${parsed.timestamp ?? "no-ts"}`,
				lineNumber,
				timestamp: parsed.timestamp ?? null,
				scope: parsed.scope ?? null,
				provider: parsed.provider ?? null,
				model: parsed.model ?? null,
				temperature: parsed.temperature ?? null,
				maxTokens: parsed.max_tokens ?? null,
				userPromptPreview: toPreview(userPrompt),
				systemMessagePreview: toPreview(systemMessage),
				userPrompt,
				systemMessage,
				raw: (parsedUnknown as Record<string, unknown>) ?? {}
			});
		}

		entries.sort(
			(a, b) => toTimestampValue(b.timestamp ?? undefined) - toTimestampValue(a.timestamp ?? undefined)
		);

		return {
			logPath: PROMPT_LOG_PATH,
			totalEntries: entries.length,
			warnings,
			entries
		};
	})
});
