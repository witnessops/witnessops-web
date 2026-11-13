import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { OfferRevisionSnapshot } from "@/lib/offer-revision-snapshot";
import { OfferRevisionDetails } from "./offer-revision-details";

const recorded: OfferRevisionSnapshot = {
  schemaVersion: 1, capturedAt: "2026-01-01T12:00:00Z", offerId: "agent-action-security-review",
  name: { en: "Recorded offer name", pl: "Zapisana nazwa" }, scopeRevision: "recorded_revision_v1",
  price: { basis: "recorded_fee", en: "Recorded fee terms", pl: "Zapisane warunki ceny" },
  timing: { basis: "recorded_timing", en: "Recorded delivery terms", pl: "Zapisany termin" },
};

test("operator details render stored revision and terms with a separate agreement boundary", () => {
  const html = renderToStaticMarkup(createElement(OfferRevisionDetails, {
    submission: { intent: recorded.offerId, offerSnapshot: recorded },
  }));
  assert.match(html, /Offer at enquiry: recorded_revision_v1/);
  assert.match(html, /Recorded fee terms/);
  assert.match(html, /Recorded delivery terms/);
  assert.match(html, /2026-01-01T12:00:00Z/);
  assert.match(html, /An agreed SOW and testing authorization are separate/);
  assert.doesNotMatch(html, /one_action_adversarial_testing_v2|Fee agreed in signed SOW/);
});

test("old records explicitly render unversioned while contact/support have no offer panel", () => {
  const old = renderToStaticMarkup(createElement(OfferRevisionDetails, {
    submission: { intent: "agent-action-security-review" },
  }));
  assert.match(old, /Offer at enquiry: unversioned/);
  assert.match(old, /Unversioned — no offer snapshot recorded/);
  for (const submission of [{}, { intent: "ask-ai-contact" }]) {
    assert.equal(renderToStaticMarkup(createElement(OfferRevisionDetails, { submission })), "");
  }
});

test("stored offer text is escaped in operator rendering", () => {
  const html = renderToStaticMarkup(createElement(OfferRevisionDetails, {
    submission: { offerSnapshot: { ...recorded, scopeRevision: "<script>bad()</script>",
      price: { ...recorded.price, en: "<img src=x onerror=bad()>" } } },
  }));
  assert.doesNotMatch(html, /<script>|<img/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img/);
});
