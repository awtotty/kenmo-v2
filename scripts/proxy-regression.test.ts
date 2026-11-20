import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { type ClerkMiddlewareAuth } from "@clerk/nextjs/server";
import { config, protectRoutes } from "../src/proxy";

let protectCalls = 0;
const denied = new Error("Unauthenticated");
const signedOutAuth = {
  protect: async () => {
    protectCalls++;
    throw denied;
  },
} as unknown as ClerkMiddlewareAuth;

for (const path of ["/", "/class/ABC/manage", "/api/trpc/user.getCurrentUser", "/api/webhooks/clerk", "/monitoring", "/api/cron/extra", "/api/cron.json"]) {
  const request = new NextRequest(`https://example.test${path}`);
  assert(config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path)), `${path} must pass middleware`);
  await assert.rejects(protectRoutes(signedOutAuth, request), (error) => error === denied);
}
assert.equal(protectCalls, 7);

for (const path of ["/api/cron", "/api/cron?scheduled=true"]) {
  await protectRoutes(signedOutAuth, new NextRequest(`https://example.test${path}`));
}
assert.equal(protectCalls, 7, "only the exact cron route bypasses Clerk (handler still checks its secret)");

for (const path of ["/monitoring", "/api/monitoring", "/en/monitoring", "/en/api/monitoring"]) {
  const request = new NextRequest(`https://example.test${path}`, {
    nextConfig: { i18n: { locales: ["en"], defaultLocale: "en" } },
  });
  await assert.rejects(protectRoutes(signedOutAuth, request), (error) => error === denied);
}

let authenticatedCalls = 0;
const signedInAuth = {
  protect: async () => { authenticatedCalls++; },
} as unknown as ClerkMiddlewareAuth;
await protectRoutes(signedInAuth, new NextRequest("https://example.test/class/ABC"));
assert.equal(authenticatedCalls, 1);
console.log("PASS Clerk proxy delegates protected routes, fails closed, and only exempts cron");
