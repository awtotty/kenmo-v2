import assert from "node:assert/strict";
import { applyInterest, buildInterestApplications, createCronHandler } from "../src/pages/api/cron";

function mockRes() {
  return {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    end(body?: unknown) {
      this.ended = true;
      this.body = body;
      return this;
    },
  };
}

async function run() {
  const applications = buildInterestApplications([
    { id: 1, balance: 100, interestRate: 0.2 / 365, interestPeriodDays: 1, ownerId: "u1", name: "Student" },
    { id: 2, balance: 0, interestRate: 0.2 / 365, interestPeriodDays: 1, ownerId: "u2", name: "Zero" },
    { id: 3, balance: 100, interestRate: 0, interestPeriodDays: 1, ownerId: "u3", name: "No interest" },
    { id: 1000, balance: 100, interestRate: 0.2 / 365, interestPeriodDays: 1, ownerId: "bank", name: "Bank" },
  ] as any);

  assert.deepEqual(applications, [
    {
      accountId: 1,
      interestAmount: 0.05,
      newBalance: 100.05,
      note: "You earned $0.05 in interest! 🎉",
    },
  ]);

  const atomicCalls = {
    findMany: [] as unknown[],
    transactionCreateMany: [] as unknown[],
    ledgerCreateMany: [] as unknown[],
    accountUpdate: [] as unknown[],
  };
  const mockDb = {
    account: {
      findMany: async (args: unknown) => {
        atomicCalls.findMany.push(args);
        return [
          { id: 10, balance: 100, interestRate: 0.2 / 365, interestPeriodDays: 1, ownerId: "u10", name: "Student" },
          { id: 11, balance: -100, interestRate: 0.2 / 365, interestPeriodDays: 1, ownerId: "u11", name: "Negative" },
        ];
      },
    },
    $transaction: async (callback: (tx: any) => Promise<void>) => callback({
      transaction: {
        createMany: async (args: unknown) => atomicCalls.transactionCreateMany.push(args),
      },
      ledger: {
        createMany: async (args: unknown) => atomicCalls.ledgerCreateMany.push(args),
      },
      account: {
        update: async (args: unknown) => atomicCalls.accountUpdate.push(args),
      },
    }),
  };

  assert.deepEqual(await applyInterest([10, 11], mockDb as any), { applied: 1 });
  assert.deepEqual(atomicCalls.findMany, [{ where: { id: { in: [10, 11] } } }]);
  assert.deepEqual(atomicCalls.transactionCreateMany, [{
    data: [{
      fromAccountId: 1000,
      toAccountId: 10,
      amount: 0.05,
      note: "You earned $0.05 in interest! 🎉",
    }],
  }]);
  assert.deepEqual(atomicCalls.ledgerCreateMany, [{
    data: [
      { accountId: 1000, debit: 0, credit: 0.05 },
      { accountId: 10, debit: 0.05, credit: 0 },
    ],
  }]);
  assert.deepEqual(atomicCalls.accountUpdate, [{
    where: { id: 10 },
    data: { balance: { increment: 0.05 } },
  }]);

  const missingSecretRes = mockRes();
  await createCronHandler({ cronSecret: undefined, applyInterestFn: async () => ({ applied: 0 }) })(
    { headers: {}, query: {} } as any,
    missingSecretRes as any,
  );
  assert.equal(missingSecretRes.statusCode, 500);
  assert.deepEqual(missingSecretRes.body, { message: "Cron is not configured" });

  const unauthorizedRes = mockRes();
  await createCronHandler({ cronSecret: "secret", applyInterestFn: async () => ({ applied: 0 }) })(
    { headers: { authorization: "Bearer wrong" }, query: {} } as any,
    unauthorizedRes as any,
  );
  assert.equal(unauthorizedRes.statusCode, 401);
  assert.equal(unauthorizedRes.ended, true);

  const invalidIdsRes = mockRes();
  await createCronHandler({ cronSecret: "secret", applyInterestFn: async () => ({ applied: 0 }) })(
    { headers: { authorization: "Bearer secret" }, query: { accounts: "1,nope" } } as any,
    invalidIdsRes as any,
  );
  assert.equal(invalidIdsRes.statusCode, 400);
  assert.deepEqual(invalidIdsRes.body, { message: "Invalid account ids" });

  let receivedAccountIds: number[] | undefined;
  const successRes = mockRes();
  await createCronHandler({
    cronSecret: "secret",
    applyInterestFn: async (accountIds) => {
      receivedAccountIds = accountIds;
      return { applied: 2 };
    },
  })(
    { headers: { authorization: "Bearer secret" }, query: { accounts: "1,2" } } as any,
    successRes as any,
  );
  assert.deepEqual(receivedAccountIds, [1, 2]);
  assert.equal(successRes.statusCode, 200);
  assert.deepEqual(successRes.body, { message: "Applied interest to accounts", applied: 2 });

  const failureRes = mockRes();
  await createCronHandler({
    cronSecret: "secret",
    applyInterestFn: async () => {
      throw new Error("database failed");
    },
  })(
    { headers: { authorization: "Bearer secret" }, query: {} } as any,
    failureRes as any,
  );
  assert.equal(failureRes.statusCode, 500);
  assert.deepEqual(failureRes.body, { message: "Failed to apply interest to accounts" });

  console.log("Phase 2 behavioral regression tests passed.");
}

await run();
