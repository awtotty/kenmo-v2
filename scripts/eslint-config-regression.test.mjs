import assert from "node:assert/strict";
import { ESLint } from "eslint";

const eslint = new ESLint();
const config = await eslint.calculateConfigForFile("src/proxy.ts");
assert.equal(config.rules["react-hooks/rules-of-hooks"][0], 2);
assert(config.rules["react-hooks/exhaustive-deps"][0] >= 1);
assert.equal(config.rules["@typescript-eslint/no-floating-promises"][0], 2);
assert.equal(config.rules["@typescript-eslint/no-unsafe-assignment"][0], 2);
assert.equal(config.rules["@next/next/no-html-link-for-pages"][0], 2);
assert.equal(config.rules["react-hooks/set-state-in-effect"][0], 0, "only the approved new React Compiler diagnostic is deferred");
assert(await eslint.isPathIgnored("src/utils/clerkUtils/legacy.cjs"));
console.log("PASS migrated ESLint retains Hooks, typed safety, and Next core-web-vitals checks");
