import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const form = readFileSync(
  resolve(__dirname, "../../../(marketing)/contact/contact-form.tsx"),
  "utf-8",
);

test("Polish PER request chrome mirrors the English offer-specific header", () => {
  assert.match(page, /sku\?\.id === "OFFSEC-EXTERNAL-EXPOSURE"/);
  assert.match(page, /generateMetadata/);
  assert.match(page, /Rozpocznij Public Exposure Review/);
  assert.match(
    page,
    /Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu/,
  );
  assert.match(page, /Opowiedz, co wymaga sprawdzenia/);
});

test("Polish review request selects the native Polish form copy", () => {
  assert.ok(
    page.includes(
      '<ContactForm locale="pl" intent={sku?.id ?? buyerService?.id ?? "review"} />',
    ),
  );
  assert.match(page, /buyerServiceByPublicOfferId\(offerId\)/);
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
