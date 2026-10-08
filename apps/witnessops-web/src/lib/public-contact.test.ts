import test from "node:test";
import assert from "node:assert/strict";

import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GENERAL_HREF,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  PUBLIC_SALES_CONTACT_EMAIL,
  productContactSubject,
  publicContactMailto,
  publicSalesContactMailto,
} from "./public-contact";
import { PRIMARY_OFFER } from "./commercial-truth";

test("public contact route uses a general inquiry path and fallback email", () => {
  assert.equal(PUBLIC_CONTACT_EMAIL, "engage@mail.witnessops.com");
  assert.equal(PUBLIC_CONTACT_GENERAL_HREF, "/review/request");
  assert.equal(
    PUBLIC_CONTACT_PRIMARY_HREF,
    "/review/request",
  );
  assert.doesNotMatch(PUBLIC_CONTACT_PRIMARY_HREF, /Agent.Risk|1%2C500/);
  assert.equal(PUBLIC_CONTACT_SUBJECTS.general, "WitnessOps request");
  assert.equal(PUBLIC_CONTACT_SUBJECTS.fitCheck, "WitnessOps fit check");
  assert.equal(
    PRIMARY_OFFER.mailSubject,
    "WitnessOps request — AI Agent Tools & Access Review",
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
    "mailto:engage@mail.witnessops.com?subject=WitnessOps%20request%20%E2%80%94%20AI%20Agent%20Tools%20%26%20Access%20Review",
  );
});

test("buyer-facing sales contact is displayed with a matching mailto target", () => {
  assert.equal(PUBLIC_SALES_CONTACT_EMAIL, "karol.stefanski@mail.witnessops.com");
  assert.notEqual(PUBLIC_SALES_CONTACT_EMAIL, PUBLIC_CONTACT_EMAIL);
  assert.equal(
    publicSalesContactMailto(PUBLIC_CONTACT_SUBJECTS.general),
    "mailto:karol.stefanski@mail.witnessops.com?subject=WitnessOps%20request",
  );
  assert.equal(
    publicSalesContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck),
    "mailto:karol.stefanski@mail.witnessops.com?subject=WitnessOps%20fit%20check",
  );
});
