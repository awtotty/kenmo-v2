import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const routes = JSON.parse(readFileSync(".next/routes-manifest.json", "utf8"));
assert.equal(routes.appType, "pages");
assert.equal(routes.i18n, undefined, "English-only app must not reintroduce locale-prefixed API routing");
assert(routes.redirects.some((redirect) =>
  new RegExp(redirect.regex).test("/en/class/ABC") && redirect.destination === "/:path*" && redirect.statusCode === 308,
), "old English-prefixed bookmarks must redirect to canonical protected routes");
const rewrites = Array.isArray(routes.rewrites) ? routes.rewrites : Object.values(routes.rewrites).flat();
assert(rewrites.some((rewrite) =>
  new RegExp(rewrite.regex).test("/monitoring") &&
  rewrite.destination === "/api/monitoring",
));
assert(!rewrites.some((rewrite) => rewrite.destination.includes("/sentry-tunnel")), "no broad SDK-generated tunnel rewrite");
assert(!existsSync("src/app/sentry-tunnel") && !existsSync("app/sentry-tunnel"), "SDK must not generate an App Router tunnel");

const functions = JSON.parse(readFileSync(".next/server/functions-config-manifest.json", "utf8"));
const proxy = functions.functions["/_middleware"];
assert.equal(proxy.runtime, "nodejs");
for (const path of ["/monitoring", "/api/monitoring", "/api/trpc/user.getCurrentUser", "/api/trpc/enrollment.getAllCurrentUser", "/api/cron"]) {
  assert(proxy.matchers.some((matcher) => new RegExp(matcher.regexp).test(path)), `${path} must traverse Clerk proxy`);
}
const pages = JSON.parse(readFileSync(".next/server/pages-manifest.json", "utf8"));
assert(pages["/api/monitoring"], "authenticated tunnel must be a Pages API route");
assert(pages["/api/trpc/[trpc]"], "dynamic tRPC handler must be emitted as a Pages API route");

function* files(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}
let javascriptFiles = 0;
for (const file of files(".next/static")) {
  assert(!file.endsWith(".map"), `public source map leaked: ${file}`);
  if (file.endsWith(".js")) {
    javascriptFiles++;
    assert(!/(?:^|\n)\/\/[#@]\s*sourceMappingURL\s*=/.test(readFileSync(file, "utf8")), `public source map link leaked: ${file}`);
  }
}
assert(javascriptFiles > 0);
console.log("PASS nonlocalized Pages/tRPC routes, legacy bookmark redirects, protected Node proxy/tunnel rewrite, and hidden/deleted public source maps");
