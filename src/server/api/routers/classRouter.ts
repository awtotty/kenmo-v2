import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { writeAuditLog } from "~/server/audit";
import { captureException } from "~/server/logger";

export const classRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        className: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // check if the user is already enrolled in a class with the same name
      while (true) {
        const existingEnrollment = await ctx.db.enrollment.findFirst({
          where: {
            userId: ctx.auth.userId,
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create class" });
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
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input.classCode.toUpperCase(),
          deletedAt: null,
        },
      });

      if (!classObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      const enrollment = await ctx.db.enrollment.findFirst({
        where: {
          userId: ctx.auth.userId,
          classId: classObj.id,
        },
      });

      if (enrollment) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already enrolled in this class" });
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
      try {
        const classObj = await ctx.db.class.findFirst({
          where: {
            classCode: input.classCode,
            deletedAt: null,
          },
        });

        if (!classObj) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
        }

        const enrollment = await ctx.db.enrollment.findFirst({
          where: {
            userId: ctx.auth.userId,
            classId: classObj.id,
            role: "ADMIN",
          },
        });

        if (!enrollment) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You are not an admin of this class" });
        }

        await ctx.db.$transaction(async (tx) => {
          // soft delete the class by setting deletedAt timestamp
          await tx.class.update({
            where: {
              id: classObj.id,
            },
            data: {
              deletedAt: new Date(),
            },
          });

          await writeAuditLog(tx, {
            actorUserId: ctx.auth.userId,
            action: "class.delete",
            entityType: "Class",
            entityId: classObj.id,
            classId: classObj.id,
            metadata: {
              classCode: classObj.classCode,
              className: classObj.name,
            },
          });
        });

        return { classCode: classObj.classCode };
      } catch (error) {
        if (!(error instanceof TRPCError)) {
          captureException(error, {
            operation: "class.delete",
            userId: ctx.auth.userId,
            classCode: input.classCode,
          });
        }
        throw error;
      }
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
      }

      return { className: classObj.name, classCode: classObj.classCode };
    }),
});
