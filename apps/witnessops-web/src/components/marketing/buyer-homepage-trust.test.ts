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

test("homepage leads with the security review and keeps the receipt specimen lower", () => {
  assert.match(source, /PRIMARY_OFFER\.cardSituation\.en/);
  assert.equal(
    PRIMARY_OFFER.cardSituation.en,
    "What can your AI agent actually do in production?",
  );
  assert.match(source, /className=\{styles\.heroOfferName\}>\{heroCopy\.eyebrow\}/);
  assert.match(source, /Who can authorize it\?/);
  assert.match(source, /What identity acts\?/);
  assert.match(source, /What can it actually reach\?/);
  assert.match(source, /What limits the blast radius\?/);
  assert.match(source, /What evidence remains afterward\?/);
  assert.match(source, /before a customer, pentest, or incident finds the gaps for you/);
  assert.match(source, /Authority → identity/);
  assert.match(source, /Permissions → tools/);
  assert.match(source, /Execution → evidence/);
  assert.match(source, /Paid review/);
  assert.match(source, /Produce something another party can check\./);
  assert.match(source, /Five questions\. One consequential action\./);
  assert.match(source, /What identity performs it\?/);
  assert.match(source, /What can it reach\?/);
  assert.match(source, /What limits the blast radius\?/);
  assert.match(source, /What evidence remains\?/);
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
  assert.doesNotMatch(source, /\/verify\/skill/);
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

test("Agent Action Security Review is the named, priced, bounded homepage offer", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "bounded-workflow-review",
  );

  assert.equal(offer?.name.en, "Agent Action Security Review");
  assert.equal(offer?.name.pl, "Agent Action Security Review");
  assert.equal(offer?.homepageFeatured, true);
  assert.equal(offer?.commercialRole, "primary");
  assert.equal(offer?.productId, undefined);
  assert.equal(offer?.price.en, "€2,500 fixed");
  assert.equal(
    offer?.timing.en,
    "Within 10 working days after evidence rules are agreed",
  );
  assert.match(offer?.boundary.en ?? "", /One consequential agent or automation action only/);
  assert.equal(PRIMARY_OFFER.fitCheck.en, "Non-secret fit check first");
  assert.equal(
    PRIMARY_OFFER.unit.en,
    "One consequential agent or automation action",
  );
  assert.deepEqual(PRIMARY_OFFER.included.en, [
    "Authority map",
    "Execution path",
    "Permission boundary",
    "Evidence chain",
    "Control gaps and practical fixes",
    "Readout",
  ]);
  assert.match(source, /offerTitle: PRIMARY_OFFER\.name\.en/);
  assert.match(source, /Review production authority before the agent acts\./);
  assert.match(source, /deliverables: PRIMARY_OFFER\.included\.en/);
  assert.match(
    source,
    /WitnessOps reviews one consequential agent or automation action across authority, identity, permissions, tools, execution, and evidence\./,
  );
  assert.match(
    source,
    /\$\{PRIMARY_OFFER\.price\.en\} · \$\{PRIMARY_OFFER\.fitCheck\.en\} · \$\{PRIMARY_OFFER\.unit\.en\} · \$\{PRIMARY_OFFER\.timing\.en\}/,
  );
  assert.match(
    source,
    /A practical security handover showing the execution path, permission boundary, evidence chain, control gaps, and the smallest useful fixes\./,
  );
  assert.match(
    source,
    /Bring one consequential action\. Review its authority, access, blast radius, and evidence\./,
  );
  assert.match(source, /See scope and pricing/);
  assert.doesNotMatch(source, /Agent Risk & Control Review|From €1,500/);
});

test("External Attack Surface Review remains a current catalog offer but is not the homepage lead", () => {
  const offer = BUYER_SERVICES.find(
    (service) => service.id === "external-exposure-assessment",
  );

  assert.equal(offer?.name.en, "External Attack Surface Review");
  assert.equal(offer?.commercialRole, "secondary");
  assert.equal(offer?.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(offer?.price.en, "€1,900 ex VAT — one authorised public-facing system");
  assert.match(offer?.timing.en ?? "", /Within 3 working days after/);
  assert.match(offer?.boundary.en ?? "", /No exploitation/);
  assert.match(offer?.boundary.en ?? "", /not a penetration test/i);
  assert.doesNotMatch(source, /External Attack Surface Review/);
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
