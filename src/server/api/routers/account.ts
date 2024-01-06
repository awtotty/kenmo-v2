import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { Account } from "@prisma/client";
import { db } from "~/server/db";
import { TRPCClientError } from "@trpc/client";


export const accountRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({
      accountId: z.number().int()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in view your accounts")
      }

      return await ctx.db.account.findFirst({
        where: {
          id: input.accountId,
          ownerId: ctx.auth.userId
        }
      })
    }),

  getAll: protectedProcedure 
    .query(async ({ ctx }) => {
      return await ctx.db.account.findMany({
        where: {
          ownerId: ctx.auth.userId
        }
      })
    }),
});
