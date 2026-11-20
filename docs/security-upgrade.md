# Security dependency upgrade notes

## Compatible refresh

All four tRPC v10 packages are aligned on `^10.45.4`. The lockfile also refreshes compatible transitive patches. React Query v4 is retained.

## Validation stack

Zod 4.6.7 and env-nextjs 0.13.11 work with tRPC 10.45.4 without a tRPC or React Query major upgrade. The error formatter uses Zod 4's `flattenError` while preserving the client `zodError.fieldErrors`/`formErrors` shape. HTTP-level regression tests cover malformed JSON, invalid account IDs/amounts (including SuperJSON NaN/Infinity), domain errors, and anonymous calls without any database access. Environment tests run with an isolated non-secret environment and validation enabled, covering defaults, numeric coercion/ranges, invalid URLs, and audit logging disabled by default.

## Framework, identity, and coupled monitoring migration

Next 16.4.6 and Clerk 7.10.6 support the existing Pages Router and React 18.3.1. React 18 is deprecated in Next 16 but remains supported; tRPC v10/React Query v4 peers require React 18, so this patch does not introduce an unnecessary data-client migration.

Sentry 7 only peers with Next <=14. Sentry 11.16.0 and its required initialization/config migration therefore accompany the framework upgrade, rather than leaving an un-installable intermediate branch. No forced or legacy peer resolution is used. The framework branch includes the authenticated tunnel implementation and regression/build checks in the same commit as the SDK upgrade; there is no separate Sentry branch or intermediate framework commit using the unsafe string `tunnelRoute` option.

- `src/proxy.ts` replaces the deprecated middleware convention using Next 16's Node runtime. Clerk protection remains opt-out for **only** `/api/cron`; the cron handler still checks its bearer secret. API/tRPC, webhook, and monitoring paths remain protected. tRPC also retains its own authenticated procedure checks and class/account authorization.
- Clerk's server client is now asynchronous, `getAuth` remains the Pages Router context API, and sign-out redirection is configured on the provider.
- Sentry uses server/edge registration in `src/instrumentation.ts` and browser initialization in `src/instrumentation-client.ts`. Sampling, replay privacy masking, logger redaction, and the authenticated `/monitoring` tunnel are preserved. Source maps are hidden by the SDK's webpack configuration and deleted after upload (also checked against the generated public artifacts).
- Production builds explicitly use webpack to retain Sentry's automatic Vercel monitors and API/server build-time instrumentation. Turbopack is not the validated production path.
- ESLint runs directly using flat configuration because Next 16 removed `next lint`. The typed recommended/stylistic checks remain. Only the newly introduced React Compiler `react-hooks/set-state-in-effect` diagnostic is deferred (React 18, compiler not enabled); the pre-upgrade `rules-of-hooks` and `exhaustive-deps` checks remain enabled. Existing unused-state/catch-binding warnings are not suppressed.

## Authenticated monitoring tunnel

Sentry 11's deprecated string `tunnelRoute` no longer means only a Next rewrite: installed SDK code (`config/withSentryConfig/tunnel.js`, `server/index.js`) enables interception ahead of the application locally and generates an App Router handler plus a broad envelope-content-type rewrite on Vercel. Retaining that configuration would bypass the existing Clerk boundary and introduce App Router files into a Pages/i18n app.

The final configuration explicitly sets `tunnelRoute: false` (omitting it alone does **not** stop Vercel handler generation in this SDK). Browser events use `/monitoring`, a narrow Next rewrite to `/api/monitoring`. The server enables `serveTunnelIntegration({ path: "/monitoring", intercept: false })`, so requests always reach the app. The Pages API handler repeats Clerk `getAuth` checking, accepts POST envelopes only, keeps the unparsed stream, and delegates forwarding to the SDK's verified Node `handleTunnelRequest(req, res, { allowedDsns: [] })` contract. The active server DSN is the only allowed destination; cookies and authorization headers are not forwarded. Direct API and locale aliases remain protected. No envelope bodies are logged.

Regression tests run a local HTTP server with the real server SDK initialization and mocked Clerk identity/upstream fetch, proving that interception cannot skip handler authentication, unauthorized/wrong-method/malformed/unallowlisted requests cannot forward, and valid envelopes preserve payload and rate-limit responses but not credential/cookie headers. Build-artifact checks validate locale-aware rewrites, Node proxy matchers, Pages-only output, absence of generated App Router tunnel, and no public source maps. A Vercel-mode build (`VERCEL=1 VERCEL_ENV=preview`) passes these checks without deployment secrets. Live Clerk browser cookies and Sentry delivery still need staging smoke checks; the tunnel has not been made public.

Validation: clean `npm ci`, `SKIP_ENV_VALIDATION=1 AUDIT_LOG_ENABLED=false npm run quality`, and `SKIP_ENV_VALIDATION=1 AUDIT_LOG_ENABLED=false npm run build` pass. Builds need no credentials in this environment; this does **not** prove live Clerk login, database access, Sentry delivery, or authenticated source-map upload. No environment files or migrations are changed. Clerk currently warns that `createRouteMatcher` is deprecated; moving resource-level page protection is a separate architectural task, while protected tRPC procedures already enforce authentication independently.
