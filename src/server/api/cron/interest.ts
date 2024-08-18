import { PrismaClient } from "@prisma/client";
import { type Account } from "@prisma/client/edge";

export const config = {
  runtime: "edge",
};

export default async function apply_interest() {
  const prisma = new PrismaClient();
  const accounts = await prisma.account.findMany();
  accounts.forEach((account: Account) => {
    const interest = account.balance * account.interestRate;
    const newBalance = account.balance + interest;
    void prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance },
    });
    if (interest !== 0) {
      void prisma.transaction.create({
        data: {
          fromAccountId: account.id,
          toAccountId: account.id,
          amount: interest,
          note: "Interest",
        },
      });
    }
  });
}
