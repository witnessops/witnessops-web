import Link from "next/link";
import { headers } from "next/headers";

import {
  DOCUMENT_LANGUAGE_HEADER,
  parseDocumentLanguage,
} from "@/lib/request-language";

const LINKS = {
  en: [
    {
      href: "/catalog#agent-action-security-review",
      label: "Agent Action Security Review",
    },
    {
      href: "/catalog/offsec-external-exposure",
      label: "External Attack Surface Review",
    },
    { href: "/contact", label: "Contact" },
  ],
  pl: [
    {
      href: "/pl/catalog#agent-action-security-review",
      label: "Agent Action Security Review",
    },
    {
      href: "/pl/catalog/offsec-external-exposure",
      label: "External Attack Surface Review",
    },
    { href: "/pl/contact", label: "Kontakt" },
  ],
} as const;

export default async function NotFound() {
  const headerStore = await headers();
  const polish =
    parseDocumentLanguage(headerStore.get(DOCUMENT_LANGUAGE_HEADER)) === "pl";
  const links = polish ? LINKS.pl : LINKS.en;

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="not-found">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          404
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-text-primary md:text-5xl">
          {polish ? "Nie znaleziono strony" : "Page not found"}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
          {polish
            ? "Ten adres nie prowadzi do strony WitnessOps. Aktualne przeglądy i kontakt są poniżej."
            : "This address is not a WitnessOps page. The current reviews and contact are below."}
        </p>
        <ul className="mt-8 space-y-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-base font-semibold text-brand-accent underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
