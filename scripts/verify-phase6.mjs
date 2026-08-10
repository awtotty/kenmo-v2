import { existsSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const nextConfig = readFileSync("next.config.js", "utf8");
const envExample = readFileSync(".env.example", "utf8");

const checks = [
  {
    name: "uses a single Next config file",
    pass: existsSync("next.config.js") && !existsSync("next.config.mjs"),
  },
  {
    name: "Next config imports the real env module, not stale env.mjs",
    pass: nextConfig.includes('await import("./src/env.js")') && !nextConfig.includes("env.mjs"),
  },
  {
    name: ".env.example references the real env schema path, not stale env.mjs",
    pass: envExample.includes("/src/env.js") && !envExample.includes("env.mjs"),
  },
  {
    name: "Next config preserves Sentry and image/deployment-relevant options",
    pass:
      nextConfig.includes("withSentryConfig") &&
      nextConfig.includes('tunnelRoute: "/monitoring"') &&
      nextConfig.includes("automaticVercelMonitors: true") &&
      nextConfig.includes('hostname: "img.clerk.com"'),
  },
  {
    name: "package scripts expose lint, typecheck, build, verify, quality",
    pass: ["lint", "typecheck", "build", "verify", "quality"].every((script) => packageJson.scripts?.[script]),
  },
  {
    name: "aggregate verify runs all phase verifiers",
    pass: ["verify:phase1", "verify:phase2", "verify:phase3", "verify:phase4", "verify:phase5"].every((script) =>
      packageJson.scripts.verify.includes(`npm run ${script}`),
    ),
  },
  {
    name: "quality gate runs verify, typecheck, and lint",
    pass:
      packageJson.scripts.quality.includes("npm run verify") &&
      packageJson.scripts.quality.includes("npm run typecheck") &&
      packageJson.scripts.quality.includes("npm run lint"),
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
  console.error(`${failed} Phase 6 verification check(s) failed.`);
  process.exit(1);
}

console.log("All Phase 6 verification checks passed.");
