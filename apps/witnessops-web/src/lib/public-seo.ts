import type { Metadata } from "next";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";

export const CANONICAL_ORIGIN = "https://witnessops.com";

export type PublicLanguagePair = {
  en: string;
  pl: string;
};

export const PUBLIC_LANGUAGE_PAIRS: readonly PublicLanguagePair[] = [
  { en: "/", pl: "/pl" },
  { en: "/catalog", pl: "/pl/catalog" },
  { en: "/library", pl: "/pl/library" },
  {
    en: "/customer-security-review",
    pl: "/pl/customer-security-review",
  },
  { en: "/review/request", pl: "/pl/review/request" },
  { en: "/docs", pl: "/pl/docs" },
  { en: "/support", pl: "/pl/support" },
  { en: "/verify", pl: "/pl/verify" },
  { en: "/why-witnessops", pl: "/pl/why-witnessops" },
  {
    en: "/catalog/offsec-local-audit",
    pl: "/pl/catalog/offsec-local-audit",
  },
  {
    en: "/catalog/offsec-external-exposure",
    pl: "/pl/catalog/offsec-external-exposure",
  },
  {
    en: "/catalog/offsec-launch-ready",
    pl: "/pl/catalog/offsec-launch-ready",
  },
  {
    en: "/catalog/offsec-custody-ops",
    pl: "/pl/catalog/offsec-custody-ops",
  },
  {
    en: "/catalog/offsec-incident-ready",
    pl: "/pl/catalog/offsec-incident-ready",
  },
  {
    en: "/catalog/professional-public-footprint-audit",
    pl: "/pl/catalog/professional-public-footprint-audit",
  },
] as const;

function normalizePathname(pathname: string): string {
  const parsed = new URL(pathname, CANONICAL_ORIGIN);
  const normalized = parsed.pathname || "/";
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

export function canonicalUrl(pathname = "/"): string {
  const normalized = normalizePathname(pathname);
  return normalized === "/"
    ? CANONICAL_ORIGIN
    : new URL(normalized, CANONICAL_ORIGIN).toString();
}

export function languageAlternates(
  canonicalPath: string,
  pair: PublicLanguagePair,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: canonicalUrl(canonicalPath),
    languages: {
      en: canonicalUrl(pair.en),
      pl: canonicalUrl(pair.pl),
      "x-default": canonicalUrl(pair.en),
    },
  };
}

export function languagePairForPath(pathname: string): PublicLanguagePair | undefined {
  const normalized = normalizePathname(pathname);
  return PUBLIC_LANGUAGE_PAIRS.find(
    (pair) => pair.en === normalized || pair.pl === normalized,
  );
}

export function sitemapLanguageAlternates(pathname: string) {
  const pair = languagePairForPath(pathname);
  if (!pair) return undefined;

  return {
    languages: {
      en: canonicalUrl(pair.en),
      pl: canonicalUrl(pair.pl),
      "x-default": canonicalUrl(pair.en),
    },
  };
}

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${CANONICAL_ORIGIN}/#organization`,
  name: "WitnessOps",
  url: canonicalUrl("/"),
} as const;

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${CANONICAL_ORIGIN}/#website`,
  name: "WitnessOps",
  url: canonicalUrl("/"),
  publisher: { "@id": organizationJsonLd["@id"] },
  inLanguage: ["en", "pl"],
} as const;

export function primaryOfferServiceJsonLd() {
  const url = canonicalUrl(PRIMARY_OFFER.route);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: PRIMARY_OFFER.name.en,
    description: PRIMARY_OFFER.situation.en,
    serviceType: "AI agent action security review",
    url,
    provider: { "@id": organizationJsonLd["@id"] },
    offers: {
      "@type": "Offer",
      url,
      price: PRIMARY_OFFER.price.amount,
      priceCurrency: PRIMARY_OFFER.price.currency,
      description: `${PRIMARY_OFFER.price.en}. ${PRIMARY_OFFER.unit.en}. ${PRIMARY_OFFER.fitCheck.en}. ${PRIMARY_OFFER.timing.en}.`,
    },
  } as const;
}

export function primaryOfferBreadcrumbJsonLd() {
  const items = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/catalog" },
    { name: PRIMARY_OFFER.name.en, path: PRIMARY_OFFER.route },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  } as const;
}

export function publicExposureServiceJsonLd(locale: "en" | "pl") {
  const url = canonicalUrl(EXTERNAL_ATTACK_SURFACE_OFFER.route[locale]);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: EXTERNAL_ATTACK_SURFACE_OFFER.name[locale],
    description: EXTERNAL_ATTACK_SURFACE_OFFER.situation[locale],
    serviceType: "External attack surface review",
    url,
    provider: { "@id": organizationJsonLd["@id"] },
    offers: {
      "@type": "Offer",
      url,
      price: EXTERNAL_ATTACK_SURFACE_OFFER.price.amount,
      priceCurrency: EXTERNAL_ATTACK_SURFACE_OFFER.price.currency,
      description: `${EXTERNAL_ATTACK_SURFACE_OFFER.price.en}. ${EXTERNAL_ATTACK_SURFACE_OFFER.timing.en}.`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: EXTERNAL_ATTACK_SURFACE_OFFER.price.amount,
        priceCurrency: EXTERNAL_ATTACK_SURFACE_OFFER.price.currency,
        valueAddedTaxIncluded: EXTERNAL_ATTACK_SURFACE_OFFER.price.vatIncluded,
      },
    },
  } as const;
}

export function publicExposureBreadcrumbJsonLd(locale: "en" | "pl") {
  const isPolish = locale === "pl";
  const items = [
    {
      name: isPolish ? "Strona główna" : "Home",
      path: isPolish ? "/pl" : "/",
    },
    {
      name: isPolish ? "Usługi" : "Services",
      path: isPolish ? "/pl/catalog" : "/catalog",
    },
    {
      name: EXTERNAL_ATTACK_SURFACE_OFFER.name[locale],
      path: EXTERNAL_ATTACK_SURFACE_OFFER.route[locale],
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  } as const;
}
