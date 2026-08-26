import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { BUYER_SERVICES } from "@/lib/buyer-services";

const source = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
const onePagerDir = resolve(__dirname, "../../../public/assets/one-pagers");

test("homepage leads with the agent-action promise and a bounded receipt claim", () => {
  assert.match(source, /Agents act\. WitnessOps proves\./);
  assert.match(
    source,
    /Signed receipts and external verification for consequential AI-agent actions\./,
  );
  assert.match(source, /AI agents are becoming invisible operators\./);
  assert.match(source, /Hope is not an audit artifact\./);
  assert.match(source, /Every consequential agent action gets a verifiable receipt\./);
  assert.match(source, /Who owned the agent/);
  assert.match(source, /What policy or approval allowed it/);
  assert.match(source, /How the receipt can be verified later/);
  assert.match(source, /A receipt proves only what its named verifier and referenced evidence support/);
  assert.match(source, /does not certify that an agent was correct, safe, compliant, or complete/);
  assert.match(source, /sample, not customer evidence/);
  assert.match(source, /\/review\/sample-cases\/ai-agent-action-proof-run/);
  assert.doesNotMatch(source, /Current paid entry point/);
  assert.doesNotMatch(source, /proves that the agent was correct/i);
});

test("Agent Risk & Control Review is the named, priced, bounded homepage offer", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "bounded-workflow-review",
  );

  assert.equal(offer?.name.en, "Agent Risk & Control Review");
  assert.equal(offer?.name.pl, "Agent Risk & Control Review");
  assert.equal(offer?.homepageFeatured, true);
  assert.equal(offer?.productId, undefined);
  assert.equal(offer?.price.en, "From €1,500");
  assert.match(offer?.timing.en ?? "", /Confirmed during the non-secret fit check/);
  assert.match(offer?.boundary.en ?? "", /One named workflow only/);
  assert.match(source, /Agent Risk & Control Review/);
  assert.match(source, /A focused review of one agentic or automated workflow\./);
  assert.match(source, /Agent and tool permission model/);
  assert.match(source, /Approval and policy gap analysis/);
  assert.match(source, /Sample proof bundle/);
  assert.match(source, /Control recommendations/);
  assert.match(
    source,
    /You know whether the workflow can be defended in an audit, customer review, or incident investigation\./,
  );
  assert.match(
    source,
    /Bring one agentic workflow\. We’ll show you what proof is missing\./,
  );
});

test("Public Exposure Review remains a current catalog offer but is not the homepage lead", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "Public Exposure Review");
  assert.equal(offer?.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(offer?.price.en, "€1,900 ex VAT — one authorised public-facing system");
  assert.match(offer?.timing.en ?? "", /Within 3 working days after/);
  assert.match(offer?.boundary.en ?? "", /No exploitation/);
  assert.match(offer?.boundary.en ?? "", /Unauthenticated outside-in checks only/);
  assert.doesNotMatch(source, /Public Exposure Review/);
});

test("request-only public footprint audit stays off the homepage", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "professional-public-footprint-audit",
  );

  assert.equal(offer?.homepageFeatured, false);
  assert.equal(offer?.pricingVisible, false);
  assert.equal(offer?.productId, undefined);
  assert.doesNotMatch(source, /Professional Public Footprint Audit/);
});

test("public one-pagers stay the two existing Customer Security Review PDFs", () => {
  const pdfs = readdirSync(onePagerDir)
    .filter((name) => name.endsWith(".pdf"))
    .sort();

  assert.deepEqual(pdfs, ["csr-sprint-en-a4.pdf", "csr-sprint-pl-a4.pdf"]);
  assert.equal(
    BUYER_SERVICES.filter((service) => service.onePagerHref).map((service) => service.id).join(),
    "customer-security-review-sprint",
  );
  assert.equal(
    BUYER_SERVICES.find((service) => service.id === "external-exposure-assessment")
      ?.onePagerHref,
    undefined,
  );
});
