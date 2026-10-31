import type { Metadata } from "next";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { plainOfferPrice } from "@/lib/offer-price-unit";

export const CANONICAL_ORIGIN = "https://witnessops.com";

export type PublicLanguagePair = {
  en: string;
  pl: string;
};

export const PUBLIC_LANGUAGE_PAIRS: readonly PublicLanguagePair[] = [
  { en: "/", pl: "/pl" },
  { en: "/reviews", pl: "/pl/reviews" },
  {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  },
  { en: "/library", pl: "/pl/library" },
  { en: "/contact", pl: "/pl/contact" },
  { en: "/docs", pl: "/pl/docs" },
  { en: "/support", pl: "/pl/support" },
  { en: "/verify", pl: "/pl/verify" },
  { en: "/why-witnessops", pl: "/pl/why-witnessops" },
  { en: "/company", pl: "/pl/company" },
  { en: "/privacy", pl: "/pl/privacy" },
  { en: "/terms", pl: "/pl/terms" },
  { en: "/security", pl: "/pl/security" },
  { en: "/media-kit", pl: "/pl/media-kit" },
  {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
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

export function publicExposureServiceJsonLd(locale: "en" | "pl") {
  const url = canonicalUrl(EXTERNAL_ATTACK_SURFACE_OFFER.route[locale]);
  const polish = locale === "pl";
  const description = polish
    ? "External Attack Surface Review nie jest już dostępny dla nowych zleceń. To nie jest Agent Action Security Review. To nie jest test penetracyjny."
    : "External Attack Surface Review is no longer available for new engagements. It is not the Agent Action Security Review. It is not a penetration test.";

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: EXTERNAL_ATTACK_SURFACE_OFFER.name[locale],
    description,
    serviceType: "External attack surface review",
    url,
    provider: { "@id": organizationJsonLd["@id"] },
    offers: {
      "@type": "Offer",
      url,
      availability: "https://schema.org/Discontinued",
      description: polish
        ? "Nie jest już dostępny dla nowych zleceń."
        : "No longer available for new engagements.",
    },
  } as const;
}

export function homepageReviewsJsonLd() {
  const reviews = [
    {
      name: PUBLIC_AGENT_ACTION_OFFER.name.en,
      price: PUBLIC_AGENT_ACTION_OFFER.price.amount,
      url: canonicalUrl("/reviews/agent-action-security-review"),
    },
  ] as const;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "WitnessOps reviews",
    itemListElement: reviews.map((review, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: review.name,
        url: review.url,
        provider: { "@id": organizationJsonLd["@id"] },
        offers: {
          "@type": "Offer",
          price: review.price,
          priceCurrency: "EUR",
          valueAddedTaxIncluded: false,
        },
      },
    })),
  } as const;
}

/** The active fixed-scope review; historical offer schemas keep their own identity. */
export function agentActionServiceJsonLd(locale: "en" | "pl") {
  const offer = PUBLIC_AGENT_ACTION_OFFER;
  const url = canonicalUrl(locale === "pl"
    ? "/pl/reviews/agent-action-security-review"
    : "/reviews/agent-action-security-review");
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: offer.name[locale],
    description: `${offer.unit[locale]}. ${offer.timing[locale]}.`,
    serviceType: "Agent action security review",
    url,
    provider: { "@id": organizationJsonLd["@id"] },
    offers: {
      "@type": "Offer",
      url,
      price: offer.price.amount,
      priceCurrency: offer.price.currency,
      valueAddedTaxIncluded: false,
      description: `${plainOfferPrice(offer.price[locale])}. ${offer.timing[locale]}.`,
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
      path: isPolish ? "/pl/reviews" : "/reviews",
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
