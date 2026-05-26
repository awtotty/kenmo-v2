import assert from "node:assert/strict";
import { appRouter } from "../src/server/api/root";

const userId = "user_student";
const adminId = "user_admin";
const otherStudentId = "user_other_student";
const outsiderId = "user_outsider";

const activeClass = { id: 1, deletedAt: null };
const deletedClass = { id: 2, deletedAt: new Date() };

const enrollments = {
  student: {
    id: 1,
    userId,
    classId: activeClass.id,
    role: "STUDENT",
    checkingAccountId: 101,
  },
  admin: {
    id: 2,
    userId: adminId,
    classId: activeClass.id,
    role: "ADMIN",
    checkingAccountId: 201,
  },
  otherStudent: {
    id: 3,
    userId: otherStudentId,
    classId: activeClass.id,
    role: "STUDENT",
    checkingAccountId: 301,
  },
  deletedClassAdmin: {
    id: 4,
    userId: "deleted_admin",
    classId: deletedClass.id,
    role: "ADMIN",
    checkingAccountId: 401,
  },
};

type Enrollment = typeof enrollments[keyof typeof enrollments];

type MockDbOptions = {
  actorUserId?: string;
  fromEnrollment?: Enrollment | null;
  toEnrollment?: Enrollment | null;
  actorEnrollment?: Enrollment | null;
  delayAccountUpdatesMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeDb(options: MockDbOptions = {}) {
  const calls = {
    ledgerCreateMany: [] as any[],
    accountUpdate: [] as any[],
    transactionCreate: [] as any[],
  };

  const actorUserId = options.actorUserId ?? userId;
  const fromEnrollment = options.fromEnrollment === undefined ? enrollments.student : options.fromEnrollment;
  const toEnrollment = options.toEnrollment === undefined ? enrollments.admin : options.toEnrollment;
  const actorEnrollment = options.actorEnrollment === undefined ? fromEnrollment : options.actorEnrollment;

  const tx = {
    enrollment: {
      findFirst: async ({ where }: any) => {
        if (where.checkingAccountId === 101) return fromEnrollment;
        if (where.checkingAccountId === 201) return toEnrollment;
        if (where.checkingAccountId === 301) return options.toEnrollment ?? enrollments.otherStudent;
        if (where.checkingAccountId === 401) return options.toEnrollment ?? null;
        if (where.userId === actorUserId && where.classId === activeClass.id) return actorEnrollment;
        return null;
      },
    },
    ledger: {
      createMany: async (args: any) => calls.ledgerCreateMany.push(args),
    },
    account: {
      update: async (args: any) => {
        if (options.delayAccountUpdatesMs) await sleep(options.delayAccountUpdatesMs);
        calls.accountUpdate.push(args);
      },
    },
    transaction: {
      create: async (args: any) => calls.transactionCreate.push(args),
    },
  };

  return {
    calls,
    db: {
      $transaction: async (callback: (txArg: typeof tx) => unknown) => callback(tx),
      account: {
        findMany: async () => [],
      },
      class: {
        findFirst: async () => activeClass,
      },
      enrollment: {
        findMany: async () => [],
        findFirst: async () => actorEnrollment,
      },
      transaction: {
        findMany: async () => [],
        count: async () => 0,
      },
      customTransaction: {
        findMany: async () => [],
      },
    },
  };
}

function caller(options: MockDbOptions = {}) {
  const { db, calls } = makeDb(options);
  return {
    calls,
    api: appRouter.createCaller({
      auth: { userId: options.actorUserId ?? userId },
      db,
    } as any),
  };
}

async function rejectsWithMessage(promise: Promise<unknown>, message: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    assert.match((error as Error).message, message);
    return true;
  });
}

function assertLedgerTransfer(calls: { ledgerCreateMany: any[] }, fromAccountId: number, toAccountId: number, amount: number) {
  assert.deepEqual(calls.ledgerCreateMany, [
    {
      data: [
        { accountId: fromAccountId, debit: 0, credit: amount },
        { accountId: toAccountId, debit: amount, credit: 0 },
      ],
    },
  ]);
}

async function run() {
  await rejectsWithMessage(
    caller().api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: -1, note: "bad" }),
    /Number must be greater than 0/,
  );

  await rejectsWithMessage(
    caller().api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: 0, note: "bad" }),
    /Number must be greater than 0/,
  );

  await rejectsWithMessage(
    caller().api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: 0.001, note: "bad" }),
    /Amount must be at least \$0\.01/,
  );

  await rejectsWithMessage(
    caller().api.transaction.create({ fromAccountId: 101, toAccountId: 101, amount: 1, note: "same" }),
    /Cannot transfer to the same account/,
  );

  await rejectsWithMessage(
    caller({ toEnrollment: { ...enrollments.admin, classId: 99 } }).api.transaction.create({
      fromAccountId: 101,
      toAccountId: 201,
      amount: 1,
      note: "cross-class",
    }),
    /Transfers must stay within the same active class/,
  );

  await rejectsWithMessage(
    caller({ fromEnrollment: null }).api.transaction.create({
      fromAccountId: 401,
      toAccountId: 201,
      amount: 1,
      note: "deleted-from-class",
    }),
    /from account does not belong to an active class/,
  );

  await rejectsWithMessage(
    caller({ toEnrollment: null }).api.transaction.create({
      fromAccountId: 101,
      toAccountId: 401,
      amount: 1,
      note: "deleted-to-class",
    }),
    /to account does not belong to an active class/,
  );

  await rejectsWithMessage(
    caller({ actorUserId: outsiderId, actorEnrollment: null }).api.transaction.create({
      fromAccountId: 101,
      toAccountId: 201,
      amount: 1,
      note: "outsider",
    }),
    /You are not enrolled in this class/,
  );

  await rejectsWithMessage(
    caller({
      actorUserId: otherStudentId,
      actorEnrollment: enrollments.otherStudent,
    }).api.transaction.create({
      fromAccountId: 101,
      toAccountId: 201,
      amount: 1,
      note: "non-owner-spend",
    }),
    /You cannot transfer from this account/,
  );

  await rejectsWithMessage(
    caller({ toEnrollment: enrollments.otherStudent }).api.transaction.create({
      fromAccountId: 101,
      toAccountId: 301,
      amount: 1,
      note: "student-to-student",
    }),
    /Students can only transfer to teacher, admin, or bank accounts/,
  );

  const student = caller();
  await student.api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: 2.255, note: "student" });
  assertLedgerTransfer(student.calls, 101, 201, 2.26);
  assert.deepEqual(student.calls.accountUpdate, [
    { where: { id: 101 }, data: { balance: { decrement: 2.26 } } },
    { where: { id: 201 }, data: { balance: { increment: 2.26 } } },
  ]);

  const admin = caller({
    actorUserId: adminId,
    fromEnrollment: enrollments.admin,
    toEnrollment: enrollments.otherStudent,
    actorEnrollment: enrollments.admin,
  });
  await admin.api.transaction.create({ fromAccountId: 201, toAccountId: 301, amount: 1.239, note: "admin" });
  assertLedgerTransfer(admin.calls, 201, 301, 1.24);
  assert.deepEqual(admin.calls.accountUpdate, [
    { where: { id: 201 }, data: { balance: { decrement: 1.24 } } },
    { where: { id: 301 }, data: { balance: { increment: 1.24 } } },
  ]);
  assert.deepEqual(admin.calls.transactionCreate, [
    { data: { fromAccountId: 201, toAccountId: 301, amount: 1.24, note: "admin" } },
  ]);

  const concurrent = caller({ delayAccountUpdatesMs: 5 });
  await Promise.all([
    concurrent.api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: 1, note: "c1" }),
    concurrent.api.transaction.create({ fromAccountId: 101, toAccountId: 201, amount: 2, note: "c2" }),
  ]);
  assert.deepEqual(concurrent.calls.accountUpdate, [
    { where: { id: 101 }, data: { balance: { decrement: 1 } } },
    { where: { id: 101 }, data: { balance: { decrement: 2 } } },
    { where: { id: 201 }, data: { balance: { increment: 1 } } },
    { where: { id: 201 }, data: { balance: { increment: 2 } } },
  ]);
  assert.equal(concurrent.calls.transactionCreate.length, 2);

  await rejectsWithMessage(
    caller().api.account.create({ balance: 999999, interestRate: 1, interestPeriodDays: 1 }),
    /Direct account creation is restricted/,
  );

  console.log("Phase 1 behavioral regression tests passed.");
}

await run();
