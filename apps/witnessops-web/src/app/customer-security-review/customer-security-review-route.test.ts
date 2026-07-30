import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

test("customer security review page keeps the approved commercial boundary", () => {
  for (const marker of [
    "Customer Security Review Sprint",
    "Send us the security questionnaire holding up your deal.",
    "From €1,600",
    "Approximately three working days after scope, owners, required inputs and evidence access are confirmed.",
    "proposed answer matrix",
    "evidence index",
    "Start a non-secret fit check",
    "/review/request",
    "The customer owns the final answers, approvals and submission.",
    "WitnessOps does not invent evidence",
    "SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE",
  ]) {
    assert.ok(source.includes(marker), `Missing approved page marker: ${marker}`);
  }
});

test("customer security review page does not widen the public product boundary", () => {
  // Secondary "View services" -> /catalog is intentional site chrome (navbar/footer).
  // Keep the page from promoting the review hub alone or overclaim language.
  for (const forbidden of [
    "verified compliance",
    "certified compliance",
    "guaranteed approval",
    "security guaranteed",
    "href=\"/review\"",
    "public evidence upload",
  ]) {
    assert.ok(!source.includes(forbidden), `Forbidden page content present: ${forbidden}`);
  }

  assert.match(source, /href="\/catalog"/);
  assert.match(source, /View services/);
  assert.match(source, /href="\/review\/request"/);
});
