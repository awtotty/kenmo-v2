import { PrismaClient } from "@prisma/client";
import { type Account } from "@prisma/client/edge";

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

const applyInterest = async () => {
  const prisma = new PrismaClient();
  const accounts = await prisma.account.findMany();
  accounts.forEach((account: Account) => {
    if (account.interestRate == 0) {
      return;
    }
    const interest = account.balance * account.interestRate;
    const newBalance = account.balance + interest;
    void prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });
    void prisma.transaction.create({
      data: {
        fromAccountId: account.id,
        toAccountId: account.id,
        amount: interest,
        note: `You earned $${interest} in interest! 🎉`,
      },
    });
  });
}
 
export function GET(request: Request) {
  void applyInterest();
  return new Response(`applyInterest called from ${process.env.VERCEL_REGION}`);
}
