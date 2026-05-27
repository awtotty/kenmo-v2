import type { NextApiRequest, NextApiResponse } from "next";
import { type Account } from "@prisma/client/edge";
import { env } from "~/env";
import { writeAuditLog } from "~/server/audit";
import { db } from "~/server/db";
import { captureException, logger } from "~/server/logger";
import { toFixedTrunc } from "~/utils/helpers";

export const dynamic = "force-dynamic"; // static by default, unless reading the request

const WORLD_BANK_ACCOUNT_ID = 1000;

type InterestApplication = {
  accountId: number;
  interestAmount: number;
  newBalance: number;
  note: string;
};

export const buildInterestApplications = (accounts: Account[]): InterestApplication[] => {
  return accounts.flatMap((account) => {
    const canEarnInterest =
      account.balance > 0 &&
      account.interestRate > 0 &&
      account.id !== WORLD_BANK_ACCOUNT_ID;

    if (!canEarnInterest) {
      return [];
    }

    const interest = toFixedTrunc(account.balance * account.interestRate, 2);
    const interestAmount = parseFloat(interest);

    if (interestAmount <= 0) {
      return [];
    }

    const note = account.balance * account.interestRate < 0.01
      ? "You earned fractions of a cent in interest! 🎉"
      : `You earned $${interest} in interest! 🎉`;

    return [{
      accountId: account.id,
      interestAmount,
      newBalance: account.balance + interestAmount,
      note,
    }];
  });
};

export const applyInterest = async (accountIds?: number[], dbClient = db) => {
  const accounts = accountIds ? await dbClient.account.findMany({
    where: {
      id: {
        in: accountIds,
      },
    },
  }) : await dbClient.account.findMany();

  const interestApplications = buildInterestApplications(accounts);

  if (interestApplications.length === 0) {
    return { applied: 0 };
  }

  await dbClient.$transaction(async (tx) => {
    await tx.transaction.createMany({
      data: interestApplications.map((application) => ({
        fromAccountId: WORLD_BANK_ACCOUNT_ID,
        toAccountId: application.accountId,
        amount: application.interestAmount,
        note: application.note,
      })),
    });

    await tx.ledger.createMany({
      data: interestApplications.flatMap((application) => [
        {
          accountId: WORLD_BANK_ACCOUNT_ID,
          debit: 0,
          credit: application.interestAmount,
        },
        {
          accountId: application.accountId,
          debit: application.interestAmount,
          credit: 0,
        },
      ]),
    });

    for (const application of interestApplications) {
      await tx.account.update({
        where: { id: application.accountId },
        data: { balance: { increment: application.interestAmount } },
      });
    }

    await writeAuditLog(tx, {
      actorUserId: null,
      action: "cron.interest.apply",
      entityType: "CronInterestRun",
      entityId: null,
      classId: null,
      metadata: {
        accountIds: interestApplications.map((application) => application.accountId),
        applied: interestApplications.length,
        totalInterest: interestApplications.reduce(
          (total, application) => Math.round((total + application.interestAmount) * 100) / 100,
          0,
        ),
      },
    });
  });

  return { applied: interestApplications.length };
};

const parseAccountIds = (accountsQuery: string | string[] | undefined) => {
  const accountIdsParam = Array.isArray(accountsQuery) ? accountsQuery[0] : accountsQuery;
  if (!accountIdsParam) {
    return undefined;
  }

  const accountIds = accountIdsParam.split(",").map((value) => Number(value));
  if (accountIds.some((accountId) => !Number.isInteger(accountId) || accountId <= 0)) {
    throw new Error("Invalid account ids");
  }

  return accountIds;
};

export const createCronHandler = ({
  cronSecret,
  applyInterestFn = applyInterest,
}: {
  cronSecret?: string;
  applyInterestFn?: typeof applyInterest;
}) => {
  return async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    if (!cronSecret) {
      logger.error("cron secret missing", { operation: "cron.interest", status: "misconfigured" });
      return res.status(500).json({ message: "Cron is not configured" });
    }

    if (req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).end("Unauthorized");
    }

    let accountIds: number[] | undefined;
    try {
      accountIds = parseAccountIds(req.query.accounts);
    } catch {
      return res.status(400).json({ message: "Invalid account ids" });
    }

    try {
      const result = await applyInterestFn(accountIds);
      res.status(200).json({ message: "Applied interest to accounts", ...result });
    } catch (e) {
      captureException(e, {
        operation: "cron.interest.apply",
        accountIds,
      });
      res.status(500).json({ message: "Failed to apply interest to accounts" });
    }
  };
};

export default createCronHandler({ cronSecret: env.CRON_SECRET });
