import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";


export const accountRouter = createTRPCRouter({
  create: protectedProcedure 
    .input(z.object({
      balance: z.number(),
      interestRate: z.number(),
      interestPeriodDays: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to create an account")
      }

      const newAccount = await ctx.db.account.create({
        data: {
          ownerId: ctx.auth.userId,
          balance: input.balance, 
          interestRate: input.interestRate,
          interestPeriodDays: input.interestPeriodDays,  
        }
      })

      return newAccount
    }), 

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
