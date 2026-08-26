import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { BUYER_SERVICES } from "@/lib/buyer-services";
import { getPolishSkus, POLISH_OFFERS } from "@/lib/public-i18n";

const homePage = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const buyerHomepage = readFileSync(
  resolve(__dirname, "../../components/marketing/buyer-homepage.tsx"),
  "utf-8",
);

test("Polish homepage uses the agent-proof positioning and naturalized terminology", () => {
  assert.match(homePage, /<BuyerHomepage locale="pl" \/>/);
  assert.match(buyerHomepage, /Agents act\. WitnessOps proves\./);
  assert.match(buyerHomepage, /Podpisane potwierdzenia i zewnętrzna weryfikacja istotnych działań agentów AI/);
  assert.match(buyerHomepage, /Agenci AI stają się niewidocznymi operatorami/);
  assert.match(buyerHomepage, /Nadzieja nie jest artefaktem audytowym/);
  assert.match(buyerHomepage, /Agent Risk & Control Review/);
  assert.match(buyerHomepage, /Przynieś jeden workflow/);
  assert.doesNotMatch(homePage, /Jasny zakres\. Jasny wynik\./);
  assert.doesNotMatch(homePage, /Konkretna dostawa/);
});

test("public catalogue uses the approved service names in Polish", () => {
  assert.equal(BUYER_SERVICES.length, 8);
  assert.deepEqual(
    BUYER_SERVICES.map((service) => service.name.pl),
    [
      "Customer Security Review Sprint",
      "Agent Risk & Control Review",
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
