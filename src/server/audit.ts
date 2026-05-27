import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "~/env";

type AuditDb = PrismaClient | Prisma.TransactionClient;

export type AuditAction =
  | "transaction.create"
  | "enrollment.delete"
  | "class.delete"
  | "cron.interest.apply";

type AuditEvent = {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | number | null;
  classId?: number | null;
  metadata?: Prisma.InputJsonValue;
};

type AuditOptions = {
  force?: boolean;
};

export const isAuditLogEnabled = () => env.AUDIT_LOG_ENABLED === "true" || process.env.AUDIT_LOG_ENABLED === "true";

export const writeAuditLog = async (db: AuditDb, event: AuditEvent, options: AuditOptions = {}) => {
  // Keep audit writes dormant until the AuditLog migration is deliberately applied.
  // Set AUDIT_LOG_ENABLED=true after deploying the migration.
  if (!options.force && !isAuditLogEnabled()) {
    return;
  }

  await db.auditLog.create({
    data: {
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId == null ? null : String(event.entityId),
      classId: event.classId ?? null,
      metadata: event.metadata ?? {},
    },
  });
};
