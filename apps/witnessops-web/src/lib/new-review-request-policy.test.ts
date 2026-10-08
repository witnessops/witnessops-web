import assert from "node:assert/strict";
import test from "node:test";
import { resolveNewReviewSelection, validateNewReviewIntake } from "./new-review-request-policy";

const ai = "agent-tools-access-review";
const external = "OFFSEC-EXTERNAL-EXPOSURE";

test("a bare enquiry is fit only, not an automatically selected paid review", () => {
  assert.deepEqual(resolveNewReviewSelection({}), { kind: "fit" });
});
test("AI selection retains its offerId role", () => {
  assert.deepEqual(resolveNewReviewSelection({ offerId: ai, offer: "Display label" }), { kind: "selected", serviceId: ai, intent: ai });
});
test("external selection retains its productId role", () => {
  assert.deepEqual(resolveNewReviewSelection({ productId: external }), { kind: "selected", serviceId: "external-exposure-assessment", intent: external });
});
test("campaign attribution does not select or change a review", () => {
  assert.deepEqual(resolveNewReviewSelection({ utm_source: "example", source: "ask" }), { kind: "fit" });
  assert.equal(resolveNewReviewSelection({ productId: external, source: "ask" }).kind, "selected");
});
test("unknown, empty, retired and wrong-role identifiers do not fall back to a current offer", () => {
  for (const params of [
    { offerId: "bounded-workflow-review" }, { offerId: "automation-repair-handover" },
    { productId: "OFFSEC-LOCAL-AUDIT" }, { offerId: "external-exposure-assessment" },
    { productId: ai }, { offerId: "" }, { productId: null }, { offerId: `${ai} ` },
    { offer: "AI Agent Tools & Access Review" }, { enquiryPath: "early-bird" },
  ]) assert.equal(resolveNewReviewSelection(params).kind, "unavailable", JSON.stringify(params));
});
test("conflicting or duplicated selectors are rejected even when duplicates match", () => {
  for (const params of [
    { offerId: ai, productId: external }, { offerId: [ai, ai] },
    { productId: [external] }, { offerId: ai, offer: ["x", "y"] },
    { offerId: ai, enquiryPath: "early-bird" }, { productId: external, offerId: undefined },
  ]) assert.equal(resolveNewReviewSelection(params).kind, "unavailable", JSON.stringify(params));
});
test("new intake accepts exactly the two paid intent roles and non-offer fit contexts", () => {
  for (const intent of [ai, external, "review", "ask-ai-contact"]) {
    assert.deepEqual(validateNewReviewIntake({ intent, scope: "Non-secret question" }), { ok: true, intent });
  }
  assert.deepEqual(validateNewReviewIntake({}), { ok: true, intent: "review" });
});
test("new issuance refuses every old offer tested, without altering historical interpretation", () => {
  for (const intent of ["bounded-workflow-review", "automation-repair-handover", "OFFSEC-LOCAL-AUDIT", "OFFSEC-LAUNCH-READY", "OFFSEC-CUSTODY-OPS", "OFFSEC-INCIDENT-READY", "customer-security-review-sprint", "professional-public-footprint-audit", "ai-agent-action-proof-run", "access-change-proof-run", "Third-party assessment", "early-bird", "external-exposure-assessment", "unknown"]) {
    assert.equal(validateNewReviewIntake({ intent }).ok, false, intent);
  }
});
test("malformed intent values do not normalize into a paid offer", () => {
  for (const intent of [null, "", " review", `${ai} `, [ai], {}, 42, true]) {
    assert.equal(validateNewReviewIntake({ intent }).ok, false, JSON.stringify(intent));
  }
  for (const body of [null, [], ai, 1]) assert.equal(validateNewReviewIntake(body).ok, false);
});
test("raw request aliases cannot be silently stripped into generic fit by schema parsing", () => {
  for (const key of ["offerId", "productId", "offer", "enquiryPath"]) {
    assert.equal(validateNewReviewIntake({ intent: "review", [key]: ai }).ok, false, key);
  }
});
test("stale landing-form choices cannot be submitted as a generic review", () => {
  for (const label of ["Early Bird — Internet Footprint Review", "Free check", "Other", "AI review"]) {
    assert.equal(validateNewReviewIntake({ intent: "review", scope: `Request: fit\nEnquiry path: ${label}\nReview need: test` }).ok, false);
  }
});
test("the explicit serialized intent must agree with the authoritative top-level intent", () => {
  assert.equal(validateNewReviewIntake({ intent: ai, scope: `Selected product / intent: ${ai}\nReview need: test` }).ok, true);
  assert.equal(validateNewReviewIntake({ intent: ai, scope: `Selected product / intent: ${external}` }).ok, false);
  assert.equal(validateNewReviewIntake({ intent: ai, scope: `Selected product / intent: ${ai}\nSelected product / intent: ${ai}` }).ok, false);
});
test("ordinary free text is not interpreted as an offer selection or testing authority", () => {
  assert.deepEqual(validateNewReviewIntake({ intent: "review", scope: "We previously bought a server audit. Which of the two reviews fits now?" }), { ok: true, intent: "review" });
});
