import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PolishReviewRequestPage, { generateMetadata } from "./page";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const form = readFileSync(
  resolve(__dirname, "../../../(marketing)/contact/contact-form.tsx"),
  "utf-8",
);

test("Polish request chrome uses the agent review and closes a parked external query", async () => {
  assert.match(page, /resolveNewSalesPageQuery\(/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /NewSalesIntakeClosed/);
  assert.match(page, /PUBLIC_AGENT_ACTION_OFFER\.name\.pl/);
  assert.match(page, /agentActionOrder/);
  assert.match(page, /Opisz, co chcesz sprawdzić/);
  assert.doesNotMatch(page, /decision\.role === "product"/);
  assert.doesNotMatch(page, /EXTERNAL_ATTACK_SURFACE_OFFER/);

  const externalQuery = { searchParams: Promise.resolve({ productId: "OFFSEC-EXTERNAL-EXPOSURE" }) };
  const external = renderToStaticMarkup(await PolishReviewRequestPage(externalQuery));
  assert.match(external, /External Attack Surface Review nie jest już dostępny/);
  assert.match(external, /To nie jest Agent Action Security Review/);
  assert.doesNotMatch(external, /<form|€1[\s,\u00a0]?900/);

  const unknownQuery = { searchParams: Promise.resolve({ offerId: "unknown" }) };
  const unknown = renderToStaticMarkup(await PolishReviewRequestPage(unknownQuery));
  assert.match(unknown, /Ten link nie rozpoczyna nowego przeglądu/);
  assert.doesNotMatch(unknown, /<form|External Attack Surface Review nie jest już dostępny/);
  for (const query of [externalQuery, unknownQuery]) {
    const metadata = await generateMetadata(query);
    assert.equal(metadata.title, "To zgłoszenie nie rozpoczyna przeglądu");
    assert.match(String(metadata.description), /Istniejące zgłoszenia i podpisane umowy zachowują pierwotne warunki/);
    assert.doesNotMatch(String(metadata.description), /€|Rozpocznij|External Attack Surface Review/);
  }
});

test("Polish review request selects the native Polish form copy", () => {
  assert.match(page, /<ContactForm[\s\S]*locale="pl"[\s\S]*decision\.intent/);
  assert.match(page, /resolveNewSalesPageQuery\(/);
  assert.match(page, /agentActionOrder/);
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
