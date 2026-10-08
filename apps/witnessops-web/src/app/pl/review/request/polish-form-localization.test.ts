import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { resolveNewReviewSelection } from "@/lib/new-review-request-policy";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const sharedRequest = readFileSync(
  resolve(__dirname, "../../../../components/review-request/two-offer-request.tsx"),
  "utf-8",
);
const form = readFileSync(
  resolve(__dirname, "../../../(marketing)/contact/contact-form.tsx"),
  "utf-8",
);

test("Polish review request delegates to guarded two-offer selection", () => {
  assert.match(page, /<TwoOfferRequest locale="pl"/);
  assert.match(page, /twoOfferRequestMetadata\("pl"\)/);
  assert.match(sharedRequest, /resolveNewReviewSelection\(params\)/);
  assert.match(sharedRequest, /To nie jest test penetracyjny/);
  assert.match(sharedRequest, /Ten formularz nie rozpoczyna przeglądu/);
  assert.match(sharedRequest, /Który przegląd pomoże/);
  assert.match(sharedRequest, /30 dni kalendarzowych/);
  assert.deepEqual(resolveNewReviewSelection({productId:"OFFSEC-EXTERNAL-EXPOSURE"}), {
    kind:"selected", serviceId:"external-exposure-assessment", intent:"OFFSEC-EXTERNAL-EXPOSURE",
  });
  assert.equal(resolveNewReviewSelection({productId:"OFFSEC-LOCAL-AUDIT"}).kind, "unavailable");
});

test("Polish review request retains native localized form and exact intent", () => {
  assert.match(sharedRequest, /<ContactForm[\s\S]*locale=\{locale\}[\s\S]*intent=\{selection\.intent\}/);
  assert.match(sharedRequest, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(sharedRequest, /data-request-selection=/);
  assert.deepEqual(resolveNewReviewSelection({offerId:"agent-action-security-review"}), {
    kind:"selected", serviceId:"agent-action-security-review", intent:"agent-action-security-review",
  });
  assert.equal(resolveNewReviewSelection({offerId:"agent-tools-access-review"}).kind, "unavailable");
  for (const marker of [
    "Imię i nazwisko",
    "Służbowy adres e-mail",
    "Co wymaga sprawdzenia?",
    "Sytuacja i system objęty przeglądem",
    "Wyślij ocenę dopasowania",
    "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.",
    "Weryfikacja skrzynki pocztowej",
    "Potwierdź skrzynkę",
    "Nie wysyłaj haseł, kluczy prywatnych",
  ]) {
    assert.ok(form.includes(marker), `Missing Polish form marker: ${marker}`);
  }
});
