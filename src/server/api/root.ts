import { cashRouter } from "~/server/api/routers/cash";
import { createTRPCRouter } from "~/server/api/trpc";
import { transactionRouter } from "./routers/transaction";
import { enrollmentRouter } from "./routers/enrollment";
import { classRouter } from "./routers/classRouter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  cash: cashRouter,
  transaction: transactionRouter,
  enrollment: enrollmentRouter, 
  class: classRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
