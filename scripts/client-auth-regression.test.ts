import assert from "node:assert/strict";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { type AppRouter } from "../src/server/api/root";
import { browserClerkSessionHeaders, clerkSessionHeaders } from "../src/utils/clerkSessionHeaders";

assert.deepEqual(await browserClerkSessionHeaders(), {}, "SSR must never use a browser session");

assert.deepEqual(await clerkSessionHeaders(null), {});
assert.deepEqual(await clerkSessionHeaders({ getToken: async () => null }), {});
let token = "test-session-one";
let tokenCalls = 0;
let fetchCalls = 0;
const authorization: (string | null)[] = [];
const session = { getToken: async () => { tokenCalls++; return token; } };
Object.defineProperty(globalThis, "window", { value: { Clerk: { session } }, configurable: true });
const client = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [httpBatchLink({
    url: "https://example.test/api/trpc",
    headers: browserClerkSessionHeaders,
    fetch: async (_url, options) => {
      fetchCalls++;
      authorization.push(new Headers(options?.headers).get("authorization"));
      return new Response(JSON.stringify([{ result: { data: superjson.serialize([]) } }]), {
        headers: { "content-type": "application/json" },
      });
    },
  })],
});
await client.enrollment.getAllCurrentUser.query();
token = "test-session-two";
await client.enrollment.getAllCurrentUser.query();
assert.deepEqual(authorization, ["Bearer test-session-one", "Bearer test-session-two"]);
assert.equal(tokenCalls, 2, "each batch must obtain the current session token");
assert.equal(fetchCalls, 2);
Reflect.deleteProperty(globalThis, "window");
await assert.rejects(clerkSessionHeaders({ getToken: async () => { throw new Error("token unavailable"); } }), /token unavailable/);
console.log("PASS tRPC batches send fresh Clerk bearer tokens without storing tokens or requiring cookies");
