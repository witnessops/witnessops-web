import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  sampleCommitShort,
  sampleManifestSha256,
  sampleSourceRepository,
} from "@/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";

const source = readFileSync(resolve(__dirname, "buyer-homepage.tsx"), "utf8");
const onePagerDir = resolve(__dirname, "../../../public/assets/one-pagers");

test("homepage connects the agent workflow review to a bounded receipt specimen", () => {
  assert.match(source, /Agents act\. WitnessOps proves\./);
  assert.match(source, /Proof infrastructure for agentic operations/);
  assert.match(source, /Check the agent before it acts/);
  assert.match(source, /See one bounded action/);
  assert.match(source, /Inspect what happened/);
  assert.match(source, /Bring the real workflow/);
  assert.match(source, /Before execution/);
  assert.match(source, /Recorded action/);
  assert.match(source, /Evidence/);
  assert.match(source, /Paid review/);
  assert.match(source, /Produce something another party can check\./);
  assert.match(source, /Five questions\. One bounded workflow\./);
  assert.match(source, /What was authorized\?/);
  assert.match(source, /What was executed\?/);
  assert.match(source, /What was observed\?/);
  assert.match(source, /What remains unresolved\?/);
  assert.match(source, /How can it be challenged\?/);
  assert.match(source, /Verified synthetic specimen — not live customer evidence/);
  assert.match(source, /sampleSourceRepository/);
  assert.match(source, /sampleCommitShort/);
  assert.match(source, /sampleManifestSha256/);
  assert.equal(sampleSourceRepository, "witnessops/witnessops-sample-cases");
  assert.equal(sampleCommitShort, "d4ad234bd815");
  assert.equal(
    sampleManifestSha256,
    "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7",
  );
  assert.match(source, /VALID_SYNTHETIC_SPECIMEN/);
  assert.match(source, /does not establish production deployment, compliance/);
  assert.match(source, /A receipt is only as strong as its named evidence and verifier/);
  assert.match(source, /Bring the real workflow/);
  assert.match(source, /Run and verify the compromised API key rotation demo/);
  assert.match(source, /data-ui-proof-id="homepage-demo-cta"/);
  assert.match(source, /id="evidence-questions"/);
  assert.match(source, /id="agent-action-receipt"/);
  assert.match(source, /id="agent-workflow-reconstruction"/);
  assert.equal(
    source.match(/href: "#agent-action-receipt"/g)?.length,
    2,
    "both locales should target the receipt section that exists on initial render",
  );
  assert.doesNotMatch(
    source,
    /witnessed-crm-status-change#receipt/,
    "the homepage must not promise a conditional receipt-stage fragment",
  );
  assert.match(source, /\/review\/sample-cases\/ai-agent-action-proof-run/);
  assert.match(source, /\/review\/sample-cases\/witnessed-crm-status-change/);
  assert.match(source, /\/verify\/skill/);
  assert.match(
    source,
    /buyerPublicOfferRequestHref\(\s*locale,\s*PRIMARY_OFFER\.id,\s*\)/,
  );
  assert.doesNotMatch(source, /productId=WORKFLOW-S/);
  assert.doesNotMatch(source, /Aegis/);
  assert.doesNotMatch(source, /external verification/i);
  assert.doesNotMatch(source, /Every consequential agent action gets a verifiable receipt/i);
  assert.doesNotMatch(source, /No secrets/i);
});

test("Agent Workflow Reconstruction is the named, priced, bounded homepage offer", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "bounded-workflow-review",
  );

  assert.equal(offer?.name.en, "Agent Workflow Reconstruction");
  assert.equal(offer?.name.pl, "Agent Workflow Reconstruction");
  assert.equal(offer?.homepageFeatured, true);
  assert.equal(offer?.commercialRole, "primary");
  assert.equal(offer?.productId, undefined);
  assert.equal(offer?.price.en, "€2,500 fixed");
  assert.equal(
    offer?.timing.en,
    "Within 10 working days after evidence rules are agreed",
  );
  assert.match(offer?.boundary.en ?? "", /One named workflow only/);
  assert.equal(PRIMARY_OFFER.fitCheck.en, "Non-secret fit check first");
  assert.equal(
    PRIMARY_OFFER.unit.en,
    "One named workflow (agentic or automated)",
  );
  assert.deepEqual(PRIMARY_OFFER.included.en, [
    "Non-secret fit check",
    "Scoped reconstruction",
    "Workflow and permission map",
    "Evidence-gap list",
    "Proposed receipt shape",
    "Sample pack that can be tested through /verify",
    "Readout",
  ]);
  assert.match(source, /offerTitle: PRIMARY_OFFER\.name\.en/);
  assert.match(source, /Reconstruct the workflow, not only the file\./);
  assert.match(source, /deliverables: PRIMARY_OFFER\.included\.en/);
  assert.match(
    source,
    /WitnessOps reconstructs one consequential agent or automation workflow and separates what was authorised, executed, observed, and still unresolved\./,
  );
  assert.match(
    source,
    /\$\{PRIMARY_OFFER\.price\.en\} · \$\{PRIMARY_OFFER\.fitCheck\.en\} · \$\{PRIMARY_OFFER\.unit\.en\} · \$\{PRIMARY_OFFER\.timing\.en\}/,
  );
  assert.match(
    source,
    /A practical handover that separates supported observations, unresolved gaps, and the evidence or controls needed to strengthen the workflow\./,
  );
  assert.match(
    source,
    /Bring one consequential workflow\. Make its authority and evidence reviewable\./,
  );
  assert.match(source, /See scope and pricing/);
  assert.doesNotMatch(source, /Agent Risk & Control Review|From €1,500/);
});

test("Public Exposure Review remains a current catalog offer but is not the homepage lead", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "Public Exposure Review");
  assert.equal(offer?.commercialRole, "secondary");
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
