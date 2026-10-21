import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function withdrawnRequest(path = "/customer-security-review", method = "GET") {
  return new NextRequest(`https://witnessops.com${path}`, { method });
}

test("a thrown withdrawn-shell fetch stays a private 410", async () => {
  globalThis.fetch = async () => {
    throw new Error("shell down");
  };
  const response = await middleware(withdrawnRequest());
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /This offer has been withdrawn/);
  assert.doesNotMatch(body, /shell down/);
});

test("a timed-out withdrawn-shell fetch stays a private 410", async () => {
  globalThis.fetch = async () => {
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  };
  const response = await middleware(withdrawnRequest("/catalog/offsec-local-audit"));
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /This offer has been withdrawn/);
});

test("a non-OK withdrawn shell is not cached as the 410 body", async () => {
  globalThis.fetch = async () => new Response("upstream failed", { status: 500 });
  const response = await middleware(withdrawnRequest());
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /This offer has been withdrawn/);
  assert.doesNotMatch(body, /upstream failed/);
});

test("an OK withdrawn shell is still served as 410", async () => {
  let requested = "";
  globalThis.fetch = async (input) => {
    requested = String(input);
    return new Response("<html>shell ok</html>", {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
  const response = await middleware(withdrawnRequest("/pl/catalog/offsec-local-audit"));
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.match(requested, /\/pl\/withdrawn-offer/);
  assert.match(await response.text(), /shell ok/);
});

test("HEAD on a withdrawn offer is a 410 and does not fetch the shell", async () => {
  let fetched = false;
  globalThis.fetch = async () => {
    fetched = true;
    return new Response("should not be used", { status: 200 });
  };
  const response = await middleware(withdrawnRequest("/catalog/workflows", "HEAD"));
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "public, max-age=3600");
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.equal(await response.text(), "");
  assert.equal(fetched, false);
});
