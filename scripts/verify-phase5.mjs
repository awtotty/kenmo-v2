import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20260527020000_add_phase5_indexes/migration.sql", "utf8");
const enrollment = readFileSync("src/server/api/routers/enrollment.ts", "utf8");
const manage = readFileSync("src/pages/class/[classCode]/manage.tsx", "utf8");
const transfer = readFileSync("src/pages/class/[classCode]/transfer.tsx", "utf8");

const checks = [
  {
    name: "schema has useful enrollment indexes",
    pass: [
      "@@index([userId])",
      "@@index([classId])",
      "@@index([classId, userId])",
      "@@index([classId, role])",
    ].every((text) => schema.includes(text)),
  },
  {
    name: "schema has transaction feed/history indexes",
    pass: schema.includes("@@index([fromAccountId, createdAt])") && schema.includes("@@index([toAccountId, createdAt])"),
  },
  {
    name: "schema has custom transaction owner index",
    pass: schema.includes("@@index([ownerId])"),
  },
  {
    name: "index migration exists and does not include non-index table changes",
    pass:
      migration.includes('CREATE INDEX "Enrollment_classId_userId_idx"') &&
      migration.includes('CREATE INDEX "Transaction_fromAccountId_createdAt_idx"') &&
      migration.includes('CREATE INDEX "CustomTransaction_ownerId_idx"') &&
      !migration.includes("CREATE TABLE") &&
      !migration.includes("ALTER TABLE"),
  },
  {
    name: "enrollment client cleanup batches classes/accounts instead of per-row DB lookups",
    pass:
      enrollment.includes("loadEnrollmentClientContext") &&
      enrollment.includes("id: { in: classIds }") &&
      enrollment.includes("id: { in: accountIds }") &&
      !enrollment.includes("const classObj = await db.class.findFirst") &&
      !enrollment.includes("const checkingAccount = await db.account.findFirst"),
  },
  {
    name: "manage page memoizes transaction joins with maps",
    pass:
      manage.includes("const accountById = useMemo") &&
      manage.includes("const userById = useMemo") &&
      manage.includes("accountById.get(transaction.fromAccountId)") &&
      !manage.includes("accounts?.find((account) => account.id == transaction.fromAccountId)"),
  },
  {
    name: "manage page class-code queries have enabled guards",
    pass:
      manage.includes("classCodeQueryEnabled") &&
      manage.includes("{ enabled: classCodeQueryEnabled }") &&
      manage.includes("{ enabled: queryEnabled }"),
  },
  {
    name: "transfer page account and class-code queries have enabled guards",
    pass:
      transfer.includes("hasSelectedFromAccount") &&
      transfer.includes("{ enabled: hasSelectedFromAccount }") &&
      transfer.includes("hasClassCode") &&
      transfer.includes("{ enabled: hasClassCode }"),
  },
];

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`PASS ${check.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${check.name}`);
  }
}

if (failed > 0) {
  console.error(`${failed} Phase 5 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 5 verification checks passed.");
