import Link from "next/link";

import {
  PUBLIC_CONTACT_EMAIL,
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
}

export function PublicContactRoute({
  productName,
  subject = "general",
  compact = false,
  locale = "en",
}: PublicContactRouteProps) {
  const polish = locale === "pl";
  const primaryHref = polish ? "/pl/review/request" : PUBLIC_CONTACT_PRIMARY_HREF;
  const mailtoSubject = productName
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
        className="border-t border-surface-border pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
        data-public-contact-route
        data-public-contact-variant="footer"
      >
        <p
          className="text-sm font-semibold uppercase tracking-[0.14em] text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {polish ? "Rozpocznij przegląd" : "Start a review"}
        </p>
        <p className="mt-2 text-xs leading-5 text-text-muted">
          {polish ? "Główna ścieżka" : "Primary route"}
        </p>
        <Link
          href={primaryHref}
          className="mt-1 inline-flex min-h-11 w-full items-center justify-center border border-brand-accent bg-brand-accent px-4 text-sm font-semibold uppercase tracking-[0.12em] text-text-inverse shadow-[0_8px_24px_rgba(242,122,61,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_30px_rgba(242,122,61,0.28)] active:translate-y-0 active:scale-[0.985] active:shadow-[0_5px_16px_rgba(242,122,61,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg motion-reduce:transform-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {polish ? "Rozpocznij przegląd" : "Start a review"}
        </Link>
        <p className="mt-3 text-xs leading-5 text-text-secondary">
          {polish ? "Kontakt zapasowy:" : "Fallback contact:"}{" "}
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
        {polish ? "Rozpocznij przegląd" : "Start a review"}
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        {polish ? "Główna ścieżka:" : "Primary route:"}{" "}
        <Link
          href={primaryHref}
          className="text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
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
