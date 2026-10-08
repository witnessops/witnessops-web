import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { getPolishSkus, POLISH_OFFERS } from "@/lib/public-i18n";

const homePage = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const buyerHomepage = readFileSync(
  resolve(__dirname, "../../components/marketing/simple-homepage.tsx"),
  "utf-8",
);

test("Polish homepage leads with both approved reviews, no old promotions, and a free check", () => {
  assert.match(homePage, /<SimpleHomepage locale="pl" \/>/);
  assert.match(buyerHomepage, /Zrozum, co mogą zrobić Twoje agenty i co ujawniają Twoje systemy/);
  assert.match(buyerHomepage, /publicPaidReviews\(BUYER_SERVICES\)/);
  assert.match(buyerHomepage, /Omów przegląd agenta AI/);
  assert.match(buyerHomepage, /Omów przegląd ekspozycji/);
  assert.match(buyerHomepage, /Bezpłatne sprawdzenie hosta/);
  assert.match(buyerHomepage, /To nie jest przegląd/);
  assert.match(buyerHomepage, /Nie przesyłaj/);
  assert.doesNotMatch(buyerHomepage, /Internet Footprint Review|Early Bird|€500/);
  assert.equal(PRIMARY_OFFER.price.pl, "Od €2 500 · bez VAT");
});

test("public catalogue uses the approved service names in Polish", () => {
  assert.equal(BUYER_SERVICES.length, 9);
  assert.deepEqual(
    BUYER_SERVICES.map((service) => service.name.pl),
    [
      "Naprawa i przejęcie automatyzacji",
      "Customer Security Review Sprint",
      "Przegląd narzędzi i dostępu agenta AI",
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
