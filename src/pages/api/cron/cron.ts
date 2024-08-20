import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from "@prisma/client";
import { type Account } from "@prisma/client/edge";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

const WOLRD_BANK_ACCOUNT_ID = 1000;

const applyInterest = async (account: Account, db: PrismaClient) => {
  if (account.interestRate == 0) {
    return;
  }
  const interest = account.balance * account.interestRate;
  const newBalance = account.balance + interest;

  // db doesn't seem to be updating.... 
  await db.account.update({
    where: { id: account.id },
    data: { balance: newBalance },
  });
  await db.transaction.create({
    data: {
      fromAccountId: WOLRD_BANK_ACCOUNT_ID,
      toAccountId: account.id,
      amount: newBalance,
      note: `You earned $${interest} in interest! 🎉`,
    },
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = new PrismaClient();
  const accounts = await prisma.account.findMany();
  accounts.forEach((account: Account) => {
    void applyInterest(account, prisma);
  });
  res.status(200).json({ message: `applyInterest called!` });
}
