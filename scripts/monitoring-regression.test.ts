import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { type AddressInfo } from "node:net";
import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { config, createMonitoringHandler } from "../src/pages/api/monitoring";

const dsn = "https://public@o0.ingest.sentry.io/1";
process.env.NEXT_PUBLIC_SENTRY_DSN = dsn;
process.env.SENTRY_TRACES_SAMPLE_RATE = "0";
await import("../sentry.server.config");
assert(Sentry.getClient()?.getIntegrationByName("ServeTunnel"));
assert.equal(config.api.bodyParser, false);

const forwarded: { url: string; headers: Headers; body: string }[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  forwarded.push({
    url: String(url),
    headers: new Headers(options?.headers),
    body: await new Response(options?.body).text(),
  });
  return new Response("{}", {
    status: 200,
    headers: { "content-type": "application/json", "x-sentry-rate-limits": "60:error:organization", "set-cookie": "must-not-reach-client=1" },
  });
};

let authChecks = 0;
const handler = createMonitoringHandler({
  getAuthFn(req) {
    authChecks++;
    if (req.headers["x-test-auth"] === "broken") throw new Error("Missing Clerk metadata");
    return { userId: req.headers["x-test-auth"] === "yes" ? "test-user" : null };
  },
});
const server = createServer((req, res) => {
  const response = Object.assign(res, {
    status(code: number) { res.statusCode = code; return res; },
  });
  void handler(req as NextApiRequest, response as NextApiResponse);
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as AddressInfo).port;

function envelope(destination = dsn) {
  return `${JSON.stringify({ dsn: destination })}\n{"type":"event"}\n{"message":"test"}\n`;
}
function send({ path = "/monitoring", method = "POST", auth = "yes", contentType = "application/x-sentry-envelope", body = envelope(), length = true } = {}) {
  return new Promise<{ status: number; headers: Record<string, unknown>; body: string }>((resolve, reject) => {
    const request = httpRequest({ hostname: "127.0.0.1", port, path, method, headers: {
      "x-test-auth": auth,
      "content-type": contentType,
      ...(length ? { "content-length": Buffer.byteLength(body) } : { "transfer-encoding": "chunked" }),
      authorization: "Bearer test-only-not-for-forwarding",
      cookie: "test-only-cookie=private",
    } }, (response) => {
      let result = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => { result += chunk; });
      response.on("end", () => resolve({ status: response.statusCode ?? 0, headers: response.headers, body: result }));
    });
    request.on("error", reject);
    request.end(body);
  });
}

try {
  for (const path of ["/monitoring", "/api/monitoring", "/en/monitoring", "/en/api/monitoring"]) {
    const before = authChecks;
    assert.equal((await send({ path, auth: "no" })).status, 401);
    assert.equal(authChecks, before + 1, "SDK must not intercept before the app's auth check");
  }
  assert.equal((await send({ auth: "broken" })).status, 401);
  const wrongMethod = await send({ method: "GET", body: "" });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.allow, "POST");
  assert.equal((await send({ contentType: "application/json" })).status, 415);
  assert.equal((await send({ body: "not-json\n" })).status, 400);
  assert.equal((await send({ body: "{}\n" })).status, 400);
  assert.equal((await send({ length: false })).status, 411);
  for (const forbidden of ["https://public@attacker.invalid/1", "https://public@o0.ingest.sentry.io/2", "http://public@127.0.0.1/1"]) {
    assert.equal((await send({ body: envelope(forbidden) })).status, 403);
  }
  assert.equal(forwarded.length, 0, "rejected envelopes must not trigger any upstream fetch");

  for (const contentType of ["application/x-sentry-envelope", "text/plain;charset=UTF-8"]) {
    const response = await send({ contentType });
    assert.equal(response.status, 200);
    assert.equal(response.body, "{}");
    assert.equal(response.headers["x-sentry-rate-limits"], "60:error:organization");
    assert.equal(response.headers["set-cookie"], undefined);
  }
  assert.equal(forwarded.length, 2);
  for (const request of forwarded) {
    const destination = new URL(request.url);
    assert.equal(destination.protocol, "https:");
    assert.equal(destination.host, "o0.ingest.sentry.io");
    assert.equal(destination.pathname, "/api/1/envelope/");
    assert.equal(request.body, envelope());
    assert.equal(request.headers.get("cookie"), null);
    assert.equal(request.headers.get("authorization"), null);
  }
  console.log("PASS Sentry tunnel auth/interception, methods, envelope/DSN rejection, destination allowlist, and credential-header privacy");
} finally {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await Sentry.close(0);
}
