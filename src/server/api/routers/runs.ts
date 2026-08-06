import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getRunProgressRows } from "~/server/run-progress";

export const runsRouter = createTRPCRouter({
	progress: publicProcedure.query(async () => {
		return getRunProgressRows();
	}),
});
