import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";
import type { Enrollment } from "@prisma/client/edge";

export const accountRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        balance: z.number(),
        interestRate: z.number(),
        interestPeriodDays: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to create an account");
      }

      const newAccount = await ctx.db.account.create({
        data: {
          ownerId: ctx.auth.userId,
          balance: input.balance,
          interestRate: input.interestRate,
          interestPeriodDays: input.interestPeriodDays,
        },
      });

      return newAccount;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.account.findMany({
      where: {
        ownerId: ctx.auth.userId,
      },
    });
  }),

  getAllByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to view this class");
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
        },
      });

      if (!classObj) {
        throw new TRPCClientError("Class not found");
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
          userId: ctx.auth.userId,
        },
      });

      if (!enrollments) {
        throw new TRPCClientError("No enrollments found");
      }

      const accountIds = enrollments
        .map((enrollment: Enrollment) => enrollment.checkingAccountId)

      return await ctx.db.account.findMany({
        where: {
          id: {
            in: accountIds,
          },
        },
      });
    }),

  getBankAccountByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to view this class");
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
        },
      });

      if (!classObj) {
        throw new TRPCClientError("Class not found");
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
          role: "ADMIN",
        },
      });

      if (!enrollments) {
        throw new TRPCClientError("No enrollments found");
      }

      const accountIds = enrollments
        .map((enrollment: Enrollment) => enrollment.checkingAccountId)

      return await ctx.db.account.findMany({
        where: {
          id: {
            in: accountIds,
          },
        },
      });
    }),
});
