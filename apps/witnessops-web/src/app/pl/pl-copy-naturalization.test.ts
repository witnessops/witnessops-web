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

test("Polish homepage uses the approved naturalized headline and terminology", () => {
  assert.match(homePage, /<BuyerHomepage locale="pl" \/>/);
  assert.match(buyerHomepage, /Przegląd publicznej ekspozycji/);
  assert.match(buyerHomepage, /Sprawdź, co ujawnia Twój system publiczny\./);
  assert.match(buyerHomepage, /Potrzebujesz innego przeglądu/);
  assert.match(buyerHomepage, /Materiały za każdym wynikiem/);
  assert.match(buyerHomepage, /Zamów przegląd publicznej ekspozycji/);
  assert.doesNotMatch(homePage, /Jasny zakres\. Jasny wynik\./);
  assert.doesNotMatch(homePage, /Konkretna dostawa/);
});

test("public catalogue uses the approved English service names in Polish", () => {
  assert.equal(BUYER_SERVICES.length, 7);
  assert.deepEqual(
    BUYER_SERVICES.map((service) => service.name.pl),
    [
      "Customer Security Review Sprint",
      "Bounded Workflow Review",
      "One Server Security Check",
      "Przegląd publicznej ekspozycji",
      "Launch Readiness Check",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
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
  // Pilot remains available for custom quote pages, not primary catalogue.
  assert.ok(POLISH_OFFERS["OFFSEC-PILOT"]?.name);
  assert.equal(getPolishSkus().length, 6);
});
