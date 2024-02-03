import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";


export const accountRouter = createTRPCRouter({
  // update: protectedProcedure
  //   .input(z.object({
  //     accountId: z.number().int(),
  //     balance: z.number().optional(),
  //     interestRate: z.number().optional(),
  //     interestPeriodDays: z.number().optional(),
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     if (!ctx.auth?.userId) {
  //       throw new TRPCClientError("You must be logged in to update an account")
  //     }

  //     const updatedAccount = await ctx.db.account.update({
  //       where: {
  //         id: input.accountId
  //       },
  //       data: {
  //         balance: input.balance,
  //         interestRate: input.interestRate,
  //         interestPeriodDays: input.interestPeriodDays,
  //       }
  //     })

  //     return updatedAccount
  //   }),

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

  // getById: protectedProcedure
  //   .input(z.object({
  //     accountId: z.number().int()
  //   }))
  //   .query(async ({ ctx, input }) => {
  //     if (!ctx.auth?.userId) {
  //       throw new TRPCClientError("You must be logged in view your accounts")
  //     }

  //     return await ctx.db.account.findFirst({
  //       where: {
  //         id: input.accountId,
  //         ownerId: ctx.auth.userId
  //       }
  //     })
  //   }),

  getAll: protectedProcedure 
    .query(async ({ ctx }) => {
      return await ctx.db.account.findMany({
        where: {
          ownerId: ctx.auth.userId
        }
      })
    }),

  getAllByClassCode: protectedProcedure
    .input(z.object({
      classCode: z.string()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to view this class")
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode
        }
      })

      if (!classObj) {
        throw new TRPCClientError("Class not found")
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
          userId: ctx.auth.userId
        }
      })

      if (!enrollments) {
        throw new TRPCClientError("No enrollments found")
      }

      const accountIds = enrollments.map((enrollment) => enrollment.checkingAccountId).concat(enrollments.map((enrollment) => enrollment.investmentAccountId)) 

      return await ctx.db.account.findMany({
        where: {
          id: {
            in: accountIds
          }
        }
      })
    }),
});
