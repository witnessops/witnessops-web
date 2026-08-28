import test from "node:test";
import assert from "node:assert/strict";

import {
  ASK_AI_CONTACT_INTENT,
  BOUNDED_WORKFLOW_REVIEW_INTENT,
  getCommercialRequestLabel,
  isManualCommercialRequestIntent,
} from "./commercial-request-intents";
import { BUYER_SERVICES } from "./buyer-services";
import {
  getProofRunRequestLabel,
  isAccessChangeProofRunIntent,
  isManualProofRunIntent,
} from "./access-change-proof-run";

test("current commercial request intents use the manual request lane", () => {
  for (const service of BUYER_SERVICES) {
    const intent = service.productId ?? service.id;
    assert.equal(
      isManualCommercialRequestIntent(intent),
      true,
      intent,
    );
    assert.equal(
      getCommercialRequestLabel(intent),
      `${service.name.en} request`,
      intent,
    );
  }
  assert.equal(isManualCommercialRequestIntent(ASK_AI_CONTACT_INTENT), true);
  assert.equal(
    getCommercialRequestLabel(BOUNDED_WORKFLOW_REVIEW_INTENT),
    "Agent Risk & Control Review request",
  );
  assert.equal(
    getCommercialRequestLabel(ASK_AI_CONTACT_INTENT),
    "Ask WitnessOps follow-up request",
  );
});

test("legacy generic engage intent stays outside the manual request lane", () => {
  assert.equal(isManualCommercialRequestIntent("review"), false);
  assert.equal(isManualCommercialRequestIntent("Third-party assessment"), false);
});

test("legacy proof-run exports remain compatible with the commercial lane", () => {
  assert.equal(isManualProofRunIntent(BOUNDED_WORKFLOW_REVIEW_INTENT), true);
  assert.equal(isAccessChangeProofRunIntent(ASK_AI_CONTACT_INTENT), true);
  assert.equal(
    getProofRunRequestLabel(BOUNDED_WORKFLOW_REVIEW_INTENT),
    getCommercialRequestLabel(BOUNDED_WORKFLOW_REVIEW_INTENT),
  );
});
