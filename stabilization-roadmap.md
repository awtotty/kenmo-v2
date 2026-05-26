# Kenmo Stabilization Roadmap

## Objective

Create a sequential implementation plan to fix the highest-priority stability, security, logging, and performance issues in Kenmo. This plan is intentionally implementation-ready but does not make code changes.

## Step 1 — Stabilization themes from the codebase review

### Theme A: Financial correctness and data integrity

Highest-risk findings:
- `src/server/api/routers/transaction.ts` accepts `amount: z.number()` without requiring a positive finite amount.
- Negative transfer amounts invert balances and can drain another account.
- Transfer balance updates read accounts before the transaction and write absolute balances inside it, creating lost-update risk under concurrent requests.
- Monetary values use `Float` in `prisma/schema.prisma`, which can accumulate rounding drift.
- `src/pages/api/cron.ts` records interest transactions with `amount: newBalance` instead of the interest earned.
- Cron interest writes transactions and account balance updates outside a single transaction.
- Cron interest does not create ledger entries, unlike normal transfers.

### Theme B: Authorization and class/account boundaries

Highest-risk findings:
- `transaction.create` verifies ownership of `fromAccountId` but only verifies existence of `toAccountId`.
- Transfers can target accounts outside the active class or outside the actor's permitted relationship.
- `account.create` lets any authenticated user create an account with arbitrary balance and interest settings.
- Some class-scoped reads do not consistently filter `deletedAt: null`.
- `CRON_SECRET` is optional, and the cron endpoint can pass if the header is `Bearer undefined` when the secret is unset.

### Theme C: Cron reliability and operational correctness

Highest-risk findings:
- Interest cron catches errors and suppresses them, allowing HTTP 200 even when financial writes fail.
- Cron creates a new `PrismaClient` per invocation rather than reusing `src/server/db.ts`.
- Cron has no run history, processed/skipped/failed counts, duration, or last-success record.
- The world/bank account ID is hardcoded as `1000` without validating that the account exists or is correct.

### Theme D: Logging, Sentry, and auditability

Highest-risk findings:
- Sentry DSN is hardcoded in Sentry config files.
- Sentry is configured but critical server operations do not capture exceptions with useful context.
- Logging is unstructured `console.error` / `console.warn` without operation names, user IDs, class IDs, account IDs, duration, or status.
- No durable audit log exists for financial/admin mutations.

### Theme E: Performance and scalability

Highest-risk findings:
- `Transaction` lacks indexes for account-history and class-feed queries ordered by `createdAt`.
- `Enrollment` has a redundant `@@index([id])` and lacks indexes for common `classId`, `userId`, and role filters.
- Enrollment and user routers perform N+1 database and Clerk calls.
- The admin manage page duplicates class-wide data fetches and performs client-side repeated `.find()` joins.
- Cron updates accounts one-by-one with unbounded `Promise.all`.

### Theme F: Build/config hygiene and tests

Highest-risk findings:
- Both `next.config.js` and `next.config.mjs` exist.
- `next.config.mjs` imports `./src/env.mjs`, but the repo contains `src/env.js`.
- There is no visible test suite for financial transfers, cron interest, authorization, deleted classes, or admin-only flows.

## Step 2 — Risk and dependency ranking

### Rank 1: Financial correctness and authorization blockers

These must be fixed first because they can corrupt balances or permit unauthorized movement of funds.

Depends on decisions about:
- Money representation: keep `Float` temporarily, move to Prisma `Decimal`, or migrate to integer cents.
- Overdraft policy: allow, reject, or only allow for teacher/admin/bank accounts.
- Valid transfer relationships: student-to-teacher only, admin-to-student, student-to-student, or all class-internal transfers.

### Rank 2: Cron reliability and interest correctness

Fix after transfer invariants are defined, because cron is another financial mutation path and should use the same money/accounting conventions.

Depends on decisions about:
- Whether interest should be represented as ledger entries.
- Whether the world/bank account should be global, per-class, or configured by environment/database.

### Rank 3: Error semantics, logging, Sentry, and audit trail

Fix after critical mutation flows are bounded, so logs and audit records capture the right operations and fields.

Depends on decisions about:
- Whether audit logs should live in Postgres through Prisma.
- Preferred log destination: platform logs only, Sentry breadcrumbs/events, or external log aggregation.

### Rank 4: Performance indexes and query consolidation

Fix after model changes are settled, because indexes and query shapes may change if account/class relationships or money fields are migrated.

Depends on decisions about:
- Migration tolerance for adding indexes and new model fields.
- Whether to add server-side aggregate/dashboard endpoints.

### Rank 5: Build/config cleanup and tests

Tests should start early for blocker fixes, but broad cleanup can follow the financial and authorization design decisions. Config hygiene should happen before deployment.

Depends on decisions about:
- Test framework preference, if any.
- Whether dependency install/build verification is available in the environment.

## Step 3 — Concrete implementation tasks by theme

### Phase 1: Lock down financial mutations and authorization

Affected files:
- `src/server/api/routers/transaction.ts`
- `src/server/api/routers/account.ts`
- `src/server/api/trpc.ts`
- `prisma/schema.prisma`

Tasks:
1. Replace server-side transfer validation with strict constraints:
   - `amount` must be positive and finite.
   - Apply precision policy: integer cents or Decimal scale.
   - Reject same-account transfers unless an explicit business case exists.
2. Replace server-side `TRPCClientError` throws in mutation paths with `TRPCError` from `@trpc/server` and explicit codes such as `BAD_REQUEST`, `FORBIDDEN`, and `NOT_FOUND`.
3. Verify both accounts in `transaction.create` inside the database transaction.
4. Enforce transfer authorization:
   - Actor must own or administratively control the source account.
   - Source and target accounts must belong to the same non-deleted class unless explicitly allowed otherwise.
   - Student transfers must only target permitted class/bank/teacher accounts according to product policy.
5. Use atomic updates for balances inside the transaction:
   - Sender update uses decrement.
   - Recipient update uses increment.
   - Add conditional insufficient-funds checks if overdrafts are disallowed.
6. Ensure ledger rows and transaction row are created in the same transaction as balance updates.
7. Remove or restrict `account.create`:
   - Preferred: make account creation internal to class creation/join/admin flows.
   - If retained, require admin/internal permission and server-controlled defaults.
8. Start money-type migration plan:
   - Short-term: validate/round amounts consistently at input boundary.
   - Long-term: replace `Float` money fields with integer cents or Prisma `Decimal`.

Expected behavior after fix:
- Negative/zero/invalid amounts are rejected before financial writes.
- Unauthorized target accounts cannot receive or lose funds.
- Concurrent transfers do not overwrite each other's balances.
- Transfer, ledger, and account balance changes remain atomic.

Validation/tests:
- Unit/integration test: negative amount rejected.
- Unit/integration test: zero amount rejected.
- Unit/integration test: transfer to account outside class rejected.
- Unit/integration test: non-owner cannot spend from another user's account.
- Unit/integration test: concurrent transfers preserve total balance and do not lose updates.
- Unit/integration test: ledger debit/credit entries match the transaction amount.
- Unit/integration test: deleted-class accounts cannot be used for normal transfers.

### Phase 2: Fix cron interest and cron security

Affected files:
- `src/pages/api/cron.ts`
- `src/env.js`
- `src/server/db.ts`
- `prisma/schema.prisma`

Tasks:
1. Make `CRON_SECRET` required in production and fail closed if unset.
2. Reject cron requests when authorization is missing, malformed, or when `CRON_SECRET` is not configured.
3. Reuse shared Prisma client from `src/server/db.ts` rather than creating a new `PrismaClient` per request.
4. Store interest transaction `amount` as the interest earned, not the resulting new balance.
5. Wrap interest transaction rows, ledger rows, and account updates in a single database transaction.
6. Replace unbounded account update `Promise.all` with one transaction containing atomic updates, or use bounded/chunked processing if the account count is large.
7. Re-throw or return HTTP 500 when interest application fails.
8. Validate the bank/world account exists before using it.
9. Add a cron run record model or equivalent operational record:
   - startedAt
   - finishedAt
   - status
   - processed count
   - skipped count
   - failed count
   - total interest credited
   - error summary if any

Expected behavior after fix:
- Cron cannot run with an unset or guessed secret.
- Failed interest writes return failure and are visible to monitoring.
- Interest records accurately reflect credited interest.
- Interest updates are atomic and ledger-backed.

Validation/tests:
- API test: missing cron secret configuration fails closed.
- API test: invalid authorization returns 401.
- Integration test: interest amount equals rounded/truncated earned interest, not new balance.
- Integration test: failed update rolls back transaction records and balance changes.
- Integration test: no interest applies to non-positive balances or the bank account.
- Operational test: failed cron invocation is captured/logged and returns 500.

### Phase 3: Normalize API errors and deleted-class behavior

Affected files:
- `src/server/api/routers/account.ts`
- `src/server/api/routers/classRouter.ts`
- `src/server/api/routers/enrollment.ts`
- `src/server/api/routers/transaction.ts`
- `src/server/api/routers/user.ts`
- `src/server/api/trpc.ts`

Tasks:
1. Replace all server-side `TRPCClientError` and raw `Error` throws in routers with `TRPCError`.
2. Standardize error code mapping:
   - unauthenticated: `UNAUTHORIZED`
   - lacks class/admin permission: `FORBIDDEN`
   - missing class/account/enrollment: `NOT_FOUND`
   - invalid business input: `BAD_REQUEST`
   - unexpected external failure: `INTERNAL_SERVER_ERROR`
3. Create helper functions for repeated checks:
   - `getActiveClassByCode`
   - `requireClassAdmin`
   - `requireClassEnrollment`
   - `getEnrollmentAccountsForClass`
4. Add `deletedAt: null` consistently to active class-scoped reads.
5. Ensure enrollment deletion and admin views cannot operate on deleted classes unless explicitly intended.

Expected behavior after fix:
- Clients receive consistent tRPC errors.
- Deleted classes are inaccessible through normal account/user/transaction routes.
- Authorization checks are centralized and easier to audit.

Validation/tests:
- Test each protected route returns expected error code for unauthenticated/non-admin/missing data cases.
- Test deleted class account and transaction queries are rejected or empty.
- Test admin-only routes reject students.

### Phase 4: Add structured logging, Sentry context, and audit trail

Affected files:
- `sentry.server.config.ts`
- `sentry.client.config.ts`
- `sentry.edge.config.ts`
- `src/pages/api/cron.ts`
- `src/pages/api/trpc/[trpc].ts`
- `src/server/api/routers/*`
- `prisma/schema.prisma`
- new logging/audit helper files under `src/server/`

Tasks:
1. Move Sentry DSN to environment variables.
2. Set environment-specific Sentry sampling rather than `tracesSampleRate: 1` everywhere.
3. Add a server logger wrapper that accepts structured fields:
   - level
   - operation
   - userId
   - classId/classCode
   - accountId(s)
   - durationMs
   - status
   - error code/message
4. Add tRPC error logging/capture for production failures with sanitized context.
5. Add explicit Sentry capture around cron failures and critical financial mutation failures.
6. Add an `AuditLog` model for durable business events:
   - actorUserId
   - action
   - entityType
   - entityId
   - classId
   - metadata JSON
   - createdAt
7. Write audit records inside the same transaction for financial/admin mutations where practical.

Expected behavior after fix:
- Critical failures are visible in production with useful context.
- Financial/admin changes can be reconstructed from durable audit records.
- Logs can be filtered by operation, user, class, and status.

Validation/tests:
- Unit test logger redacts sensitive fields.
- Integration test transfer creates audit record.
- Integration test enrollment deletion creates audit record.
- Manual/automated test cron failure emits structured log/Sentry capture and HTTP 500.

### Phase 5: Add Prisma indexes and reduce N+1 queries

Affected files:
- `prisma/schema.prisma`
- `src/server/api/routers/enrollment.ts`
- `src/server/api/routers/user.ts`
- `src/server/api/routers/account.ts`
- `src/server/api/routers/transaction.ts`
- `src/pages/class/[classCode]/manage.tsx`

Tasks:
1. Replace redundant ID indexes with useful relation/query indexes:
   - `Enrollment`: `userId`, `classId`, `[classId, userId]`, `[classId, role]`
   - `Transaction`: `[fromAccountId, createdAt]`, `[toAccountId, createdAt]`
   - `CustomTransaction`: `ownerId`
2. Batch enrollment account lookups using `findMany({ where: { id: { in: ... } } })`.
3. Avoid repeated class lookups inside `cleanEnrollmentForClient`.
4. Batch or cache Clerk lookups where the SDK/product allows; otherwise isolate them behind a helper with graceful degradation.
5. Consider one admin dashboard endpoint returning enrollments, accounts, users, and recent transactions needed by `manage.tsx`.
6. Replace client repeated `.find()` joins with `useMemo` maps if enrichment remains client-side.
7. Add `enabled` guards for queries that depend on router params or selected account IDs, especially `transfer.tsx` account history.

Expected behavior after fix:
- Transaction history and class feeds remain indexed as data grows.
- Admin pages avoid duplicate DB and Clerk calls.
- Initial renders avoid requests with invalid IDs such as `NaN`.

Validation/tests:
- Query tests verify paginated transaction results still match expected ordering.
- Component/integration test verifies `transfer.tsx` does not request account history until an account ID exists.
- Performance smoke check: admin page uses fewer API calls and fewer DB queries for a class with many students.

### Phase 6: Clean build/config and establish regression tests

Affected files:
- `next.config.js`
- `next.config.mjs`
- `src/env.js`
- `package.json`
- new test files under the chosen test structure

Tasks:
1. Keep one Next config file.
2. Ensure the surviving config imports `./src/env.js`, not missing `./src/env.mjs`.
3. Decide whether generated analysis markdown files should remain in the repo; remove or move them if they are temporary artifacts.
4. Add a test framework if absent.
5. Add high-value regression tests for Phases 1–3 before or alongside implementation.
6. Add CI commands for lint, typecheck, tests, and build.

Expected behavior after fix:
- Deployment uses one unambiguous config.
- Build does not fail due to stale env import.
- Critical business logic has regression coverage.

Validation/tests:
- `npm run lint` passes.
- Typecheck passes.
- Test suite passes.
- Production build passes in an environment with dependencies installed and required environment variables supplied.

## Step 4 — Decisions and unknowns requiring user input before implementation

Implementation should pause for user input before changing code if any of these decisions are not already settled.

1. Money representation:
   - Recommended default: migrate to integer cents for balances, transactions, ledger debit/credit, and custom transaction amounts.
   - Lower-effort alternative: use Prisma `Decimal`.
   - Temporary fallback: keep `Float` but enforce input rounding and add tests.

2. Overdraft policy:
   - Recommended default: reject transfers that would make a student account negative.
   - Need user decision: should teacher/admin/bank accounts be allowed to go negative?

3. Transfer permission model:
   - Recommended default: students can transfer only from their class account to teacher/admin/bank accounts in the same active class; admins can transfer between accounts in classes where they are admin.
   - Need user decision: should student-to-student transfers be allowed?

4. Interest source account:
   - Recommended default: configure a bank/world account per class or explicitly in the database rather than hardcoding ID `1000`.
   - Need user decision: should interest be paid from a real ledger account or modeled as system-generated credit?

5. Migration tolerance:
   - Need user decision: is it acceptable to run Prisma migrations that alter money column types and add audit/cron tables?
   - If not, use a compatibility phase with validation and new indexes first.

6. Logging destination:
   - Recommended default: structured console logs plus Sentry exception capture/context, because that fits the current stack.
   - Need user decision: is an external log service required?

7. Test framework:
   - Recommended default: use the existing TypeScript/Next stack with a lightweight unit/integration test setup, then add route/router-level tests around tRPC procedures.
   - Need user decision only if there is a preferred framework.

## Step 5 — Final sequential implementation roadmap

### Phase 0: Preparation and safety harness

Acceptance criteria:
- A small set of regression tests or test cases exists for negative amount, unauthorized target, cron amount, and deleted class access.
- The chosen money, overdraft, and transfer-permission decisions are documented.

Recommended first implementation slice:
- Add tests that currently fail for `transaction.create` negative amount and unauthorized target account.
- Do not change broad schema yet unless the money representation decision is settled.

### Phase 1: Financial and authorization blockers

Tasks:
1. Validate positive finite transfer amounts.
2. Enforce same-active-class target account authorization.
3. Restrict or remove public `account.create`.
4. Move transfer account reads/checks inside `$transaction`.
5. Use atomic balance increment/decrement.
6. Replace mutation-path `TRPCClientError` with `TRPCError`.

Acceptance criteria:
- Negative/zero transfers are impossible.
- Users cannot affect accounts outside their authorized active class.
- Concurrent transfers preserve balance invariants.
- Public arbitrary-balance account creation is impossible.

### Phase 2: Cron correctness and reliability

Tasks:
1. Require and fail closed on `CRON_SECRET`.
2. Reuse shared `db` client.
3. Store interest amount correctly.
4. Make interest writes atomic and ledger-backed.
5. Return 500 and capture/log on failure.
6. Add cron run history if migration is allowed.

Acceptance criteria:
- Interest transaction amount equals interest earned.
- Partial cron writes roll back.
- Failed cron runs are visible and do not return success.

### Phase 3: Error and deleted-class consistency

Tasks:
1. Standardize router errors on `TRPCError`.
2. Centralize active-class/admin/enrollment helper checks.
3. Add `deletedAt: null` consistently to class-scoped reads.

Acceptance criteria:
- Normal routes cannot access deleted classes.
- Clients receive consistent tRPC error codes.
- Authorization checks are easier to inspect and test.

### Phase 4: Observability and audit trail

Tasks:
1. Move Sentry DSN/sampling to env-driven config.
2. Add structured logger wrapper.
3. Capture critical API/cron exceptions with context.
4. Add durable audit records for transfers, enrollment deletion, class deletion, and cron interest.

Acceptance criteria:
- Critical failures include operation and entity context.
- Financial/admin actions have durable audit evidence.
- Sentry configuration is environment-specific and not hardcoded.

### Phase 5: Performance improvements

Tasks:
1. Add Prisma indexes for transaction/enrollment/custom transaction query paths.
2. Batch enrollment/account lookups.
3. Reduce duplicate Clerk calls.
4. Consolidate admin dashboard data or memoize client joins.
5. Add query `enabled` guards for router-param/account-dependent queries.

Acceptance criteria:
- Hot transaction and enrollment queries use appropriate indexes.
- Admin page avoids duplicate class-wide fetches and N+1 database patterns.
- Transfer page does not request account history with invalid account IDs.

### Phase 6: Build/config and CI quality gates

Tasks:
1. Remove duplicate/stale Next config.
2. Fix missing env import path.
3. Add or formalize lint/typecheck/test/build scripts.
4. Ensure generated analysis artifacts are either intentionally tracked or removed.

Acceptance criteria:
- One clear Next config is used.
- Lint, typecheck, tests, and build are documented and pass in a properly provisioned environment.

## Recommended first implementation slice

Start with Phase 1 only:
1. Add failing tests for negative amount and unauthorized target account.
2. Implement positive amount validation.
3. Enforce same-active-class transfer authorization.
4. Use atomic balance updates inside the transaction.
5. Restrict/remove public arbitrary account creation.

This slice has the highest risk reduction because it directly prevents balance corruption and unauthorized movement of funds. It can be done before broader observability/performance work, and its tests become the safety net for later schema and logging changes.
