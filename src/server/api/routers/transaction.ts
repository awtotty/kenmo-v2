import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCClientError } from "@trpc/client";

export const transactionRouter = createTRPCRouter({
  create: protectedProcedure.input(
    z.object({
      fromAccountId: z.number(),
      toAccountId: z.number(),
      amount: z.number(),
    }),
  ).mutation(async ({ ctx, input }) => {
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

    return true;  
  }),
});
