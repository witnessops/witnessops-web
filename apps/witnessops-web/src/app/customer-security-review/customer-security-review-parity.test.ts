import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { buyerServiceById } from "@/lib/buyer-services";
import { languageAlternates } from "@/lib/public-seo";

const english = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
const polish = readFileSync(
  resolve(__dirname, "../pl/customer-security-review/page.tsx"),
  "utf-8",
);
const service = buyerServiceById("customer-security-review-sprint");

test("English and Polish Sprint pages preserve equivalent commercial boundaries", () => {
  for (const [enMarker, plMarker] of [
    ["one questionnaire and one product scope", "jeden kwestionariusz i jeden zakres produktu"],
    ["service.price.en", "service.price.pl"],
    ["three working days", "trzech dni roboczych"],
    [
      "The customer owns the final answers, approvals and submission.",
      "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.",
    ],
    ["Start a non-secret fit check", "Rozpocznij wstępną ocenę bez informacji poufnych"],
  ]) {
    assert.ok(english.includes(enMarker), `Missing English parity marker: ${enMarker}`);
    assert.ok(polish.includes(plMarker), `Missing Polish parity marker: ${plMarker}`);
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

test("paired Sprint layouts preserve responsive hierarchy and accessible actions", () => {
  for (const source of [english, polish]) {
    assert.ok(source.includes("md:text-5xl lg:text-6xl"));
    assert.ok(source.includes("sm:grid sm:grid-cols-2 sm:gap-8 lg:block"));
    assert.ok(source.includes("md:grid-cols-2 md:gap-8 lg:gap-10"));
    assert.ok(source.includes("<CtaButton"));
  }

  assert.ok(english.includes('aria-label="Synthetic example response table"'));
  assert.ok(english.includes("min-w-[640px]"));
  assert.match(
    polish,
    /<PublicContactRoute[\s\S]*?subject="fit-check"[\s\S]*?locale="pl"[\s\S]*?primaryHref=\{requestHref\}/,
  );
});
