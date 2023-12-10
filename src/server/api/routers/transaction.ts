import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { Cash } from "@prisma/client";

export const transactionRouter = createTRPCRouter({
  create: protectedProcedure.input(
    z.object({
      content: z.string().emoji("Only emojis are allowed").min(1).max(280),
    }),
  ).mutation(async ({ ctx, input }) => {
    // User has to be signed in to create a post
    const userId = ctx.auth.userId;

    // Create a new ratelimiter, that allows 3 requests per 1 minute 
    // const ratelimit = new Ratelimit({
    //   redis: Redis.fromEnv(),
    //   limiter: Ratelimit.slidingWindow(3, "1 m"),
    //   analytics: true,
    //   /**
    //    * Optional prefix for the keys used in redis. This is useful if you want to share a redis
    //    * instance with other applications and want to avoid key collisions. The default prefix is
    //    * "@upstash/ratelimit"
    //    */
    //   prefix: "@upstash/ratelimit",
    // });

    // const { success } = await ratelimit.limit(userId);
    // if (!success) {
    //   throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests" });
    // }

    const newPost = await ctx.db.transaction.create({
      data: {
        fromUserId: userId,
        // toUserId: input.content.to,
        // amount: input.content.amount,
        // note: input.content.note,
        toUserId: "",
        amount: "0.00",
        note: "",
      },
    });

    return newPost;
  }),
});
