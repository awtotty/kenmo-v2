import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";

export const classRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        className: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to create a class");
      }

      // check if the user is already enrolled in a class with the same name
      while (true) {
        const existingEnrollment = await ctx.db.enrollment.findFirst({
          where: {
            userId: ctx.auth?.userId ?? null,
            class: {
              name: input.className,
              deletedAt: null,
            },
          },
        });

        if (!existingEnrollment) {
          break;
        } else {
          input.className = input.className + " (1)";
        }
      }

      // generate new class code
      let code = Math.random().toString(36).substring(2, 8).toUpperCase();
      while (await ctx.db.class.findFirst({ where: { classCode: code, deletedAt: null } })) {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const result = await ctx.db.$transaction(async (tx) => {
        const classObj = await tx.class.create({
          data: {
            name: input?.className,
            classCode: code,
          },
        });

        if (!classObj) {
          throw new TRPCClientError("Failed to create class");
        }

        const checkingAccount = await tx.account.create({
          data: {
            ownerId: ctx.auth.userId,
            balance: 1000000,
            interestRate: 0.0,
            interestPeriodDays: -1,
            name: `Checking (${classObj.name})`,
          },
        });

        // enroll the user as an admin for the class
        await tx.enrollment.create({
          data: {
            userId: ctx.auth.userId,
            classId: classObj.id,
            role: "ADMIN",
            checkingAccountId: checkingAccount.id,
          },
        });

        return classObj;
      });

      return { classCode: result.classCode };
    }),

  join: protectedProcedure
    .input(
      z.object({
        classCode: z.string().length(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to join a class");
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode.toUpperCase(),
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCClientError("Class not found");
      }

      const enrollment = await ctx.db.enrollment.findFirst({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
        },
      });

      if (enrollment) {
        throw new TRPCClientError("You are already enrolled in this class");
      }

      await ctx.db.$transaction(async (tx) => {
        const checkingAccount = await tx.account.create({
          data: {
            ownerId: ctx.auth.userId,
            balance: 100, // TODO: make this a param in class creation
            interestRate: 0.2/365,
            interestPeriodDays: 1,
            name: `My account (${classObj.name})`,
          },
        });

        await tx.enrollment.create({
          data: {
            userId: ctx.auth.userId,
            classId: classObj.id,
            role: "STUDENT",
            checkingAccountId: checkingAccount.id,
          },
        });
      });

      return { classCode: classObj.classCode };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        classCode: z.string().length(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.auth?.userId) {
        throw new TRPCClientError("You must be logged in to delete a class");
      }

      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode,
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCClientError("Class not found");
      }

      const enrollment = await ctx.db.enrollment.findFirst({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
          role: "ADMIN",
        },
      });

      if (!enrollment) {
        throw new TRPCClientError("You are not an admin of this class");
      }

      // soft delete the class by setting deletedAt timestamp
      await ctx.db.class.update({
        where: {
          id: classObj.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      return { classCode: classObj.classCode };
    }),

  getByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string().length(6),
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
        throw new TRPCClientError("Class not found");
      }

      return { className: classObj.name, classCode: classObj.classCode };
    }),
});
