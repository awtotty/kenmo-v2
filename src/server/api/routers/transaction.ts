import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { type Enrollment } from "@prisma/client/edge";
import { Role } from "@prisma/client";

const centsAmount = z
  .number()
  .finite()
  .positive()
  .refine((amount) => Math.round(amount * 100) > 0, {
    message: "Amount must be at least $0.01",
  })
  .transform((amount) => Math.round(amount * 100) / 100);

export const transactionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fromAccountId: z.number().int().positive(),
        toAccountId: z.number().int().positive(),
        amount: centsAmount,
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.fromAccountId === input.toAccountId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot transfer to the same account",
        });
      }

      // Keep authorization checks and financial writes in one database transaction.
      return await ctx.db.$transaction(async (tx) => {
        const [fromEnrollment, toEnrollment] = await Promise.all([
          tx.enrollment.findFirst({
            where: {
              checkingAccountId: input.fromAccountId,
              class: { deletedAt: null },
            },
          }),
          tx.enrollment.findFirst({
            where: {
              checkingAccountId: input.toAccountId,
              class: { deletedAt: null },
            },
          }),
        ]);

        if (!fromEnrollment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The from account does not belong to an active class",
          });
        }

        if (!toEnrollment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The to account does not belong to an active class",
          });
        }

        if (fromEnrollment.classId !== toEnrollment.classId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Transfers must stay within the same active class",
          });
        }

        const actorEnrollment = await tx.enrollment.findFirst({
          where: {
            userId: ctx.auth.userId,
            classId: fromEnrollment.classId,
            class: { deletedAt: null },
          },
        });

        if (!actorEnrollment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not enrolled in this class",
          });
        }

        const actorIsAdmin = actorEnrollment.role === Role.ADMIN;
        const actorOwnsFromAccount = fromEnrollment.userId === ctx.auth.userId;
        const targetIsTeacherOrAdmin =
          toEnrollment.role === Role.ADMIN || toEnrollment.role === Role.TEACHER;

        if (!actorOwnsFromAccount && !actorIsAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot transfer from this account",
          });
        }

        if (!actorIsAdmin && !targetIsTeacherOrAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Students can only transfer to teacher, admin, or bank accounts",
          });
        }

        // Double entry bookkeeping - create ledger entries.
        await tx.ledger.createMany({
          data: [
            {
              accountId: input.fromAccountId,
              debit: 0,
              credit: input.amount,
            },
            {
              accountId: input.toAccountId,
              debit: input.amount,
              credit: 0,
            },
          ],
        });

        // Atomic balance updates. Overdrafts are allowed by current product policy.
        await tx.account.update({
          where: {
            id: input.fromAccountId,
          },
          data: {
            balance: { decrement: input.amount },
          },
        });

        await tx.account.update({
          where: {
            id: input.toAccountId,
          },
          data: {
            balance: { increment: input.amount },
          },
        });

        await tx.transaction.create({
          data: {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            amount: input.amount,
            note: input.note ?? "",
          },
        });

        return true;
      });
    }),

  getAllByClassCode: protectedProcedure
    .input(
      z.object({
        classCode: z.string(),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).optional().default(50),
      })
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

      // ensure user is admin of class
      const userEnrollment = enrollments.find(
        (enrollment: Enrollment) => enrollment.userId === ctx.auth.userId,
      );
      if (!userEnrollment || userEnrollment.role !== Role.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not an admin of this class" });
      }

      const relevantAccounts = enrollments
        .map((enrollment: Enrollment) => enrollment.checkingAccountId)

      const transactions = await ctx.db.transaction.findMany({
        where: {
          OR: [
            {
              fromAccountId: {
                in: relevantAccounts,
              },
            },
            {
              toAccountId: {
                in: relevantAccounts,
              },
            },
          ],
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: {
          createdAt: "desc",
        },
      });
      if (!transactions) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No transactions found" });
      }

      const totalRecords = await ctx.db.transaction.count({
        where: {
          OR: [
            {
              fromAccountId: {
                in: relevantAccounts,
              },
            },
            {
              toAccountId: {
                in: relevantAccounts,
              },
            },
          ],
        },
      });

      return {
        transactions: transactions,
        totalRecords: totalRecords,
      };
    }),

  getAllByAccountId: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: {
          id: input.accountId,
          ownerId: ctx.auth.userId,
        },
      });
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      const transactions = await ctx.db.transaction.findMany({
        where: {
          OR: [
            {
              fromAccountId: input.accountId,
            },
            {
              toAccountId: input.accountId,
            },
          ],
        },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        orderBy: {
          createdAt: "desc",
        },
      });
      if (!transactions) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No transactions found" });
      }

      const totalRecords = await ctx.db.transaction.count({
        where: {
          OR: [
            {
              fromAccountId: input.accountId,
            },
            {
              toAccountId: input.accountId,
            },
          ],
        },
      });

      return {
        transactions: transactions,
        totalRecords: totalRecords,
      };
    }),

  getCustomTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      const customTransactions = await ctx.db.customTransaction.findMany({
        where: {
          ownerId: ctx.auth.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return customTransactions;
    }),

  createCustomTransaction: protectedProcedure
    .input(
      z.object({
        amount: centsAmount,
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const customTransactionsList = await ctx.db.customTransaction.findMany({
        where: {
          ownerId: ctx.auth.userId,
        },
      });
      if (customTransactionsList.length >= 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have reached the limit of 100 custom transactions" });
      }
      const customTransaction = await ctx.db.customTransaction.create({
        data: {
          ownerId: ctx.auth.userId,
          amount: input.amount,
          note: input.note ?? "",
        },
      });
      return customTransaction;
    }),

  deleteCustomTransaction: protectedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      const customTransaction = await ctx.db.customTransaction.findFirst({
        where: {
          id: input,
        },
      });
      if (!customTransaction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom transaction not found" });
      }
      if (ctx.auth?.userId !== customTransaction.ownerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own the custom transaction" });
      }
      await ctx.db.customTransaction.delete({
        where: {
          id: input,
        },
      });
      return true;
    }),

  // testInterest: publicProcedure
  //   .mutation(async ({ ctx }) => {
  //     apply_interest();
  //     console.log("ran interest func");
  //   }),
});
