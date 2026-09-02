import test from "node:test";
import assert from "node:assert/strict";

import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GENERAL_HREF,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  productContactSubject,
  publicContactMailto,
} from "./public-contact";
import { PRIMARY_OFFER } from "./commercial-truth";

test("public contact route uses the selected primary offer path and fallback email", () => {
  assert.equal(PUBLIC_CONTACT_EMAIL, "engage@mail.witnessops.com");
  assert.equal(PUBLIC_CONTACT_GENERAL_HREF, "/review/request");
  assert.equal(
    PUBLIC_CONTACT_PRIMARY_HREF,
    "/review/request?offerId=bounded-workflow-review&offer=Agent+Workflow+Reconstruction",
  );
  assert.doesNotMatch(PUBLIC_CONTACT_PRIMARY_HREF, /Agent.Risk|1%2C500/);
  assert.equal(PUBLIC_CONTACT_SUBJECTS.general, "WitnessOps request");
  assert.equal(PUBLIC_CONTACT_SUBJECTS.fitCheck, "WitnessOps fit check");
  assert.equal(
    PRIMARY_OFFER.mailSubject,
    "WitnessOps request — Agent Workflow Reconstruction",
  );
  assert.equal(
    PUBLIC_NO_SECRETS_NOTE,
    "Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.",
  );
  assert.equal(
    publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request",
  );
  assert.equal(
    publicContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20fit%20check",
  );
  assert.equal(
    publicContactMailto(productContactSubject("AI Agent Action Proof Run")),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20AI%20Agent%20Action%20Proof%20Run",
  );
  assert.equal(
    publicContactMailto(PRIMARY_OFFER.mailSubject),
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20Agent%20Workflow%20Reconstruction",
  );
});
