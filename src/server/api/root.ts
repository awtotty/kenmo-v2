import { cashRouter } from "~/server/api/routers/cash";
import { createTRPCRouter } from "~/server/api/trpc";
import { transactionRouter } from "./routers/transaction";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  cash: cashRouter,
  transaction: transactionRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
