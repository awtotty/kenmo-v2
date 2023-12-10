import { postRouter } from "~/server/api/routers/post";
import { cashRouter } from "~/server/api/routers/cash";
import { createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  cash: cashRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
