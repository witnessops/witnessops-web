import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buyerRequestHref,
  buyerServiceById,
  buyerServiceRequestHref,
} from "@/lib/buyer-services";
import { getServiceLanding } from "@/lib/service-landings";
import { PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL } from "./professional-public-footprint-audit";

const audit = buyerServiceById("professional-public-footprint-audit");
const publicExposure = buyerServiceById("external-exposure-assessment");
const catalogueSource = readFileSync(
  resolve(__dirname, "../components/marketing/buyer-catalogue.tsx"),
  "utf8",
);
const pricingSource = readFileSync(
  resolve(__dirname, "../app/(marketing)/pricing/page.tsx"),
  "utf8",
);

test("public footprint audit has the exact request-only commercial contract", () => {
  assert.equal(audit.name.en, "Professional Public Footprint Audit");
  assert.equal(audit.name.pl, "Audyt publicznego śladu zawodowego");
  assert.equal(audit.availability?.status, "available_by_request");
  assert.equal(audit.availability?.label.en, "Available by request");
  assert.equal(audit.availability?.label.pl, "Dostępny na zapytanie");
  assert.equal(audit.price.en, "€4,900 · excluding VAT");
  assert.equal(audit.price.pl, "4 900 EUR · bez VAT");
  assert.equal(audit.timing.en, "7–10 working days");
  assert.equal(audit.timing.pl, "7–10 dni roboczych");
  assert.equal(audit.requestCta?.en, "Request this audit");
  assert.equal(audit.requestCta?.pl, "Zapytaj o audyt");
  assert.equal(audit.homepageFeatured, false);
  assert.equal(audit.pricingVisible, false);
});

test("public footprint audit uses an allowlisted selected-offer route without payment semantics", () => {
  assert.equal(audit.productId, undefined);
  assert.equal(buyerRequestHref("en"), "/review/request");
  assert.equal(buyerRequestHref("pl"), "/pl/review/request");
  assert.match(
    buyerServiceRequestHref("en", audit),
    /^\/review\/request\?offerId=professional-public-footprint-audit&/,
  );
  assert.match(
    buyerServiceRequestHref("pl", audit),
    /^\/pl\/review\/request\?offerId=professional-public-footprint-audit&/,
  );
  assert.doesNotMatch(JSON.stringify(audit), /stripe|checkout|payment[_-]?link/i);
  assert.match(catalogueSource, /buyerServiceRequestHref\(locale, service\)/);
  assert.match(pricingSource, /service\.pricingVisible !== false/);
});

test("public footprint audit preserves consent, source and bounded-claim limits", () => {
  for (const locale of ["en", "pl"] as const) {
    const landing = getServiceLanding(audit.id, locale);
    assert.equal(landing.deliverables.length, 7);
    assert.equal(landing.scopeLimits?.length, 4);
    assert.match(landing.boundaries.join(" "), /authori[sz]|upoważnienie/i);
    assert.match(landing.boundaries.join(" "), /public|publicznych/i);
    assert.match(landing.boundaries.join(" "), /whole internet|cały internet/i);
    assert.equal(PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL[locale].notIncluded.length, 10);
  }

  assert.deepEqual(PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.notIncluded, [
    "Private-life investigation or investigation of unrelated family members",
    "Confidential-client identification or deanonymisation",
    "Contact with employers, clients, counterparties or institutions",
    "Residential-address publication",
    "Friendship or political-influence inference",
    "Content removal or suppression",
    "SEO or reputation-management campaigns",
    "Ongoing monitoring",
    "Legal advice",
    "Proof of professional competence beyond what cited public evidence establishes",
  ]);
  assert.deepEqual(PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.pl.notIncluded, [
    "Badanie życia prywatnego lub niezwiązanych z celem członków rodziny",
    "Identyfikowanie lub deanonimizacja poufnych klientów",
    "Kontakt z pracodawcami, klientami, kontrahentami lub instytucjami",
    "Publikowanie adresu zamieszkania",
    "Wnioskowanie o przyjaźniach lub wpływach politycznych",
    "Usuwanie lub ukrywanie treści",
    "Kampanie SEO lub zarządzania reputacją",
    "Ciągły monitoring",
    "Porady prawne",
    "Potwierdzanie kompetencji zawodowych ponad to, co wynika z przytoczonych publicznych źródeł",
  ]);

  assert.match(PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.claim, /stated research date/);
  assert.match(PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.claim, /cannot establish/);
  assert.match(
    PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.verificationPath,
    /Material conclusions are mapped to attributable public sources/,
  );
  assert.match(
    PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.notIncluded.join(" "),
    /Private-life investigation/,
  );
  assert.match(
    PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en.notIncluded.join(" "),
    /Legal advice/,
  );
});

test("External Attack Surface Review remains current, off the homepage, and commercially unchanged", () => {
  assert.equal(publicExposure.homepageFeatured, false);
  assert.equal(publicExposure.productId, "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(
    publicExposure.price.en,
    "€1,900 · excluding VAT",
  );
  assert.equal(
    publicExposure.commercialContract.price,
    "eur_1900_ex_vat_one_authorised_public_facing_system",
  );
});
