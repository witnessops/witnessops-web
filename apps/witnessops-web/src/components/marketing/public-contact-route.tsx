import { PublicNavigationLink as Link } from "@/components/shared/document-navigation";

import { PRIMARY_OFFER, AUTOMATION_REPAIR_OFFER } from "@/lib/commercial-truth";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GENERAL_HREF,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  productContactSubject,
  publicContactMailto,
} from "@/lib/public-contact";
import {
  POLISH_NO_SECRETS_NOTE,
  type PublicLocale,
} from "@/lib/public-i18n";

interface PublicContactRouteProps {
  productName?: string;
  subject?: "general" | "fit-check";
  compact?: boolean;
  locale?: PublicLocale;
  primaryHref?: string;
}

export function PublicContactRoute({
  productName,
  subject = "general",
  compact = false,
  locale = "en",
  primaryHref: primaryHrefOverride,
}: PublicContactRouteProps) {
  const polish = locale === "pl";
  const primaryHref =
    primaryHrefOverride ??
    (productName
      ? polish
        ? `/pl${PUBLIC_CONTACT_GENERAL_HREF}`
        : PUBLIC_CONTACT_GENERAL_HREF
      : polish
        ? `/pl${PUBLIC_CONTACT_GENERAL_HREF}`
        : PUBLIC_CONTACT_PRIMARY_HREF);
  const primaryOfferSelected =
    new URL(primaryHref, "https://witnessops.com").searchParams.get(
      "offerId",
    ) === PRIMARY_OFFER.id;
  const repairSelected = new URL(primaryHref, "https://witnessops.com").searchParams.get("offerId") === AUTOMATION_REPAIR_OFFER.id;
  const routeHeading = repairSelected ? AUTOMATION_REPAIR_OFFER.name[locale] : primaryOfferSelected
    ? PRIMARY_OFFER.name[locale]
    : polish
      ? "Omów zakres przeglądu"
      : "Scope a review";
  const routeLabel = primaryOfferSelected
    ? polish
      ? "Główny płatny punkt wejścia"
      : "Primary paid entry point"
    : polish
      ? "Ścieżka zgłoszenia"
      : "Request path";
  const generalEnquiry = !new URL(primaryHref, "https://witnessops.com").search;
  const routeCta = generalEnquiry ? (polish ? "Omów zakres przeglądu" : "Scope a review") : repairSelected ? (polish ? "Opisz problem" : "Describe the problem") : (polish ? "Omów zakres przeglądu" : "Scope this review");
  const mailtoSubject = primaryOfferSelected
    ? PRIMARY_OFFER.mailSubject
    : productName
      ? productContactSubject(productName)
      : subject === "fit-check"
        ? PUBLIC_CONTACT_SUBJECTS.fitCheck
        : PUBLIC_CONTACT_SUBJECTS.general;
  const compactSafetyNote = polish
    ? "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, tokenów ani kodów odzyskiwania."
    : "Do not send passwords, private keys, API keys, tokens or recovery codes.";

  if (compact) {
    return (
      <section
        className="border-t border-surface-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
        data-public-contact-route
        data-public-contact-variant="footer"
      >
        <p
          className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {polish ? "W czym możemy pomóc?" : "What do you need help with?"}
        </p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {polish
            ? "Zakres i cenę uzgodnimy przed rozpoczęciem pracy."
            : "We agree scope and price before work begins."}
        </p>
        <Link
          href={primaryHref}
          data-footer-review-cta
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-brand-accent bg-brand-accent px-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {routeCta}
        </Link>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          {polish ? "Lub napisz:" : "Or email:"}{" "}
          <a
            href={publicContactMailto(mailtoSubject)}
            className="inline-flex min-h-11 items-center text-text-primary underline decoration-surface-border-strong underline-offset-4 hover:decoration-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
        </p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          {compactSafetyNote}
        </p>
      </section>
    );
  }

  return (
    <section
      className="border border-surface-border bg-surface-bg p-5"
      data-public-contact-route
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {routeHeading}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {routeLabel}:{" "}
        <Link
          href={primaryHref}
          className="break-all text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
        >
          {primaryHref}
        </Link>
      </p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">
        {polish ? "Kontakt zapasowy:" : "Fallback contact:"}{" "}
        <a
          href={publicContactMailto(mailtoSubject)}
          className="text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
        >
          {PUBLIC_CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-2 text-xs leading-5 text-text-muted">
        {polish ? POLISH_NO_SECRETS_NOTE : PUBLIC_NO_SECRETS_NOTE}
      </p>
    </section>
  );
}
