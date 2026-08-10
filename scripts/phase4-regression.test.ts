import assert from "node:assert/strict";
import { appRouter } from "../src/server/api/root";
import { sanitizeLogFields } from "../src/server/logger";
import { writeAuditLog } from "../src/server/audit";

async function run() {
  assert.deepEqual(
    sanitizeLogFields({ operation: "test", userId: "user_123", authorization: "Bearer secret", apiToken: "secret-token" }),
    { operation: "test", userId: "user_123", authorization: "[redacted]", apiToken: "[redacted]" },
  );

  const auditCalls: any[] = [];
  await writeAuditLog({ auditLog: { create: async (args: unknown) => auditCalls.push(args) } } as any, {
    actorUserId: "user_123",
    action: "transaction.create",
    entityType: "Transaction",
    entityId: 42,
    classId: 7,
    metadata: { amount: 1.23, fromAccountId: 1, toAccountId: 2 },
  }, { force: true });
  assert.deepEqual(auditCalls[0], {
    data: {
      actorUserId: "user_123",
      action: "transaction.create",
      entityType: "Transaction",
      entityId: "42",
      classId: 7,
      metadata: { amount: 1.23, fromAccountId: 1, toAccountId: 2 },
    },
  });

  process.env.AUDIT_LOG_ENABLED = "true";
  const routerAuditCalls: any[] = [];
  const tx = {
    class: { update: async () => ({}) },
    enrollment: { delete: async ({ where }: any) => ({ id: where.id, userId: "student", classId: 1, role: "STUDENT", checkingAccountId: 20 }) },
    auditLog: { create: async (args: any) => routerAuditCalls.push(args) },
  };
  const db = {
    class: {
      findFirst: async () => ({ id: 1, name: "Class", classCode: "ABC123", deletedAt: null }),
    },
    enrollment: {
      findFirst: async ({ where }: any) => {
        if (where.id === 2) return { id: 2, userId: "student", classId: 1, role: "STUDENT", checkingAccountId: 20 };
        return { id: 1, userId: "admin", classId: 1, role: "ADMIN", checkingAccountId: 10 };
      },
      findMany: async () => [{ id: 1, userId: "admin", classId: 1, role: "ADMIN", checkingAccountId: 10 }],
    },
    $transaction: async (callback: (txArg: typeof tx) => unknown) => callback(tx),
  };
  const api = appRouter.createCaller({ auth: { userId: "admin" }, db } as any);

  await api.class.delete({ classCode: "ABC123" });
  await api.enrollment.delete({ id: 2 });

  assert.deepEqual(routerAuditCalls.map((call) => call.data.action), ["class.delete", "enrollment.delete"]);
  assert.equal(routerAuditCalls[0].data.actorUserId, "admin");
  assert.equal(routerAuditCalls[0].data.entityType, "Class");
  assert.equal(routerAuditCalls[1].data.entityType, "Enrollment");
  assert.deepEqual(routerAuditCalls[1].data.metadata, {
    deletedUserId: "student",
    deletedRole: "STUDENT",
    checkingAccountId: 20,
  });
  delete process.env.AUDIT_LOG_ENABLED;

  console.log("Phase 4 behavioral regression tests passed.");
}

await run();
