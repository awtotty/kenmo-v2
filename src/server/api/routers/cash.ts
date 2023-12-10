import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Cash } from "@prisma/client";

export const cashRouter = createTRPCRouter({
  get: publicProcedure
    .query(async ({ ctx }) => {
      const cashRecord: Cash | null = await ctx.db.cash.findFirst({
        where: {
          userId: ctx.auth?.userId!
        }
      })

      return {
        name: ctx.auth?.user?.firstName ?? null,
        amount: cashRecord?.amount ?? "No cash record found",
      };
    }),
});
