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

test("Polish homepage uses the workflow reconstruction positioning and naturalized terminology", () => {
  assert.match(homePage, /<BuyerHomepage locale="pl" \/>/);
  assert.match(buyerHomepage, /Agenci działają\. WitnessOps dostarcza dowody\./);
  assert.match(buyerHomepage, /Sprawdź agenta przed działaniem/);
  assert.match(buyerHomepage, /Zobacz jedno ograniczone działanie/);
  assert.match(buyerHomepage, /Sprawdź, co się wydarzyło/);
  assert.match(buyerHomepage, /Przynieś prawdziwy workflow/);
  assert.match(buyerHomepage, /Pięć pytań\. Jeden ograniczony workflow\./);
  assert.match(buyerHomepage, /Zweryfikowany syntetyczny przykład — nie są to materiały klienta/);
  assert.match(buyerHomepage, /Co pozostaje nierozstrzygnięte\?/);
  assert.match(buyerHomepage, /offerTitle: PRIMARY_OFFER\.name\.pl/);
  assert.match(buyerHomepage, /Zgłoś jeden istotny workflow/);
  assert.match(buyerHomepage, /Uruchom i zweryfikuj demo rotacji skompromitowanego klucza API/);
  assert.match(buyerHomepage, /\/verify\/skill/);
  assert.doesNotMatch(buyerHomepage, /Aegis/);
  assert.doesNotMatch(buyerHomepage, /zewnętrzna weryfikacja/i);
  assert.doesNotMatch(homePage, /Jasny zakres\. Jasny wynik\./);
  assert.doesNotMatch(homePage, /Konkretna dostawa/);
  assert.equal(PRIMARY_OFFER.name.pl, "Agent Workflow Reconstruction");
  assert.equal(PRIMARY_OFFER.price.pl, "€2 500 — cena stała");
  assert.equal(
    PRIMARY_OFFER.unit.pl,
    "Jeden nazwany workflow (agentowy lub zautomatyzowany)",
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
      "Agent Workflow Reconstruction",
      "One Server Security Check",
      "Public Exposure Review",
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
