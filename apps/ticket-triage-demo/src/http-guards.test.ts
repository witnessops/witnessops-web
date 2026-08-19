import assert from "node:assert/strict";
import test from "node:test";
import {
  hasAllowedLoopbackAuthority,
  parseLoopbackRequestTarget,
} from "./http-guards.js";

test("allows the exact loopback authority with a matching or absent origin", () => {
  assert.equal(
    hasAllowedLoopbackAuthority({
      headers: { host: "127.0.0.1:3025" },
      port: 3025,
    }),
    true,
  );
  assert.equal(
    hasAllowedLoopbackAuthority({
      headers: {
        host: "127.0.0.1:3025",
        origin: "http://127.0.0.1:3025",
      },
      port: 3025,
    }),
    true,
  );
});

test("rejects alternate hosts and cross-origin browser requests", () => {
  assert.equal(
    hasAllowedLoopbackAuthority({
      headers: { host: "localhost:3025" },
      port: 3025,
    }),
    false,
  );
  assert.equal(
    hasAllowedLoopbackAuthority({
      headers: {
        host: "127.0.0.1:3025",
        origin: "https://attacker.example",
      },
      port: 3025,
    }),
    false,
  );
});

test("parses only bounded origin-form request targets", () => {
  assert.equal(
    parseLoopbackRequestTarget({
      requestTarget: "/?fixture=DEMO-002",
      port: 3025,
    })?.pathname,
    "/",
  );
  assert.equal(
    parseLoopbackRequestTarget({
      requestTarget: "/?fixture=DEMO-002",
      port: 3025,
    })?.searchParams.get("fixture"),
    "DEMO-002",
  );

  for (const requestTarget of [
    "//[",
    "//attacker.example/path",
    "http://attacker.example/path",
    "/\\attacker.example/path",
    "/path\u0000more",
  ]) {
    assert.equal(
      parseLoopbackRequestTarget({ requestTarget, port: 3025 }),
      null,
      requestTarget,
    );
  }
});
