import { readFileSync } from "node:fs";

const files = {
  serverSentry: readFileSync("sentry.server.config.ts", "utf8"),
  clientSentry: readFileSync("sentry.client.config.ts", "utf8"),
  edgeSentry: readFileSync("sentry.edge.config.ts", "utf8"),
  env: readFileSync("src/env.js", "utf8"),
  logger: readFileSync("src/server/logger.ts", "utf8"),
  audit: readFileSync("src/server/audit.ts", "utf8"),
  schema: readFileSync("prisma/schema.prisma", "utf8"),
  migration: readFileSync("prisma/migrations/20260526184000_add_audit_log/migration.sql", "utf8"),
  transaction: readFileSync("src/server/api/routers/transaction.ts", "utf8"),
  cron: readFileSync("src/pages/api/cron.ts", "utf8"),
  enrollment: readFileSync("src/server/api/routers/enrollment.ts", "utf8"),
  classRouter: readFileSync("src/server/api/routers/classRouter.ts", "utf8"),
};

const sentryCombined = [files.serverSentry, files.clientSentry, files.edgeSentry].join("\n");
const criticalPaths = [files.transaction, files.cron, files.enrollment, files.classRouter].join("\n");

const checks = [
  {
    name: "Sentry DSN is env-driven and hardcoded DSN is removed",
    pass: sentryCombined.includes("process.env.NEXT_PUBLIC_SENTRY_DSN") && !sentryCombined.includes("ingest.sentry.io"),
  },
  {
    name: "Sentry sampling is env-driven",
    pass:
      sentryCombined.includes("SENTRY_TRACES_SAMPLE_RATE") &&
      files.clientSentry.includes("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE") &&
      files.clientSentry.includes("NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE") &&
      files.clientSentry.includes("NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE"),
  },
  {
    name: "env schema declares Sentry config variables",
    pass:
      files.env.includes("NEXT_PUBLIC_SENTRY_DSN") &&
      files.env.includes("NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE") &&
      files.env.includes("NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE") &&
      files.env.includes("NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE") &&
      files.env.includes("SENTRY_TRACES_SAMPLE_RATE") &&
      files.env.includes("SENTRY_REPLAYS_SESSION_SAMPLE_RATE") &&
      files.env.includes("SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE") &&
      files.env.includes("AUDIT_LOG_ENABLED"),
  },
  {
    name: "structured server logger sanitizes sensitive fields and captures exceptions",
    pass:
      files.logger.includes("sanitizeLogFields") &&
      files.logger.includes("SENSITIVE_KEY_PATTERN") &&
      files.logger.includes("JSON.stringify(entry)") &&
      files.logger.includes("captureException"),
  },
  {
    name: "AuditLog Prisma model and unapplied migration exist",
    pass:
      files.schema.includes("model AuditLog") &&
      files.migration.includes('CREATE TABLE "AuditLog"') &&
      files.migration.includes('CREATE INDEX "AuditLog_actorUserId_idx"'),
  },
  {
    name: "audit helper writes sanitized durable audit events and is gated until migration is applied",
    pass:
      files.audit.includes("writeAuditLog") &&
      files.audit.includes("db.auditLog.create") &&
      files.audit.includes("AUDIT_LOG_ENABLED") &&
      files.audit.includes("return;"),
  },
  {
    name: "critical paths write approved audit actions",
    pass: ["transaction.create", "cron.interest.apply", "enrollment.delete", "class.delete"].every((action) =>
      criticalPaths.includes(action),
    ),
  },
  {
    name: "critical paths capture exceptions with operation context",
    pass:
      criticalPaths.includes("captureException") &&
      criticalPaths.includes('operation: "transaction.create"') &&
      criticalPaths.includes('operation: "cron.interest.apply"') &&
      criticalPaths.includes('operation: "enrollment.delete"') &&
      criticalPaths.includes('operation: "class.delete"'),
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
  console.error(`${failed} Phase 4 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 4 static verification checks passed.");
