-- Drop redundant primary-key duplicate indexes
DROP INDEX IF EXISTS "Enrollment_id_idx";

-- Enrollment lookup indexes
CREATE INDEX "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");
CREATE INDEX "Enrollment_classId_userId_idx" ON "Enrollment"("classId", "userId");
CREATE INDEX "Enrollment_classId_role_idx" ON "Enrollment"("classId", "role");

-- Transaction feed/history indexes
CREATE INDEX "Transaction_fromAccountId_createdAt_idx" ON "Transaction"("fromAccountId", "createdAt");
CREATE INDEX "Transaction_toAccountId_createdAt_idx" ON "Transaction"("toAccountId", "createdAt");

-- Custom transaction owner lookup index
CREATE INDEX "CustomTransaction_ownerId_idx" ON "CustomTransaction"("ownerId");
