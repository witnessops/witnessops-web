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

  return (
    <section
      className={
        compact
          ? "border-t border-surface-border pt-4"
          : "border border-surface-border bg-surface-bg p-5"
      }
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
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          {primaryHref}
        </Link>
      </p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">
        {polish ? "Kontakt zapasowy:" : "Fallback contact:"}{" "}
        <a
          href={publicContactMailto(mailtoSubject)}
          className="text-brand-accent underline-offset-4 hover:underline"
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
