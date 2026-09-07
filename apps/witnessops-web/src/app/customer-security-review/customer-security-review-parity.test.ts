import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buyerServiceById } from "@/lib/buyer-services";
import { getServiceLanding } from "@/lib/service-landings";
import { languageAlternates } from "@/lib/public-seo";

const english = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const polish = readFileSync(
  resolve(__dirname, "../pl/customer-security-review/page.tsx"),
  "utf-8",
);
const service = buyerServiceById("customer-security-review-sprint");

test("English and Polish Sprint pages preserve equivalent commercial boundaries", () => {
  for (const [locale, source] of [["en", english], ["pl", polish]] as const) {
    assert.ok(source.includes(`<BuyerServiceDetail locale="${locale}" service={service}`));
    const landing = getServiceLanding(service.id, locale);
    assert.match(service.timing[locale], locale === "en" ? /three working days/ : /trzech dni roboczych/);
    assert.ok(landing.boundaries.some((line) => line.includes(locale === "en"
      ? "The customer owns the final answers, approvals and submission."
      : "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.")));
    assert.equal(landing.primaryCta, locale === "en" ? "Scope this review" : "Omów zakres przeglądu");
    assert.match(landing.commercialNote ?? "", locale === "en" ? /non-secret fit check/ : /bez informacji poufnych/);
  }
  assert.equal(service.price.en, "From €1,600 · excluding VAT");
  assert.equal(service.price.pl, "Od 7 000 zł (ok. €1 600) · bez VAT");
});

test("paired Sprint routes declare only en, pl and x-default alternates", () => {
  for (const source of [english, polish]) {
    assert.match(source, /en: "\/customer-security-review"/);
    assert.match(source, /pl: "\/pl\/customer-security-review"/);
  }

  assert.deepEqual(
    languageAlternates("/customer-security-review", {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
    }).languages,
    {
      en: "https://witnessops.com/customer-security-review",
      pl: "https://witnessops.com/pl/customer-security-review",
      "x-default": "https://witnessops.com/customer-security-review",
    },
  );
});

test("paired Sprint layouts share accessible actions and retain the labelled specimen", () => {
  const shared = readFileSync(resolve(__dirname, "../../components/marketing/buyer-service-detail.tsx"), "utf-8");
  assert.match(shared, /buyerServiceRequestHref\(locale, service\)/);
  assert.match(shared, /buyerCatalogHref\(locale\)/);
  assert.match(shared, /<summary className=\{summaryClass\}/);
  assert.ok(english.includes('aria-label="Synthetic example response table"'));
  assert.ok(english.includes("min-w-[640px]"));
  assert.ok(english.includes("SYNTHETIC DEMONSTRATION, NOT CUSTOMER EVIDENCE"));
});
