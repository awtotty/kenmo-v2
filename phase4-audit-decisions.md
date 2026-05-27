# Phase 4 Audit Trail Decisions

User-approved decisions for Phase 4:

- Add a durable `AuditLog` Prisma model.
- Add a migration file for the audit table.
- Do **not** run or apply the migration yet; deployment/migration will wait until summer downtime.
- Use the recommended minimal audit schema:
  - `id Int @id @default(autoincrement())`
  - `actorUserId String?`
  - `action String`
  - `entityType String`
  - `entityId String?`
  - `classId Int?`
  - `metadata Json`
  - `createdAt DateTime @default(now())`
  - indexes on `actorUserId`, `action`, `[entityType, entityId]`, `classId`, and `createdAt`
- Write audit records for transfers, enrollment deletion, class deletion, and cron interest.
