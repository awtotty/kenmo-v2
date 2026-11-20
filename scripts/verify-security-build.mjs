import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const routes = JSON.parse(readFileSync(".next/routes-manifest.json", "utf8"));
assert.equal(routes.appType, "pages");
assert.deepEqual(routes.i18n.locales, ["en"]);
assert.equal(routes.i18n.defaultLocale, "en");
const rewrites = Array.isArray(routes.rewrites) ? routes.rewrites : Object.values(routes.rewrites).flat();
assert(rewrites.some((rewrite) =>
  new RegExp(rewrite.regex).test("/en/monitoring") &&
  rewrite.destination.replace(":nextInternalLocale", "en") === "/en/api/monitoring",
));
assert(!rewrites.some((rewrite) => rewrite.destination.includes("/sentry-tunnel")), "no broad SDK-generated tunnel rewrite");
assert(!existsSync("src/app/sentry-tunnel") && !existsSync("app/sentry-tunnel"), "SDK must not generate an App Router tunnel");

const functions = JSON.parse(readFileSync(".next/server/functions-config-manifest.json", "utf8"));
const proxy = functions.functions["/_middleware"];
assert.equal(proxy.runtime, "nodejs");
// Next internally adds the default locale before matching an unprefixed request.
for (const path of ["/en/monitoring", "/en/api/monitoring", "/en/api/trpc/user.getCurrentUser", "/en/api/cron"]) {
  assert(proxy.matchers.some((matcher) => new RegExp(matcher.regexp).test(path)), `${path} must traverse Clerk proxy`);
}
const pages = JSON.parse(readFileSync(".next/server/pages-manifest.json", "utf8"));
assert(pages["/api/monitoring"], "authenticated tunnel must be a Pages API route");

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
console.log("PASS built Pages/i18n routes, protected Node proxy/tunnel rewrite, and hidden/deleted public source maps");
