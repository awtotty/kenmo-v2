import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const config = {
  runtime: 'edge',
}

export default async function apply_interest() {
  const prisma = new PrismaClient()
  const accounts = await prisma.account.findMany()
  accounts.forEach(async account => {
    const interest = account.balance * account.interestRate
    const newBalance = account.balance + interest
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: newBalance }
    })
  })
}