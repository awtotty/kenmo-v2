import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from "@prisma/client";
import { type Account } from "@prisma/client/edge";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

const WORLD_BANK_ACCOUNT_ID = 1000;

const applyInterest = async (account: Account, db: PrismaClient) => {
  const canEarnInterest = 
    account.balance > 0 &&
    account.interestRate > 0 &&
    account.id !== WORLD_BANK_ACCOUNT_ID;

  if (!canEarnInterest) {
    return;
  }

  const interest = account.balance * account.interestRate;
  const newBalance = account.balance + interest;

  try {
    await db.account.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });
    await db.transaction.create({
      data: {
        fromAccountId: WORLD_BANK_ACCOUNT_ID,
        toAccountId: account.id,
        amount: newBalance,
        note: `You earned $${interest} in interest! 🎉`,
      },
    });
  } catch (e) {
    console.error(`Failed to apply interest for account ${account.id} e`);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end('Unauthorized');
  }

  try {
    const prisma = new PrismaClient();
    const accounts = await prisma.account.findMany();
    accounts.forEach((account: Account) => {
      void applyInterest(account, prisma);
    });
    res.status(200).json({ message: `Applied interest to accounts` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: `Failed to apply interest to accounts` });
  }
}
