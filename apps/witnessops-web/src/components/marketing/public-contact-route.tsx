import Link from "next/link";

import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_PRIMARY_HREF,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  productContactSubject,
  publicContactMailto,
} from "@/lib/public-contact";

interface PublicContactRouteProps {
  productName?: string;
  subject?: "general" | "fit-check";
  compact?: boolean;
}

export function PublicContactRoute({
  productName,
  subject = "general",
  compact = false,
}: PublicContactRouteProps) {
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
        Tell us what happened
      </p>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        Primary route:{" "}
        <Link
          href={PUBLIC_CONTACT_PRIMARY_HREF}
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          /review/request
        </Link>
      </p>
      <p className="mt-1 text-sm leading-6 text-text-secondary">
        Fallback contact:{" "}
        <a
          href={publicContactMailto(mailtoSubject)}
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          {PUBLIC_CONTACT_EMAIL}
        </a>
      </p>
      <p className="mt-2 text-xs leading-5 text-text-muted">
        {PUBLIC_NO_SECRETS_NOTE}
      </p>
    </section>
  );
}
