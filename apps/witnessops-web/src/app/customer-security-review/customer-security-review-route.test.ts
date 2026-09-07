import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import { getServiceLanding } from "@/lib/service-landings";

const source = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const service = buyerServiceById("customer-security-review-sprint");
const landing = getServiceLanding(service.id, "en");
const copy = [source, JSON.stringify(service), JSON.stringify(landing)].join("\n");

test("customer security review page keeps the approved commercial boundary", () => {
  for (const marker of [
    "Customer Security Review Sprint",
    "Get the questionnaire off your desk.",
    "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
    "Proposed answer matrix", "Evidence index", "Scope this review",
    "The customer owns the final answers, approvals and submission.",
    "WitnessOps does not invent evidence",
    "SYNTHETIC DEMONSTRATION, NOT CUSTOMER EVIDENCE",
  ]) assert.ok(copy.includes(marker), `Missing approved page marker: ${marker}`);
  assert.equal(service.price.en, "From €1,600 · excluding VAT");
  assert.match(source, /<BuyerServiceDetail locale="en" service=\{service\}/);
});

test("customer security review page does not widen the public product boundary", () => {
  for (const forbidden of ["verified compliance", "certified compliance", "guaranteed approval", "security guaranteed", 'href="/review"', "public evidence upload"]) {
    assert.ok(!copy.includes(forbidden), `Forbidden page content present: ${forbidden}`);
  }
  const request = new URL(buyerServiceRequestHref("en", service), "https://witnessops.com");
  assert.equal(request.pathname, "/review/request");
  assert.equal(request.searchParams.get("offerId"), service.id);
  assert.equal(landing.sampleHref, "/review/sample-cases/customer-security-review-sprint");
});
