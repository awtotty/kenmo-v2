import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from "@prisma/client";
import { type Account } from "@prisma/client/edge";
import { toFixedTrunc } from "~/utils/helpers";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

const WORLD_BANK_ACCOUNT_ID = 1000;

const applyInterest = async (accountIds?: number[]) => {
  const db = new PrismaClient();

  // if no accountIds are passed, apply interest to all accounts
  const accounts = accountIds ? await db.account.findMany({
    where: {
      id: {
        in: accountIds,
      },
    },
  }) : await db.account.findMany();

  // create a list of transaction data to send to db all at once
  const transactions = accounts.map((account: Account) => {
    const canEarnInterest =
      account.balance > 0 &&
      account.interestRate > 0 &&
      account.id !== WORLD_BANK_ACCOUNT_ID;

    if (!canEarnInterest) {
      return;
    }

    const interest = toFixedTrunc(account.balance * account.interestRate, 2);
    const newBalance = account.balance + parseFloat(interest);
    const note = account.balance * account.interestRate < 0.01 ?
      `You earned fractions of a cent in interest! 🎉` :
      `You earned $${interest} in interest! 🎉`;

    return {
      fromAccountId: WORLD_BANK_ACCOUNT_ID,
      toAccountId: account.id,
      amount: newBalance,
      note: note,
    };
  });

  // update account balances all at once
  const accountUpdates = accounts.map((account: Account, index: number) => {
    const transaction = transactions[index];
    if (!transaction) {
      return;
    }

    return {
      where: { id: account.id },
      data: { balance: transaction.amount },
    };
  });

  // send to db all at once
  try {
    await db.transaction.createMany({
      //@ts-expect-error - transactions.filter(Boolean) removes undefined values
      data: transactions.filter(Boolean),
    });

    await Promise.all(
      accountUpdates
        .filter(Boolean)
        .map(async (update) => { 
          if (!update) return;
          await db.account.update(update)
        }),
    );
  } catch (e) {
    console.error(`Failed to apply interest for accounts`, e);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  // test account ids: 38, 36, 41, 47, 53, 48
  const accountIdsParam = req.query.accounts as string;
  const accountIds = accountIdsParam ? accountIdsParam.split(',').map(Number) : undefined;

  try {
    await applyInterest(accountIds);
    res.status(200).json({ message: `Applied interest to accounts` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: `Failed to apply interest to accounts` });
  }
}
