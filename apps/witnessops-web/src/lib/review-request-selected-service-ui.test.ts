import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const requestPage = readFileSync(
  resolve(__dirname, "../app/review/request/page.tsx"),
  "utf8",
);
const sharedRequest = readFileSync(resolve(__dirname, "../components/review-request/two-offer-request.tsx"), "utf8");
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

test("selected external review stays bounded and cannot inherit the AI proof bundle", () => {
  assert.match(requestPage, /<TwoOfferRequest locale="en"/);
  assert.match(sharedRequest, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(sharedRequest, /resolveNewReviewSelection\(params\)/);
  assert.match(sharedRequest, /const external = service\?\.id === "external-exposure-assessment"/);
  assert.match(sharedRequest, /service\.result\[locale\]/);
  assert.match(sharedRequest, /service\.boundary\[locale\]/);
  assert.match(sharedRequest, /service\.price\[locale\]/);
  assert.match(sharedRequest, /selection\.kind === "selected"/);
  assert.match(sharedRequest, /30 calendar days beginning at initial report handover/);
  assert.doesNotMatch(sharedRequest, /sampleArtifacts\.slice|primaryOfferOrder|publicExposureArtifacts/);
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
