import { z } from "zod";

export const stegoResultSchema = z.object({
	algorithm: z.string(),
	results: z.object({
		detected: z.boolean(),
		confidence: z.number().min(0).max(1).optional(),
	}),
	metadata: z.record(z.unknown()).optional(),
});

export type StegoResultData = z.infer<typeof stegoResultSchema>;
