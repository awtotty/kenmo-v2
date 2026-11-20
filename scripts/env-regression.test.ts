import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function loadEnv(overrides: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { env } from './src/env.js';
    console.log(JSON.stringify({ audit: env.AUDIT_LOG_ENABLED, trace: env.SENTRY_TRACES_SAMPLE_RATE, replay: env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE, cron: env.CRON_SECRET }));
  `], {
    cwd: process.cwd(),
    // Intentionally do not inherit deployment secrets or SKIP_ENV_VALIDATION.
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://example.invalid/test",
      ...overrides,
    },
    encoding: "utf8",
  });
}

const defaults = loadEnv();
assert.equal(defaults.status, 0, defaults.stderr);
assert.deepEqual(JSON.parse(defaults.stdout), { audit: "false", trace: 0, replay: 1 });

const configured = loadEnv({ SENTRY_TRACES_SAMPLE_RATE: "0.25", CRON_SECRET: "test-only-secret" });
assert.equal(configured.status, 0, configured.stderr);
assert.deepEqual(JSON.parse(configured.stdout), { audit: "false", trace: 0.25, replay: 1, cron: "test-only-secret" });

for (const invalid of [
  { DATABASE_URL: "" },
  { DATABASE_URL: "not-a-url" },
  { NEXT_PUBLIC_SENTRY_DSN: "not-a-url" },
  { SENTRY_TRACES_SAMPLE_RATE: "NaN" },
  { SENTRY_TRACES_SAMPLE_RATE: "1.1" },
  { NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: "-0.1" },
  { AUDIT_LOG_ENABLED: "yes" },
]) {
  assert.notEqual(loadEnv(invalid).status, 0, `Invalid env must be rejected: ${Object.keys(invalid).join(", ")}`);
}
console.log("PASS env-nextjs/Zod4 defaults, sampling validation, and disabled audit logging without deployment secrets");
