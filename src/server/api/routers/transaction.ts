import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";
import { type Enrollment } from "@prisma/client/edge";
import { Role } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs";

export const transactionRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fromAccountId: z.number(),
        toAccountId: z.number(),
        amount: z.number(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // verify that the user owns the from account
      const fromAccount = await ctx.db.account.findFirst({
        where: {
          id: input.fromAccountId,
          ownerId: ctx.auth?.userId,
        },
      });
      if (!fromAccount) {
        throw new TRPCClientError("You do not own the from account");
      }
      // if (fromAccount.balance < input.amount) {
      //   throw new TRPCClientError("Insufficient funds");
      // }

      const toAccount = await ctx.db.account.findFirst({
        where: {
          id: input.toAccountId,
        },
      });
      if (!toAccount) {
        throw new TRPCClientError("The to account does not exist");
      }

      // double entry book keeping
      const ledgerEntries = await ctx.db.ledger.createMany({
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
      if (!ledgerEntries) {
        throw new TRPCClientError("Failed to create ledger entries");
      }

      // update the account balances
      const updatedFromAccount = await ctx.db.account.update({
        where: {
          id: input.fromAccountId,
        },
        data: {
          balance: fromAccount.balance - input.amount,
        },
      });
      if (!updatedFromAccount) {
        throw new TRPCClientError("Failed to update from account balance");
      }
      const updatedToAccount = await ctx.db.account.update({
        where: {
          id: input.toAccountId,
        },
        data: {
          balance: toAccount.balance + input.amount,
        },
      });
      if (!updatedToAccount) {
        throw new TRPCClientError("Failed to update to account balance");
      }

      if (input.amount !== 0) {
        await ctx.db.transaction.create({
          data: {
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
            amount: input.amount,
            note: input.note ?? "",
          },
        });
      }
      return true;
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

      // ensure user is admin of class
      const userEnrollment = enrollments.find(
        (enrollment: Enrollment) => enrollment.userId === ctx.auth.userId,
      );
      if (!userEnrollment || userEnrollment.role !== Role.ADMIN) {
        throw new TRPCClientError("You are not an admin of this class");
      }

      // Get all accounts in this class
      const allAccounts = await ctx.db.account.findMany({
        where: {
          id: {
            in: enrollments
              .map((enrollment: Enrollment) => enrollment.checkingAccountId)
              .filter((id): id is number => id !== null),
          },
        },
      });

      // Verify which account owners exist in Clerk
      const validAccountIds: number[] = [];
      await Promise.allSettled(
        allAccounts.map(async (account) => {
          try {
            await clerkClient.users.getUser(account.ownerId);
            validAccountIds.push(account.id);
          } catch (error) {
            console.warn(`Account owner ${account.ownerId} not found in Clerk, excluding account ${account.id} from transactions`);
          }
        })
      );

      const transactions = await ctx.db.transaction.findMany({
        where: {
          AND: [
            {
              OR: [
                {
                  fromAccountId: {
                    in: validAccountIds,
                  },
                },
                {
                  toAccountId: {
                    in: validAccountIds,
                  },
                },
              ],
            },
            {
              fromAccountId: {
                in: validAccountIds,
              },
            },
            {
              toAccountId: {
                in: validAccountIds,
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
        throw new TRPCClientError("No transactions found");
      }

      const totalRecords = await ctx.db.transaction.count({
        where: {
          AND: [
            {
              fromAccountId: {
                in: validAccountIds,
              },
            },
            {
              toAccountId: {
                in: validAccountIds,
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
        throw new TRPCClientError("Account not found");
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
        throw new TRPCClientError("No transactions found");
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
        amount: z.number(),
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
        throw new TRPCClientError("You have reached the limit of 100 custom transactions");
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
        throw new TRPCClientError("Custom transaction not found");
      }
      if (ctx.auth?.userId !== customTransaction.ownerId) {
        throw new TRPCClientError("You do not own the custom transaction");
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
