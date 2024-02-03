import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const config = {
  runtime: 'edge',
}

export default async function apply_interest(req: NextRequest, res: NextResponse) {
  // connect to the database
  const prisma = new PrismaClient()

  // get all accounts
  const accounts = await prisma.account.findMany()

  // for each account in the database, calculate the interest and update the balance
  accounts.forEach(async account => {
    const interest = account.balance * account.interestRate
    const newBalance = account.balance + interest
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance }
    })
  })
}