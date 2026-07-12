import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");

test("customer security review page keeps the approved commercial boundary", () => {
  for (const marker of [
    "Customer Security Review Sprint",
    "Your enterprise customer sent a security questionnaire. We help you return a supported response in three working days.",
    "From €1,600, confirmed after a non-secret fit check.",
    "Delivery within three working days after the questionnaire, product scope, responsible owners and required evidence access are confirmed.",
    "Answer matrix prepared for customer approval",
    "Supported with qualification",
    "Owner assertion",
    "Not applicable, with reason",
    "This sprint does not replace SOC 2, ISO 27001, penetration testing, legal advice, or any certification explicitly required by the customer.",
    "Request a non-secret fit check",
    "/review/request",
    "No files, logs, screenshots, credentials, or customer evidence belong in the first message.",
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
