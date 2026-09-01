import type { Metadata } from "next";

import { PRIMARY_OFFER } from "@/lib/commercial-truth";

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
    serviceType: "Agent workflow reconstruction",
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
  const url = canonicalUrl(
    locale === "pl"
      ? "/pl/catalog/offsec-external-exposure"
      : "/catalog/offsec-external-exposure",
  );

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: "Public Exposure Review",
    description:
      locale === "pl"
        ? "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego."
        : "A fixed-scope external security review of one authorised public-facing system.",
    serviceType: "Fixed-scope external security review",
    url,
    provider: { "@id": organizationJsonLd["@id"] },
    offers: {
      "@type": "Offer",
      url,
      price: "1900",
      priceCurrency: "EUR",
      description: "€1,900 excluding VAT for one authorised public-facing system.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "1900",
        priceCurrency: "EUR",
        valueAddedTaxIncluded: false,
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
      name: "Public Exposure Review",
      path: isPolish
        ? "/pl/catalog/offsec-external-exposure"
        : "/catalog/offsec-external-exposure",
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
