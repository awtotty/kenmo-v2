# Kenmo Stabilization Readiness Assessment

## Status

Phases 1–6 from `stabilization-roadmap.md` have been implemented and audited as scoped stabilization slices. The codebase is substantially safer and more operable, but production deployment should wait until planned downtime because Prisma migrations are intentionally present but not applied.

This is a readiness assessment, not a claim that every roadmap recommendation was implemented. A few roadmap-backed items were intentionally deferred or left as operational blockers and are called out below.

## Validation evidence

Last readiness validation run:

```bash
npm run quality
npm run verify:phase6
```

Result: all passed. `npm run quality` includes aggregate phase verification, typecheck, and lint. Lint still reports only pre-existing warnings in `src/pages/class/[classCode]/transfer.tsx` for unused local state variables: `enrollment`, `fromItems`, and `toItems`.

A production build was attempted with placeholder Clerk env values. It reached compilation/static generation, then failed because Clerk rejected the dummy publishable key. This is an environment-credential blocker, not currently evidence of a code/config failure.

## Roadmap coverage summary

### Phase 1 — Financial correctness and authorization

Implemented safeguards:
- Positive finite cent-rounded transfer amounts.
- Same-account transfer rejection.
- Same-active-class transfer authorization.
- Non-admins can only transfer from their own account.
- Students can only transfer to teacher/admin/bank accounts.
- Admins can transfer within their class.
- Atomic balance increment/decrement updates.
- Ledger rows and transaction row written in one transaction.
- Direct arbitrary account creation blocked.

Validation: `npm run verify:phase1`.

Remaining/deferred from roadmap:
- Long-term money representation is still `Float`; integer cents or Decimal migration remains deferred.

### Phase 2 — Cron correctness and security

Implemented safeguards:
- `/api/cron` fails closed when `CRON_SECRET` is missing.
- Invalid cron authorization returns 401.
- Interest transaction amount is earned interest, not resulting balance.
- Cron uses shared Prisma client.
- Transaction, ledger, and balance updates are atomic.
- Failures return HTTP 500 instead of false success.

Validation: `npm run verify:phase2`.

Roadmap-backed gaps / deployment risks:
- `src/pages/api/cron.ts` still uses hardcoded `WORLD_BANK_ACCOUNT_ID = 1000`.
- The cron job does **not** validate that the world/bank account exists before creating transaction/ledger rows.
- No cron run history table/model was added. Phase 4 added a gated general `AuditLog`, but dedicated cron run history with last-success/duration/counts was deferred.

Deployment implication: before relying on interest cron in production, verify account `1000` exists and is the intended bank/source account, or implement the deferred configured/system account model.

### Phase 3 — API errors and deleted classes

Implemented safeguards:
- Server routers no longer use server-side `TRPCClientError` or raw `throw new Error` for normal API failure paths.
- Touched routes use explicit `TRPCError` codes.
- Normal class-scoped reads reject/ignore soft-deleted classes.
- Enrollment deletion rejects deleted-class enrollment.

Validation: `npm run verify:phase3`.

### Phase 4 — Observability and gated audit trail

Implemented safeguards:
- Sentry DSN and sampling are environment-driven.
- Structured server logger added with top-level sensitive key redaction.
- Critical paths capture unexpected exceptions with operation context.
- `AuditLog` Prisma model and migration SQL added.
- Audit writes added for transfers, cron interest, enrollment deletion, and class deletion.
- Audit writes are gated behind `AUDIT_LOG_ENABLED=false` by default so current production does not require the unapplied migration.

Validation: `npm run verify:phase4`.

Remaining/deferred from roadmap:
- Audit durability is inactive until migration deployment and `AUDIT_LOG_ENABLED=true`.
- Dedicated audit viewing/admin tooling was not added.
- Dedicated cron run history remains deferred.

### Phase 5 — Performance/indexes and query guards

Implemented improvements:
- Added index migration for hot enrollment, transaction, and custom transaction paths.
- Batched enrollment class/account lookup context.
- Memoized admin transaction feed joins with maps.
- Added query `enabled` guards for class-code and selected-account dependent queries.

Validation: `npm run verify:phase5`.

Remaining/deferred from roadmap:
- A consolidated admin dashboard endpoint was not added; client-side dedupe/memoization was used instead.
- Clerk user lookups are still external per user; deeper Clerk caching/batching remains a possible later improvement.

### Phase 6 — Build/config and quality gates

Implemented improvements:
- Removed duplicate `next.config.mjs`.
- Kept one `next.config.js` importing `./src/env.js`.
- Preserved Sentry, i18n, and Clerk image config.
- Added aggregate validation scripts: `verify`, `typecheck`, and `quality`.
- `.env.example` references `src/env.js`.

Validation: `npm run verify:phase6`.

## Unapplied Prisma migrations

These migration files exist and should be applied during planned downtime, not during active classroom use:

1. `prisma/migrations/20260526184000_add_audit_log/migration.sql`
   - Creates `AuditLog` table.
   - Adds indexes for actor, action, entity, class, and created timestamp.

2. `prisma/migrations/20260527020000_add_phase5_indexes/migration.sql`
   - Drops redundant `Enrollment_id_idx` if present.
   - Adds enrollment lookup indexes.
   - Adds transaction feed/history indexes.
   - Adds custom transaction owner index.

## Deployment/migration checklist

Before deployment:

1. Ensure the deployment environment has required real values:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CRON_SECRET`
   - Sentry values if Sentry should receive events/source maps:
     - `NEXT_PUBLIC_SENTRY_DSN`
     - `SENTRY_AUTH_TOKEN`
     - `SENTRY_TRACES_SAMPLE_RATE`
     - `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`
     - `SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
     - `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE`
     - `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`
     - `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE`

2. Keep `AUDIT_LOG_ENABLED=false` until after the AuditLog migration has been applied successfully.

3. Before enabling interest cron, verify the current production database has account ID `1000` and that it is the intended world/bank account.

4. During downtime, apply migrations using the deployment process, for example:

```bash
npx prisma migrate deploy
```

5. After migrations are applied and verified, set:

```bash
AUDIT_LOG_ENABLED=true
```

6. Run post-deploy smoke checks:
   - Log in with Clerk.
   - Load home/classes.
   - Student transfer to teacher/admin account.
   - Admin manage page and recent transaction feed.
   - Cron endpoint with invalid auth returns 401.
   - Cron endpoint with valid auth succeeds in a controlled/test account scenario.
   - If audit logging is enabled, verify new rows appear in `AuditLog` for transfer/admin/cron actions.

## Current operational blockers

Deploy-blocking before production release:
- Real Clerk credentials are required for production build/static generation.
- Prisma migrations must be applied during planned downtime before enabling `AUDIT_LOG_ENABLED=true`.
- Production env vars need to be configured.
- Before enabling/running interest cron, production must have a valid world/bank account at ID `1000`, or the hardcoded bank model must be replaced.

Not deploy-blocking if accepted:
- Lint warnings in `src/pages/class/[classCode]/transfer.tsx` for pre-existing unused state variables.
- Prisma `relationMode = "prisma"` validation warnings about relation indexes; Phase 5 added the important hot-path indexes, but Prisma still warns generally.
- Audit logging remains inactive until explicitly enabled.
- Dedicated cron run history is not present; general audit logging covers cron interest only after audit migration and `AUDIT_LOG_ENABLED=true`.

## Deferred follow-up work

Recommended later work:
- Long-term money representation migration from `Float` to integer cents or `Decimal`.
- Replace hardcoded `WORLD_BANK_ACCOUNT_ID = 1000` with a configured/system account model and validate the source account before cron writes.
- Add dedicated cron run history if operational requirements need last-success, duration, processed/skipped/failed counts, or alerting beyond Sentry/audit logging.
- Add real integration tests against a test database instead of mostly script-level/router mock tests.
- Consider an admin dashboard endpoint to further reduce duplicated page data fetches.
- Add deeper audit-log viewer/admin tooling if teachers need to inspect audit history.
- Clean up pre-existing unused state in `transfer.tsx`.
- Consider formal CI configuration that runs `npm run quality` and build with real CI env values.

## Readiness conclusion

The codebase is ready for staging validation now. Production deployment should wait until downtime, when the two Prisma migrations can be applied safely and real deployment environment variables can be configured. Keep `AUDIT_LOG_ENABLED=false` until after migrations are deployed. Treat the hardcoded world/bank account as a deployment prerequisite for cron interest until that model is replaced.
