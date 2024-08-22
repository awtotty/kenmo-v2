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

  // TODO: rename this to getAllCurrentUser
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.account.findMany({
      where: {
        ownerId: ctx.auth.userId,
      },
    });
  }),

  // TODO: rename this to getUserAccountsByClassCode
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

  getAllInClassByClassCode: protectedProcedure
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
        },
      });

      if (!enrollments) {
        throw new TRPCClientError("No enrollments found");
      }

      // you have to be an admin to view all accounts in a class
      const adminEnrollment = enrollments.find(
        (enrollment: Enrollment) => enrollment.userId === ctx.auth.userId,
      );

      if (!adminEnrollment || adminEnrollment.role !== "ADMIN") {
        throw new TRPCClientError("You are not an admin of this class");
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

  getBankAccountsByClassCode: protectedProcedure
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
