import { z } from "zod";
import apply_interest from "~/server/api/cron/interest";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";
import { RouterOutputs } from "~/utils/api";
import { accountRouter } from "./account";

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
      if (fromAccount.balance < input.amount) {
        throw new TRPCClientError("Insufficient funds");
      }

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
        const transaction = await ctx.db.transaction.create({
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
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const classObj = await ctx.db.class.findFirst({
        where: {
          classCode: input,
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
        (enrollment) => enrollment.userId === ctx.auth.userId,
      );
      if (!userEnrollment || userEnrollment.role !== "ADMIN") {
        throw new TRPCClientError("You are not an admin of this class");
      }

      const relevantAccounts = enrollments
        .map((enrollment) => enrollment.investmentAccountId)
        .concat(enrollments.map((enrollment) => enrollment.checkingAccountId));
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
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      });
      if (!transactions) {
        throw new TRPCClientError("No transactions found");
      }

      return transactions;
    }),

  getAllByAccountId: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: {
          id: input,
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
              fromAccountId: input,
            },
            {
              toAccountId: input,
            },
          ],
        },
        take: 50,
        orderBy: {
          createdAt: "desc",
        },
      });
      if (!transactions) {
        throw new TRPCClientError("No transactions found");
      }

      return transactions;
    }),

  // testInterest: publicProcedure
  //   .mutation(async ({ ctx }) => {
  //     apply_interest();
  //     console.log("ran interest func");
  //   }),
});
