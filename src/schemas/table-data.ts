import { z } from "zod";

export const tableDataSchema = z.array(z.record(z.unknown())).min(1);

export type TableData = z.infer<typeof tableDataSchema>;
