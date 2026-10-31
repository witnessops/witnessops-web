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

test("retired samples select the sample shell in EN and PL without changing the 410 response", async () => {
  for (const [path, shellPath] of [
    ["/review/sample-cases/sbom-cisa-2026-minimum-elements", "/review/withdrawn-sample"],
    ["/PL/REVIEW/SAMPLE-CASES/ACCESS-REMOVED-PROOF", "/pl/review/withdrawn-sample"],
  ]) {
    let requested = "";
    globalThis.fetch = async (input) => {
      requested = String(input);
      return new Response("<html>sample shell</html>", { status: 200 });
    };
    const response = await middleware(withdrawnRequest(path));
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.equal(new URL(requested).pathname, shellPath);
    assert.match(await response.text(), /sample shell/);
  }
});

test("failed sample-shell fetches keep a localized sample retirement fallback with no-store", async () => {
  for (const polish of [false, true]) {
    for (const failure of ["throw", "timeout", "non-ok"]) {
      globalThis.fetch = async () => {
        if (failure === "throw") throw new Error("private error");
        if (failure === "timeout") throw new DOMException("private error", "TimeoutError");
        return new Response("private error", { status: 500 });
      };
      const prefix = polish ? "/pl" : "";
      const response = await middleware(withdrawnRequest(`${prefix}/review/sample-cases/external-exposure-assessment`));
      assert.equal(response.status, 410);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("x-robots-tag"), "noindex");
      const body = await response.text();
      assert.ok(body.includes(polish ? "Ten przykład został wycofany" : "This sample has been retired"));
      assert.ok(body.includes(`href="${prefix}/reviews/agent-action-security-review"`));
      assert.match(body, /href="\/review\/sample-cases"/);
      assert.doesNotMatch(body, /private error|This offer has been withdrawn|Ta oferta została wycofana/);
    }
  }
});

test("retired sample HEAD requests return noindex 410 without fetching a shell", async () => {
  globalThis.fetch = async () => {
    assert.fail("HEAD must not fetch a shell");
  };
  const response = await middleware(withdrawnRequest("/review/sample-cases/access-removed-proof", "HEAD"));
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("x-robots-tag"), "noindex");
  assert.equal(await response.text(), "");
});
