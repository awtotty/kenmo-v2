import assert from "node:assert/strict";
import { resolveHTTPResponse } from "@trpc/server/http";
import superjson from "superjson";
import { appRouter } from "../src/server/api/root";
import { type createTRPCContext } from "../src/server/api/trpc";

type Context = ReturnType<typeof createTRPCContext>;
const db = new Proxy({}, {
  get() { throw new Error("Invalid or unauthenticated input must never reach the database"); },
});

async function request(input: unknown, signedIn = true, rawBody?: string) {
  const response = await resolveHTTPResponse({
    router: appRouter,
    path: "transaction.create",
    req: {
      method: "POST",
      query: new URLSearchParams(),
      headers: { "content-type": "application/json" },
      body: rawBody ?? JSON.stringify(superjson.serialize(input)),
    },
    createContext: async () => ({ auth: signedIn ? { userId: "test-user" } : null, db }) as Context,
  });
  const body = JSON.parse(response.body ?? "null") as { error: { json: { data: { code: string; zodError: { fieldErrors: Record<string, string[]>; formErrors: string[] } | null } } } };
  return { status: response.status, data: body.error.json.data };
}

const valid = { fromAccountId: 101, toAccountId: 201, amount: 1 };
for (const input of [
  { ...valid, fromAccountId: "101" },
  { ...valid, fromAccountId: 1.5 },
  { ...valid, toAccountId: -1 },
  { ...valid, amount: "1" },
  { ...valid, amount: Number.NaN },
  { ...valid, amount: Number.POSITIVE_INFINITY },
  { ...valid, amount: Number.NEGATIVE_INFINITY },
  { ...valid, amount: 0.001 },
  { ...valid, note: { unexpected: true } },
]) {
  const result = await request(input);
  assert.equal(result.status, 400);
  assert.equal(result.data.code, "BAD_REQUEST");
  assert(result.data.zodError);
  assert(Object.keys(result.data.zodError.fieldErrors).length > 0, "Zod4 field errors survive the tRPC10/SuperJSON wire format");
}

const invalidRoot = await request(null);
assert.equal(invalidRoot.status, 400);
assert(invalidRoot.data.zodError?.formErrors.length);

const sameAccount = await request({ ...valid, toAccountId: valid.fromAccountId });
assert.equal(sameAccount.data.code, "BAD_REQUEST");
assert.equal(sameAccount.data.zodError, null, "domain errors must not be mislabeled as schema errors");

const anonymous = await request(valid, false);
assert.equal(anonymous.status, 401);
assert.equal(anonymous.data.code, "UNAUTHORIZED");
assert.equal(anonymous.data.zodError, null);

const malformedJson = await request(null, true, "{malformed");
assert.equal(malformedJson.status, 400);
assert.equal(malformedJson.data.code, "PARSE_ERROR");
assert.equal(malformedJson.data.zodError, null);
console.log("PASS Zod4/tRPC10 HTTP validation, flattened errors, malformed JSON, and authentication fail closed without database access");
