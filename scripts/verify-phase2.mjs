import { readFileSync } from "node:fs";

const cron = readFileSync("src/pages/api/cron.ts", "utf8");
const env = readFileSync("src/env.js", "utf8");

const checks = [
  {
    name: "cron uses shared Prisma client and does not construct PrismaClient per request",
    pass: cron.includes('import { db } from "~/server/db"') && !cron.includes("new PrismaClient"),
  },
  {
    name: "cron fails closed when CRON_SECRET is missing",
    pass: cron.includes("if (!cronSecret)") && cron.includes('status(500).json({ message: "Cron is not configured" })'),
  },
  {
    name: "cron rejects invalid authorization",
    pass: cron.includes('req.headers.authorization !== `Bearer ${cronSecret}`') && cron.includes('status(401).end("Unauthorized")'),
  },
  {
    name: "interest transaction amount is earned interest, not new balance",
    pass:
      cron.includes("interestAmount") &&
      cron.includes("amount: application.interestAmount") &&
      !cron.includes("amount: application.newBalance") &&
      !cron.includes("amount: newBalance"),
  },
  {
    name: "interest transaction rows and account updates are atomic",
    pass:
      cron.includes("await dbClient.$transaction") &&
      cron.includes("await tx.transaction.createMany") &&
      cron.includes("await tx.account.update") &&
      cron.includes("balance: { increment: application.interestAmount }"),
  },
  {
    name: "interest ledger rows are included in same transaction",
    pass: cron.includes("await tx.ledger.createMany") && cron.includes("credit: application.interestAmount") && cron.includes("debit: application.interestAmount"),
  },
  {
    name: "interest errors are not swallowed and handler returns 500",
    pass:
      !cron.includes("catch (e) {\n    console.error(`Failed to apply interest for accounts`, e);\n  }") &&
      cron.includes('status(500).json({ message: "Failed to apply interest to accounts" })'),
  },
  {
    name: "CRON_SECRET remains declared in env schema",
    pass: env.includes("CRON_SECRET"),
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
  console.error(`${failed} Phase 2 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 2 static verification checks passed.");
