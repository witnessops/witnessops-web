import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_ORIGIN,
  PUBLIC_LANGUAGE_PAIRS,
  canonicalUrl,
  languageAlternates,
  languagePairForPath,
  organizationJsonLd,
  publicExposureBreadcrumbJsonLd,
  publicExposureServiceJsonLd,
  websiteJsonLd,
} from "./public-seo";

test("canonical URLs always use the HTTPS apex and drop query tracking", () => {
  assert.equal(CANONICAL_ORIGIN, "https://witnessops.com");
  assert.equal(canonicalUrl("/"), "https://witnessops.com");
  assert.equal(canonicalUrl("/catalog?utm_source=test"), "https://witnessops.com/catalog");
  assert.equal(canonicalUrl("https://www.witnessops.com/pl#offer"), "https://witnessops.com/pl");
});

test("language pairs are unique, reciprocal, self-referencing, and absolute", () => {
  const seen = new Set<string>();

  for (const pair of PUBLIC_LANGUAGE_PAIRS) {
    assert.equal(seen.has(pair.en), false, `duplicate EN path ${pair.en}`);
    assert.equal(seen.has(pair.pl), false, `duplicate PL path ${pair.pl}`);
    seen.add(pair.en);
    seen.add(pair.pl);

    assert.deepEqual(languagePairForPath(pair.en), pair);
    assert.deepEqual(languagePairForPath(pair.pl), pair);
    assert.deepEqual(languageAlternates(pair.en, pair), {
      canonical: canonicalUrl(pair.en),
      languages: {
        en: canonicalUrl(pair.en),
        pl: canonicalUrl(pair.pl),
        "x-default": canonicalUrl(pair.en),
      },
    });
  }
});

test("structured trust data is factual and syntactically serializable", () => {
  const service = publicExposureServiceJsonLd("en");
  const breadcrumbs = publicExposureBreadcrumbJsonLd("en");
  const documents = [organizationJsonLd, websiteJsonLd, service, breadcrumbs];

  for (const document of documents) {
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(document)));
  }
  assert.equal(organizationJsonLd.name, "WitnessOps");
  assert.equal("legalName" in organizationJsonLd, false);
  assert.equal(service.offers.price, "1900");
  assert.equal(
    service.description,
    "A fixed-scope external security review of one authorised public-facing system.",
  );
  assert.equal(
    publicExposureServiceJsonLd("pl").description,
    "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego.",
  );
  assert.equal(service.offers.priceCurrency, "EUR");
  assert.equal(service.offers.priceSpecification.valueAddedTaxIncluded, false);
  assert.equal("inLanguage" in service, false);
  assert.equal(breadcrumbs.itemListElement.length, 3);
});
