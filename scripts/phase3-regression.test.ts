import assert from "node:assert/strict";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../src/server/api/root";

const adminId = "admin";
const studentId = "student";
const activeClass = { id: 1, name: "Active", classCode: "ABC123", deletedAt: null };
const deletedClass = { id: 2, name: "Deleted", classCode: "DEL123", deletedAt: new Date() };
const adminEnrollment = { id: 1, userId: adminId, classId: 1, role: "ADMIN", checkingAccountId: 10 };
const studentEnrollment = { id: 2, userId: studentId, classId: 1, role: "STUDENT", checkingAccountId: 20 };

function makeDb(options: {
  classResult?: unknown;
  enrollments?: unknown[];
  enrollmentResult?: unknown;
} = {}) {
  const classResult = options.classResult === undefined ? activeClass : options.classResult;
  const enrollments = options.enrollments === undefined ? [adminEnrollment, studentEnrollment] : options.enrollments;
  const enrollmentResult = options.enrollmentResult === undefined ? adminEnrollment : options.enrollmentResult;

  return {
    account: {
      findMany: async () => [],
    },
    class: {
      findFirst: async ({ where }: any) => {
        if (where?.deletedAt === null && classResult === deletedClass) return null;
        return classResult;
      },
      update: async () => activeClass,
    },
    enrollment: {
      findMany: async ({ where }: any = {}) => {
        if (where?.userId) return enrollments.filter((enrollment: any) => enrollment.userId === where.userId);
        if (where?.role) return enrollments.filter((enrollment: any) => enrollment.role === where.role);
        return enrollments;
      },
      findFirst: async ({ where }: any = {}) => {
        if (where?.class?.deletedAt === null && enrollmentResult && (enrollmentResult as any).classId === deletedClass.id) return null;
        if (where?.userId && where.userId !== (enrollmentResult as any)?.userId) return null;
        if (where?.role && where.role !== (enrollmentResult as any)?.role) return null;
        return enrollmentResult;
      },
      delete: async ({ where }: any) => ({ id: where.id }),
    },
    transaction: {
      findMany: async () => [],
      count: async () => 0,
    },
    customTransaction: {
      findMany: async () => [],
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback({}),
  };
}

function caller(userId: string | null, db = makeDb()) {
  return appRouter.createCaller({
    auth: userId ? { userId } : null,
    db,
  } as any);
}

async function rejectsWithCode(promise: Promise<unknown>, code: string, message?: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    assert(error instanceof TRPCError);
    assert.equal((error as TRPCError).code, code);
    if (message) assert.match((error as Error).message, message);
    return true;
  });
}

async function run() {
  await rejectsWithCode(
    caller(null).account.getAll(),
    "UNAUTHORIZED",
  );

  await rejectsWithCode(
    caller(adminId, makeDb({ classResult: null })).class.getByClassCode({ classCode: "ABC123" }),
    "NOT_FOUND",
    /Class not found/,
  );

  await rejectsWithCode(
    caller(adminId, makeDb({ classResult: deletedClass })).user.getAllByClassCode({ classCode: "DEL123" }),
    "NOT_FOUND",
    /Class not found/,
  );

  await rejectsWithCode(
    caller(studentId, makeDb({ enrollments: [adminEnrollment, studentEnrollment], enrollmentResult: studentEnrollment })).user.getAllByClassCode({ classCode: "ABC123" }),
    "FORBIDDEN",
    /not an admin/,
  );

  await rejectsWithCode(
    caller(studentId, makeDb({ classResult: deletedClass })).enrollment.getCurrentUserByClassCode({ classCode: "DEL123" }),
    "NOT_FOUND",
    /Class not found/,
  );

  await rejectsWithCode(
    caller(adminId, makeDb({ enrollmentResult: null })).enrollment.delete({ id: 99 }),
    "NOT_FOUND",
    /Enrollment not found/,
  );

  await rejectsWithCode(
    caller(studentId, makeDb({ enrollmentResult: studentEnrollment, enrollments: [adminEnrollment, studentEnrollment] })).enrollment.delete({ id: 2 }),
    "FORBIDDEN",
    /not an admin/,
  );

  await rejectsWithCode(
    caller(studentId, makeDb({ classResult: deletedClass })).account.getAllByClassCode({ classCode: "DEL123" }),
    "NOT_FOUND",
    /Class not found/,
  );

  await rejectsWithCode(
    caller(studentId, makeDb({ classResult: deletedClass })).transaction.getAllByClassCode({ classCode: "DEL123", page: 1, pageSize: 50 }),
    "NOT_FOUND",
    /Class not found/,
  );

  console.log("Phase 3 behavioral regression tests passed.");
}

await run();
