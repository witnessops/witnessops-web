import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { getPolishSkus, POLISH_OFFERS } from "@/lib/public-i18n";

const homePage = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const buyerHomepage = readFileSync(
  resolve(__dirname, "../../components/marketing/buyer-homepage.tsx"),
  "utf-8",
);

test("Polish homepage uses action-security positioning and naturalized terminology", () => {
  assert.match(homePage, /<BuyerHomepage locale="pl" \/>/);
  assert.equal(
    PRIMARY_OFFER.cardSituation.pl,
    "Co Twój agent AI może naprawdę zrobić w produkcji?",
  );
  assert.match(buyerHomepage, /PRIMARY_OFFER\.cardSituation\.pl/);
  assert.match(buyerHomepage, /eyebrow: PRIMARY_OFFER\.name\.pl/);
  assert.match(buyerHomepage, /zanim luki znajdzie za Ciebie klient, pentest lub incydent/);
  assert.match(buyerHomepage, /Upoważnienie → tożsamość/);
  assert.match(buyerHomepage, /Uprawnienia → narzędzia/);
  assert.match(buyerHomepage, /Wykonanie → dowody/);
  assert.match(buyerHomepage, /Pięć pytań\. Jedno istotne działanie\./);
  assert.match(buyerHomepage, /Zweryfikowany syntetyczny przykład — nie są to materiały klienta/);
  assert.match(buyerHomepage, /Jaki ślad dowodowy pozostaje\?/);
  assert.match(buyerHomepage, /granice uprawnień/);
  assert.doesNotMatch(buyerHomepage, /granica przywilejów|granice przywilejów/);
  assert.match(buyerHomepage, /offerTitle: PRIMARY_OFFER\.name\.pl/);
  assert.match(buyerHomepage, /Zgłoś jedno istotne działanie/);
  assert.match(buyerHomepage, /Uruchom i zweryfikuj demo rotacji skompromitowanego klucza API/);
  assert.doesNotMatch(buyerHomepage, /Agent Workflow Reconstruction/);
  assert.doesNotMatch(buyerHomepage, /Aegis/);
  assert.doesNotMatch(buyerHomepage, /zewnętrzna weryfikacja/i);
  assert.doesNotMatch(homePage, /Jasny zakres\. Jasny wynik\./);
  assert.doesNotMatch(homePage, /Konkretna dostawa/);
  assert.equal(PRIMARY_OFFER.name.pl, "Agent Action Security Review");
  assert.equal(PRIMARY_OFFER.price.pl, "€2 500 — cena stała");
  assert.equal(
    PRIMARY_OFFER.unit.pl,
    "Jedno istotne działanie agenta lub automatyzacji",
  );
  assert.equal(
    PRIMARY_OFFER.fitCheck.pl,
    "Najpierw wstępna ocena bez informacji poufnych",
  );
  assert.equal(
    PRIMARY_OFFER.timing.pl,
    "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
  );
});

test("public catalogue uses the approved service names in Polish", () => {
  assert.equal(BUYER_SERVICES.length, 8);
  assert.deepEqual(
    BUYER_SERVICES.map((service) => service.name.pl),
    [
      "Customer Security Review Sprint",
      "Agent Action Security Review",
      "One Server Security Check",
      "External Attack Surface Review",
      "Launch Readiness Check",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
      "Audyt publicznego śladu zawodowego",
    ],
  );
  assert.ok(!BUYER_SERVICES.some((service) => service.productId === "OFFSEC-PILOT"));
});

test("detailed Polish offer routes retain extended technical copy under buyer names", () => {
  assert.ok(POLISH_OFFERS["OFFSEC-LOCAL-AUDIT"]?.name);
  assert.ok(POLISH_OFFERS["OFFSEC-EXTERNAL-EXPOSURE"]?.name);
  assert.ok(POLISH_OFFERS["OFFSEC-LAUNCH-READY"]?.name);
  assert.ok(POLISH_OFFERS["OFFSEC-CUSTODY-OPS"]?.name);
  assert.ok(POLISH_OFFERS["OFFSEC-INCIDENT-READY"]?.name);
  // Pilot copy is retained as unresolved, but it is not a public sitemap route.
  assert.ok(POLISH_OFFERS["OFFSEC-PILOT"]?.name);
  assert.equal(getPolishSkus().length, 5);
});
