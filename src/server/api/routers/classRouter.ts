import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { Class } from "@prisma/client";

export const classRouter = createTRPCRouter({
  getClassById: publicProcedure
  .input(z.object({
    classId: z.number().int()
  }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.class.findFirst({
        where: {
          id: input?.classId
        }
      })
    }),

  getClassByCode: publicProcedure
  .input(z.object({
    classCode: z.string()
  }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.class.findFirst({
        where: {
          classCode: input?.classCode
        }
      })
    }),
});
