import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextAction, observationFacts, observationSummary } from "./observation-presentation";
import type { ExternalSnapshotV1 } from "./model";

const source = JSON.parse(readFileSync(new URL("../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json", import.meta.url), "utf8")) as ExternalSnapshotV1;

test("all ten real check shapes have readable evidence without changing the source", () => {
  const before = JSON.stringify(source);
  for (const check of source.checks) {
    assert.ok(observationFacts(check).length, check.check_id);
    assert.ok(observationSummary(check).length, check.check_id);
    assert.ok(nextAction(check).length);
  }
  assert.equal(JSON.stringify(source), before);
  const hsts = source.checks.find(check => check.check_id === "web.hsts.v1")!;
  assert.deepEqual(observationFacts(hsts)[0], { label: "HSTS header", value: "max-age=63072000; includeSubDomains; preload" });
});

test("null, false, empty and absent source values stay distinct", () => {
  const check = structuredClone(source.checks.find(item => item.check_id === "tls.certificate.v1")!);
  check.observation = { validTo: null, hostnameMatch: false, protocol: "TLSv1.3" };
  assert.deepEqual(observationFacts(check), [
    { label: "Certificate expires", value: "Not recorded" },
    { label: "Hostname matched", value: "No" },
    { label: "TLS protocol", value: "TLSv1.3" },
  ]);
  const dns = structuredClone(source.checks[0]); dns.observation = { a: [] };
  assert.deepEqual(observationFacts(dns), [{ label: "IPv4 addresses", value: "None recorded" }]);
});

test("collection errors stay recorded uncertainty and never invent positive evidence", () => {
  const check = structuredClone(source.checks[0]);
  check.status = "CHECK_ERROR"; check.collected = false; check.observation = { reason: "DNS_TIMEOUT" };
  assert.deepEqual(observationFacts(check), [{ label: "Recorded collection result", value: "DNS_TIMEOUT" }]);
  assert.match(nextAction(check), /collection limit/);
  assert.equal(check.status, "CHECK_ERROR");
  check.observation = {};
  assert.deepEqual(observationFacts(check), []);
  assert.equal(observationSummary(check), "Open evidence for the recorded result.");
});

test("recorded recommendations remain authoritative; default next action does not invent a fix", () => {
  const info = source.checks.find(check => check.check_id === "web.security_txt.v1")!;
  assert.equal(nextAction(info), info.recommendation);
  const attention = structuredClone(source.checks[0]); attention.status = "NEEDS_ATTENTION";
  assert.match(nextAction(attention), /before deciding what to change/);
  assert.match(nextAction(source.checks[0]), /baseline/);
});

test("list summaries are bounded while evidence retains full recorded values", () => {
  const check = structuredClone(source.checks.find(item => item.check_id === "mail.spf.v1")!);
  const value = "v=spf1 " + "include:example.com ".repeat(20);
  check.observation = { records: [value] };
  assert.ok(observationSummary(check).length < 180);
  assert.ok(observationSummary(check).endsWith("…"));
  assert.equal(observationFacts(check)[0].value, value);
});
