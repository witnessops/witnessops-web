import assert from "node:assert/strict";
import test from "node:test";

import { hasSensitiveText, sanitizeText } from "./sanitize";

test("the value scanner redacts email, phone, URL, and key shapes", () => {
  const samples = [
    "buyer@example.com",
    "Name <buyer@example.com>",
    "+1 202 555 0147",
    "+442079460958",
    "https://evil.example/path?q=1",
    "www.evil.example/a",
    `wo_mcp_reader_${"a".repeat(43)}`,
    "AKIAIOSFODNN7EXAMPLE",
    "pk-demo-abcdefghijklmnopqrstuvwxyz",
    "-----BEGIN PRIVATE KEY-----",
  ];
  for (const sample of samples) {
    const sanitized = sanitizeText(sample);
    assert.equal(sanitized.redactions > 0, true, sample);
    assert.equal(sanitized.text.includes("@"), false, sample);
    assert.equal(sanitized.text.includes("http"), false, sample);
    assert.equal(sanitized.text.includes("wo_mcp_"), false, sample);
    assert.equal(hasSensitiveText(sample), true);
  }
});

test("timestamps and ordinary ids are left unchanged", () => {
  for (const sample of ["2026-10-24T00:00:00.000Z", "rev_1", "sku_1", "bounded sample", "recorded"]) {
    const sanitized = sanitizeText(sample);
    assert.equal(sanitized.text, sample);
    assert.equal(sanitized.redactions, 0);
  }
});

test("control, bidi, zero-width, and tag characters are stripped", () => {
  const sanitized = sanitizeText("a\u0000b\u200Bc\u202Ed\u{E0001}e");
  assert.equal(sanitized.text, "abcde");
  assert.equal(sanitized.redactions > 0, true);
});
