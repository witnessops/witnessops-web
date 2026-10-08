import test from "node:test";
import assert from "node:assert/strict";

import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GENERAL_HREF,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  PUBLIC_SALES_REVIEW_EMAIL,
  productContactSubject,
  publicContactMailto,
  salesReviewMailto,
} from "./public-contact";
import { getMailboxConfig } from "./mailboxes";
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

test("sales review display uses its own address and leaves operational mailboxes on the public contact route", () => {
  assert.equal(PUBLIC_SALES_REVIEW_EMAIL, "karol.stefanski@mail.witnessops.com");
  assert.notEqual(PUBLIC_SALES_REVIEW_EMAIL, PUBLIC_CONTACT_EMAIL);
  assert.equal(salesReviewMailto(), `mailto:${PUBLIC_SALES_REVIEW_EMAIL}`);
  assert.equal(
    salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck),
    "mailto:karol.stefanski@mail.witnessops.com?subject=WitnessOps%20fit%20check",
  );
  assert.equal(
    salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck).slice("mailto:".length).split("?")[0],
    PUBLIC_SALES_REVIEW_EMAIL,
  );

  const previous = {
    engage: process.env.WITNESSOPS_MAILBOX_ENGAGE,
    hello: process.env.WITNESSOPS_MAILBOX_HELLO,
    support: process.env.WITNESSOPS_MAILBOX_SUPPORT,
  };
  delete process.env.WITNESSOPS_MAILBOX_ENGAGE;
  delete process.env.WITNESSOPS_MAILBOX_HELLO;
  delete process.env.WITNESSOPS_MAILBOX_SUPPORT;
  try {
    const mailboxes = getMailboxConfig();
    assert.equal(mailboxes.engage, PUBLIC_CONTACT_EMAIL);
    assert.equal(mailboxes.hello, PUBLIC_CONTACT_EMAIL);
    assert.equal(mailboxes.support, PUBLIC_CONTACT_EMAIL);
    assert.notEqual(mailboxes.engage, PUBLIC_SALES_REVIEW_EMAIL);
    assert.notEqual(mailboxes.support, PUBLIC_SALES_REVIEW_EMAIL);
  } finally {
    if (previous.engage === undefined) delete process.env.WITNESSOPS_MAILBOX_ENGAGE;
    else process.env.WITNESSOPS_MAILBOX_ENGAGE = previous.engage;
    if (previous.hello === undefined) delete process.env.WITNESSOPS_MAILBOX_HELLO;
    else process.env.WITNESSOPS_MAILBOX_HELLO = previous.hello;
    if (previous.support === undefined) delete process.env.WITNESSOPS_MAILBOX_SUPPORT;
    else process.env.WITNESSOPS_MAILBOX_SUPPORT = previous.support;
  }
});
