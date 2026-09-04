import { readFileSync } from "node:fs";

const transaction = readFileSync("src/server/api/routers/transaction.ts", "utf8");
const account = readFileSync("src/server/api/routers/account.ts", "utf8");

const checks = [
  {
    name: "transfer amount accepts zero and rounds nonzero values to cents",
    pass:
      transaction.includes(".finite()") &&
      transaction.includes("amount === 0 ||") &&
      transaction.includes("Math.round(Math.abs(amount) * 100) > 0") &&
      transaction.includes("Math.round(Math.abs(amount) * 100) / 100") &&
      transaction.includes("amount: signedCentsAmount"),
  },
  {
    name: "same-account transfers are rejected with TRPCError",
    pass:
      transaction.includes("input.fromAccountId === input.toAccountId") &&
      transaction.includes('code: "BAD_REQUEST"'),
  },
  {
    name: "transfer authorization requires active-class enrollment for source and target accounts",
    pass:
      transaction.includes("checkingAccountId: input.fromAccountId") &&
      transaction.includes("checkingAccountId: input.toAccountId") &&
      transaction.includes("class: { deletedAt: null }") &&
      transaction.includes("Transfers must stay within the same active class"),
  },
  {
    name: "student transfers are restricted to teacher/admin/bank accounts",
    pass:
      transaction.includes("targetIsTeacherOrAdmin") &&
      transaction.includes("Students can only transfer to teacher, admin, or bank accounts"),
  },
  {
    name: "admins can transfer and create normalized deductions within their active class",
    pass:
      transaction.includes("actorIsAdmin") &&
      transaction.includes("Only admins can create deductions") &&
      transaction.includes("const fromAccountId = isDeduction ? input.toAccountId : input.fromAccountId") &&
      transaction.includes("actorEnrollment.role === Role.ADMIN"),
  },
  {
    name: "balance writes use atomic increment/decrement rather than stale absolute balances",
    pass:
      transaction.includes("balance: { decrement: amount }") &&
      transaction.includes("balance: { increment: amount }") &&
      !transaction.includes("fromAccount.balance - input.amount") &&
      !transaction.includes("toAccount.balance + input.amount"),
  },
  {
    name: "transaction/account routers use TRPCError instead of TRPCClientError",
    pass:
      transaction.includes('from "@trpc/server"') &&
      account.includes('from "@trpc/server"') &&
      !transaction.includes("TRPCClientError") &&
      !account.includes("TRPCClientError"),
  },
  {
    name: "direct arbitrary account creation is forbidden",
    pass:
      account.includes("Direct account creation is restricted") &&
      account.includes('code: "FORBIDDEN"'),
  },
  {
    name: "class-scoped account queries require active classes",
    pass:
      (account.match(/deletedAt: null/g)?.length ?? 0) >= 3,
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
  console.error(`${failed} Phase 1 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 1 verification checks passed.");
