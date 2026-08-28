import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const requestPage = readFileSync(
  resolve(__dirname, "../app/review/request/page.tsx"),
  "utf8",
);
const contactForm = readFileSync(
  resolve(__dirname, "../app/(marketing)/contact/contact-form.tsx"),
  "utf8",
);
const confirmationPage = readFileSync(
  resolve(
    __dirname,
    "../components/review-request/review-request-confirmed.tsx",
  ),
  "utf8",
);

test("selected non-agent services do not inherit the agent proof bundle", () => {
  assert.match(requestPage, /const agentRiskControlOrder/);
  assert.match(requestPage, /const selectedServiceOrder/);
  assert.match(
    requestPage,
    /agentRiskControlOrder\s*\? sampleArtifacts\.slice\(0, 5\)\s*:\s*\[\]/,
  );
  assert.match(requestPage, /title: "Expected outcome"/);
  assert.match(requestPage, /title: "Offer boundary"/);
  assert.match(requestPage, /summary: selectedServiceOrder\.result\.en/);
  assert.match(requestPage, /summary: selectedServiceOrder\.boundary\.en/);
  assert.match(requestPage, /\{activeArtifacts\.length > 0 \? \(/);
  assert.match(requestPage, /const selectedServiceNextSteps/);
  assert.match(
    requestPage,
    /selectedServiceOrder\s*\? selectedServiceNextSteps\s*:\s*nextSteps/,
  );
});

test("selected non-agent services collect and store service-specific context", () => {
  assert.match(contactForm, /const selectedNonAgentService/);
  assert.match(contactForm, /"Questionnaire or customer request"/);
  assert.match(contactForm, /"Consent and public-source boundary"/);
  assert.match(contactForm, /`Request: \$\{selectedNonAgentService\.name\.en\}`/);
  assert.match(contactForm, /"Selected-service need"/);
  assert.match(
    contactForm,
    /"Follow-up needed: selected-service fit, exact scope, consent or authority, required inputs, fee, timing, and evidence handling"/,
  );
});

test("confirmation resources stay aligned to the recorded service kind", () => {
  assert.match(
    confirmationPage,
    /confirmation\.requestKind === "agent-risk-control-review"/,
  );
  assert.match(confirmationPage, /const serviceIdByRequestKind/);
  assert.match(
    confirmationPage,
    /"customer-security-review-sprint": "customer-security-review-sprint"/,
  );
  assert.match(confirmationPage, /"one-server-security-check"/);
  assert.match(confirmationPage, /"launch-readiness-check"/);
  assert.match(confirmationPage, /"key-access-custody-review"/);
  assert.match(confirmationPage, /"incident-readiness-review"/);
  assert.match(confirmationPage, /buyerServiceById\(serviceId\)/);
  assert.match(confirmationPage, /selectedService\.detailHref\[locale\]/);
  assert.match(confirmationPage, /"ai-agent-action-proof-run"/);
  assert.match(confirmationPage, /"access-change-proof-run"/);
  assert.match(confirmationPage, /\/review\/sample-cases\/access-removed-proof/);
  assert.match(confirmationPage, /\{proofResource \? \(/);
  assert.doesNotMatch(
    confirmationPage,
    /const specimenHref = publicExposureReview/,
  );
});
