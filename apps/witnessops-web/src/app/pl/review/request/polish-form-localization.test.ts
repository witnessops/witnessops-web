import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const form = readFileSync(
  resolve(__dirname, "../../../(marketing)/contact/contact-form.tsx"),
  "utf-8",
);

test("Polish request chrome uses the agent review and closes a parked external query", () => {
  assert.match(page, /resolveNewSalesPageQuery\(/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /NewSalesIntakeClosed/);
  assert.match(page, /PUBLIC_AGENT_ACTION_OFFER\.name\.pl/);
  assert.match(page, /agentActionOrder/);
  assert.match(page, /Opisz, co chcesz sprawdzić/);
  assert.match(page, /engage@mail\.witnessops\.com/);
  assert.doesNotMatch(page, /decision\.role === "product"/);
  assert.doesNotMatch(page, /EXTERNAL_ATTACK_SURFACE_OFFER/);
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
