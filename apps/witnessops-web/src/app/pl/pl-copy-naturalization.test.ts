import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { getPolishSkus, POLISH_OFFERS } from "@/lib/public-i18n";

const homePage = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const buyerHomepage = readFileSync(
  resolve(__dirname, "../../components/marketing/buyer-homepage.tsx"),
  "utf-8",
);

test("Polish homepage uses the approved naturalized headline and terminology", () => {
  assert.match(homePage, /<BuyerHomepage locale="pl" \/>/);
  assert.match(buyerHomepage, /Jasno określony zakres\. Sprawdzalny wynik\./);
  assert.match(buyerHomepage, /Opowiedz nam, co wymaga sprawdzenia\./);
  assert.match(buyerHomepage, /Sześć przeglądów dla pracy, która wymaga jasnego następnego kroku/);
  assert.match(buyerHomepage, /Widoczny status materiału/);
  assert.doesNotMatch(homePage, /Jasny zakres\. Jasny wynik\./);
  assert.doesNotMatch(homePage, /Konkretna dostawa/);
});

test("detailed Polish offer routes retain their established terminology", () => {
  assert.equal(
    POLISH_OFFERS["OFFSEC-LOCAL-AUDIT"]?.name,
    "Przegląd bezpieczeństwa pojedynczego serwera",
  );
  assert.equal(
    POLISH_OFFERS["OFFSEC-LAUNCH-READY"]?.name,
    "Ocena gotowości do wdrożenia",
  );
  assert.equal(
    POLISH_OFFERS["OFFSEC-CUSTODY-OPS"]?.name,
    "Przegląd zarządzania kluczami, dostępem i przekazaniem odpowiedzialności",
  );
  assert.equal(
    POLISH_OFFERS["OFFSEC-INCIDENT-READY"]?.name,
    "Przegląd gotowości na wypadek incydentu",
  );
  assert.equal(
    POLISH_OFFERS["OFFSEC-PILOT"]?.name,
    "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
  );
  assert.equal(getPolishSkus().length, 5);
});
