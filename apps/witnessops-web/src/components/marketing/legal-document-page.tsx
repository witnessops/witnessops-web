import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@witnessops/ui/mdx";
import styles from "@/app/footer-pages.module.css";
import {
  COMPANY_DETAILS,
  COMPANY_DETAILS_HREF,
  type CompanyDetailsLocale,
} from "@/lib/company-details";
import {
  loadLegalPage,
  type LegalLocale,
} from "@/lib/content";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  publicContactMailto,
} from "@/lib/public-contact";
import { languageAlternates } from "@/lib/public-seo";

const LEGAL_SLUGS = ["privacy", "terms", "security"] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const NAV_LABEL: Record<LegalLocale, Record<LegalSlug, string>> = {
  en: { privacy: "Privacy", terms: "Terms", security: "Security" },
  pl: { privacy: "Prywatność", terms: "Warunki", security: "Bezpieczeństwo" },
};

const FALLBACK_TITLE: Record<LegalLocale, Record<LegalSlug, string>> = {
  en: {
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    security: "Security",
  },
  pl: {
    privacy: "Polityka prywatności",
    terms: "Warunki świadczenia usług",
    security: "Bezpieczeństwo",
  },
};

const FALLBACK_DESCRIPTION: Record<LegalLocale, Record<LegalSlug, string>> = {
  en: {
    privacy: "WitnessOps privacy policy.",
    terms: "WitnessOps terms of service.",
    security: "WitnessOps security practices and reporting policy.",
  },
  pl: {
    privacy: "Polityka prywatności WitnessOps.",
    terms: "Warunki świadczenia usług WitnessOps.",
    security: "Praktyki bezpieczeństwa i zasady zgłaszania podatności WitnessOps.",
  },
};

const ENTITY_COPY = {
  en: {
    controllerHeading: "Controller",
    providerHeading: "Provider",
    controller:
      "The controller for personal data described on this page is",
    provider: "The provider of this website is",
    contact: "Contact",
    related: "Related Legal Documents",
    policies: "Policies",
  },
  pl: {
    controllerHeading: "Administrator",
    providerHeading: "Usługodawca",
    controller: "Administratorem danych osobowych opisanych na tej stronie jest",
    provider: "Usługodawcą tej strony jest",
    contact: "Kontakt",
    related: "Powiązane dokumenty",
    policies: "Dokumenty",
  },
} as const;

const TRUST_COPY: Record<
  LegalLocale,
  Record<"legal" | "security", { title: string; body: string[] }>
> = {
  en: {
    legal: {
      title: "Trust Boundary",
      body: [
        "WitnessOps provides integrity and lineage evidence for published artifacts.",
        "Verification confirms integrity of the artifact, not correctness of the underlying action, safety of the target system, or trustworthiness of the issuer.",
      ],
    },
    security: {
      title: "Trust Boundary",
      body: [
        "WitnessOps improves auditability through governed execution, signed receipts, and tamper-evident evidence bindings.",
        "These controls do not eliminate external trust assumptions such as host integrity, tool correctness, or key custody.",
      ],
    },
  },
  pl: {
    legal: {
      title: "Granica zaufania",
      body: [
        "WitnessOps dostarcza dowody integralności i pochodzenia opublikowanych artefaktów.",
        "Weryfikacja potwierdza integralność artefaktu, a nie poprawność działania, bezpieczeństwo systemu ani wiarygodność wystawcy.",
      ],
    },
    security: {
      title: "Granica zaufania",
      body: [
        "WitnessOps zwiększa możliwość audytu przez nadzorowane wykonanie, podpisane zapisy i wiązania dowodowe odporne na manipulację.",
        "Te mechanizmy nie usuwają zewnętrznych założeń zaufania, takich jak integralność hosta, poprawność narzędzi czy piecza nad kluczami.",
      ],
    },
  },
};

function legalPath(locale: LegalLocale, slug: LegalSlug): string {
  return locale === "pl" ? `/pl/${slug}` : `/${slug}`;
}

export function legalPageMetadata(slug: LegalSlug, locale: LegalLocale): Metadata {
  const doc = loadLegalPage(slug, locale);
  const path = legalPath(locale, slug);
  return {
    title: doc?.title ?? FALLBACK_TITLE[locale][slug],
    description: doc?.description ?? FALLBACK_DESCRIPTION[locale][slug],
    alternates: languageAlternates(path, {
      en: `/${slug}`,
      pl: `/pl/${slug}`,
    }),
  };
}

export function LegalEntityNotice({
  locale,
  role,
}: {
  locale: CompanyDetailsLocale;
  role: "controller" | "provider";
}) {
  const company = COMPANY_DETAILS[locale];
  const copy = ENTITY_COPY[locale];
  const lines = [
    company.legalName,
    company.address,
    company.krs,
    company.nip,
    company.regon,
  ];

  return (
    <section
      aria-label={role === "controller" ? copy.controllerHeading : copy.providerHeading}
      data-legal-entity={role}
      data-legal-entity-locale={locale}
      className="mb-10 min-w-0 max-w-full border border-surface-border bg-surface-card p-5"
    >
      <h2 className="text-xl font-semibold text-text-primary">
        {role === "controller" ? copy.controllerHeading : copy.providerHeading}
      </h2>
      <p className="mt-3 text-base leading-7 text-text-secondary">
        {role === "controller" ? copy.controller : copy.provider}
      </p>
      <div className="mt-4 min-w-0 max-w-full space-y-2 text-sm leading-6 break-words text-text-secondary">
        {lines.map((line) => (
          <p
            key={line}
            className="min-w-0 max-w-full break-words"
            {...(line === company.krs ? { "data-company-registry": "" } : {})}
          >
            {line}
          </p>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6">
        <Link
          href={COMPANY_DETAILS_HREF[locale]}
          className="inline-flex min-h-11 items-center text-brand-accent underline underline-offset-4"
        >
          {company.heading}
        </Link>
      </p>
      <p className="text-sm leading-6 text-text-secondary">
        {copy.contact}{" "}
        <a
          href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general)}
          className="inline-flex min-h-11 items-center break-all font-semibold text-brand-accent underline underline-offset-4"
        >
          {PUBLIC_CONTACT_EMAIL}
        </a>
      </p>
    </section>
  );
}

export function LegalDocumentPage({
  slug,
  locale,
}: {
  slug: LegalSlug;
  locale: LegalLocale;
}) {
  const doc = loadLegalPage(slug, locale);
  if (!doc) notFound();

  const copy = ENTITY_COPY[locale];
  const related = LEGAL_SLUGS.filter((entry) => entry !== slug).flatMap((entry) => {
    const relatedDoc = loadLegalPage(entry, locale);
    return relatedDoc ? [{ slug: entry, doc: relatedDoc }] : [];
  });
  const role = slug === "privacy" ? "controller" : slug === "terms" ? "provider" : null;
  const trustVariant = doc.trustBoundaryVariant === "security"
    ? "security"
    : doc.trustBoundaryVariant === "legal"
      ? "legal"
      : null;
  const trust = trustVariant ? TRUST_COPY[locale][trustVariant] : null;

  return (
    <main id="main-content" tabIndex={-1} className={styles.legalPage} data-legal-page={slug} data-legal-locale={locale}>
      <nav className={styles.policyNav} aria-label={copy.policies}>
        {LEGAL_SLUGS.map((entry) => (
          <Link
            key={entry}
            href={legalPath(locale, entry)}
            aria-current={entry === slug ? "page" : undefined}
          >
            {NAV_LABEL[locale][entry]}
          </Link>
        ))}
      </nav>
      <header className={styles.legalHeader}>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{doc.description}</p>
      </header>
      <div className={styles.legalBody}>
        {role ? <LegalEntityNotice locale={locale} role={role} /> : null}
        <MarkdownContent source={doc.body} />
        {trust ? (
          <aside className="callout callout-trust mt-8" aria-label={trust.title}>
            <div className="callout-title">{trust.title}</div>
            {trust.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </aside>
        ) : null}
      </div>
      {related.length > 0 ? (
        <section className={styles.relatedPolicies}>
          <h2 className="text-xl font-semibold text-text-primary">{copy.related}</h2>
          <div className={styles.relatedGrid}>
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={legalPath(locale, entry.slug)}
                className="block rounded-md border border-surface-border bg-surface-card p-4 transition-colors hover:border-brand-accent/30"
              >
                <h3 className="font-medium text-text-primary">{NAV_LABEL[locale][entry.slug]}</h3>
                <p className="mt-1 text-sm text-text-secondary">{entry.doc.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
