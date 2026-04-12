import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { API_LOG_FILE_PATH, readApiLogSnapshot } from "~/server/logs/api-log-utils";

const PROMPT_LOG_DIR = "D:/Master/code/stego-side-wing/logs";
const PROMPT_LOG_FILENAME_PATTERN = /^stego_prompts_(\d{8})_(\d{6})\.log$/;

const promptLogLineSchema = z.object({
	timestamp: z.string().optional(),
	scope: z.string().optional(),
	provider: z.string().optional(),
	model: z.string().optional(),
	temperature: z.number().nullable().optional(),
	max_tokens: z.number().nullable().optional(),
	system_message: z.string().optional(),
	user_prompt: z.string().optional(),
	thinking: z.string().optional(),
	assistant_response: z.string().optional()
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

function parseFilenameDate(fileName: string): {
	sortKey: string;
	dateLabel: string;
	dateIso: string | null;
} | null {
	const match = PROMPT_LOG_FILENAME_PATTERN.exec(fileName);
	if (!match) return null;

	const yyyymmdd = match[1]!;
	const hhmmss = match[2]!;
	const year = yyyymmdd.slice(0, 4);
	const month = yyyymmdd.slice(4, 6);
	const day = yyyymmdd.slice(6, 8);
	const hour = hhmmss.slice(0, 2);
	const minute = hhmmss.slice(2, 4);
	const second = hhmmss.slice(4, 6);

	const dateLabel = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	const dateIso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
	return { sortKey: `${yyyymmdd}${hhmmss}`, dateLabel, dateIso };
}

type PromptLogEntry = {
	id: string;
	sourceFileName: string;
	sourceFileDate: string | null;
	lineNumber: number;
	timestamp: string | null;
	scope: string | null;
	provider: string | null;
	model: string | null;
	temperature: number | null;
	maxTokens: number | null;
	userPromptPreview: string;
	systemMessagePreview: string;
	thinkingPreview: string;
	assistantResponsePreview: string;
	userPrompt: string;
	systemMessage: string;
	thinking: string;
	assistantResponse: string;
	raw: Record<string, unknown>;
};

export const promptLogsRouter = createTRPCRouter({
	getEntries: publicProcedure
		.input(z.object({ fileName: z.string().default("all") }))
		.query(async ({ input }) => {
			const dirEntries = await readdir(PROMPT_LOG_DIR, { withFileTypes: true });
			const availableFiles = dirEntries
				.filter((entry) => entry.isFile())
				.map((entry) => entry.name)
				.map((fileName) => {
					const parsed = parseFilenameDate(fileName);
					if (!parsed) return null;
					return {
						fileName,
						dateLabel: parsed.dateLabel,
						dateIso: parsed.dateIso,
						sortKey: parsed.sortKey,
						path: join(PROMPT_LOG_DIR, fileName)
					};
				})
				.filter(
					(
						file
					): file is {
						fileName: string;
						dateLabel: string;
						dateIso: string | null;
						sortKey: string;
						path: string;
					} => !!file
				)
				.sort((a, b) => b.sortKey.localeCompare(a.sortKey));

			const selectedFiles =
				input.fileName === "all"
					? availableFiles
					: availableFiles.filter((file) => file.fileName === input.fileName);

			if (input.fileName !== "all" && selectedFiles.length === 0) {
				throw new Error(`Prompt log file not found: ${input.fileName}`);
			}

			const entries: PromptLogEntry[] = [];
			const warnings: Array<{ fileName: string; lineNumber: number; reason: string }> = [];

			for (const file of selectedFiles) {
				const content = await readFile(file.path, "utf-8");
				const lines = content.split(/\r?\n/);

				for (let i = 0; i < lines.length; i += 1) {
					const lineNumber = i + 1;
					const rawLine = lines[i]?.trim() ?? "";
					if (!rawLine) continue;

					let parsedUnknown: unknown;
					try {
						parsedUnknown = JSON.parse(rawLine);
					} catch {
						warnings.push({ fileName: file.fileName, lineNumber, reason: "Invalid JSON" });
						continue;
					}

					const validated = promptLogLineSchema.safeParse(parsedUnknown);
					if (!validated.success) {
						warnings.push({
							fileName: file.fileName,
							lineNumber,
							reason: "Missing expected prompt fields"
						});
						continue;
					}

					const parsed = validated.data;
					const userPrompt = parsed.user_prompt ?? "";
					const systemMessage = parsed.system_message ?? "";
					const thinking = parsed.thinking ?? "";
					const assistantResponse = parsed.assistant_response ?? "";

					entries.push({
						id: `${file.fileName}:${lineNumber}:${parsed.timestamp ?? "no-ts"}`,
						sourceFileName: file.fileName,
						sourceFileDate: file.dateIso,
						lineNumber,
						timestamp: parsed.timestamp ?? null,
						scope: parsed.scope ?? null,
						provider: parsed.provider ?? null,
						model: parsed.model ?? null,
						temperature: parsed.temperature ?? null,
						maxTokens: parsed.max_tokens ?? null,
						userPromptPreview: toPreview(userPrompt),
						systemMessagePreview: toPreview(systemMessage),
						thinkingPreview: toPreview(thinking),
						assistantResponsePreview: toPreview(assistantResponse),
						userPrompt,
						systemMessage,
						thinking,
						assistantResponse,
						raw: (parsedUnknown as Record<string, unknown>) ?? {}
					});
				}
			}

			entries.sort((a, b) => {
				const byTimestamp =
					toTimestampValue(b.timestamp ?? undefined) - toTimestampValue(a.timestamp ?? undefined);
				if (byTimestamp !== 0) return byTimestamp;
				const bySourceDate =
					toTimestampValue(b.sourceFileDate ?? undefined) -
					toTimestampValue(a.sourceFileDate ?? undefined);
				if (bySourceDate !== 0) return bySourceDate;
				return b.lineNumber - a.lineNumber;
			});

			return {
				logDirectory: PROMPT_LOG_DIR,
				selectedFileName: input.fileName,
				availableFiles: availableFiles.map((file) => ({
					fileName: file.fileName,
					dateLabel: file.dateLabel,
					dateIso: file.dateIso
				})),
				totalEntries: entries.length,
				warnings,
				entries
			};
		}),
	getApiEntries: publicProcedure
		.input(z.object({ limit: z.number().min(1).max(5000).default(1000) }))
		.query(async ({ input }) => {
			const snapshot = await readApiLogSnapshot(input.limit);
			return {
				logFilePath: API_LOG_FILE_PATH,
				totalEntries: snapshot.totalEntries,
				totalLines: snapshot.totalLines,
				warnings: snapshot.warnings,
				entries: snapshot.entries
			};
		})
});
