import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
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
    .mutation(() => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Direct account creation is restricted to class creation and enrollment flows",
      });
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
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
          userId: ctx.auth.userId,
        },
      });

      if (!enrollments) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No enrollments found" });
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
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
        },
      });

      if (!enrollments) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No enrollments found" });
      }

      // you have to be an admin to view all accounts in a class
      const adminEnrollment = enrollments.find(
        (enrollment: Enrollment) => enrollment.userId === ctx.auth.userId,
      );

      if (!adminEnrollment || adminEnrollment.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not an admin of this class" });
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
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const currentUserEnrollment = await ctx.db.enrollment.findFirst({
        where: {
          classId: classObj.id,
          userId: ctx.auth.userId,
        },
      });

      if (!currentUserEnrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not enrolled in this class" });
      }

      const enrollments = await ctx.db.enrollment.findMany({
        where: {
          classId: classObj.id,
          role: "ADMIN",
        },
      });

      if (!enrollments) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No enrollments found" });
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
