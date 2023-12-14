import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { Cash } from "@prisma/client";

export const transactionRouter = createTRPCRouter({
  create: protectedProcedure.input(
    z.object({
      from: z.number().int(),
      to: z.number().int(),
      amount: z.number(),
      note: z.string(),
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

    // TODO: check if user has authority to create this transaction

    const fromEnrollment = ctx.db.enrollment.findFirst({
      where: {
        id: input.from,
      },
    });

    const toEnrollment = ctx.db.enrollment.findFirst({
      where: {
        id: input.to,
      },
    });

    console.log("You're transacting from enrollment: ", fromEnrollment);

    const newTransaction = await ctx.db.transaction.create({
      data: {
        fromEnrollmentId: input.from,
        toEnrollmentId: input.to,
        fromUserId: userId,
        toUserId: userId,
        amount: input.amount,
        note: input.note,
      },
    });

    return newTransaction;
  }),
});
