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
    "Delivery within three working days after the questionnaire, product scope, responsible owners and required evidence access are confirmed.",
    "Answer matrix prepared for customer approval",
    "Supported with qualification",
    "Owner assertion",
    "Not applicable, with reason",
    "This sprint does not replace SOC 2, ISO 27001, penetration testing, legal advice, or any certification explicitly required by the customer.",
    "Send the questionnaire for a bounded fit check.",
    "/review/request",
    "Do not send the questionnaire, files,",
    "SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE",
  ]) {
    assert.ok(source.includes(marker), `Missing approved page marker: ${marker}`);
  }
});

test("customer security review page does not widen the public product boundary", () => {
  for (const forbidden of [
    "verified compliance",
    "certified compliance",
    "guaranteed approval",
    "security guaranteed",
    "href=\"/review\"",
    "href=\"/catalog\"",
    "public evidence upload",
  ]) {
    assert.ok(!source.includes(forbidden), `Forbidden page content present: ${forbidden}`);
  }
});
