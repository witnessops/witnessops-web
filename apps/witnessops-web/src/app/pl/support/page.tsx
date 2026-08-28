import type { Metadata } from "next";
import Link from "next/link";
import {
  PUBLIC_CONTACT_EMAIL,
  publicContactMailto,
} from "@/lib/public-contact";
import { POLISH_NO_SECRETS_NOTE } from "@/lib/public-i18n";
import { languageAlternates } from "@/lib/public-seo";

const SECURITY_CONTACT_EMAIL = "security@witnessops.com";
const SUPPORT_MAILTO = publicContactMailto("WitnessOps support request");

export const metadata: Metadata = {
  title: "Wsparcie",
  description: "Wybierz właściwą drogę kontaktu z WitnessOps.",
  alternates: languageAlternates("/pl/support", {
    en: "/support",
    pl: "/pl/support",
  }),
};

const routes = [
  [
    "Chcę rozpocząć przegląd",
    "/pl/review/request",
    "Opisz sytuację bez danych poufnych i wybierz ofertę.",
  ],
  [
    "Mam istniejące zgłoszenie",
    "#contact",
    "Napisz z tego samego adresu służbowego i podaj identyfikator zgłoszenia.",
  ],
  [
    "Potrzebuję pomocy ze sprawdzeniem dostawy",
    "/pl/verify",
    "Prześlij lub wklej JSON zapisu i odczytaj wynik — albo zadaj pytanie o ograniczenia.",
  ],
  [
    "Otrzymałem nieoczekiwaną wiadomość od WitnessOps",
    "#contact",
    "Nie otwieraj załączników. Prześlij wyłącznie niepoufne dane nagłówka wiadomości.",
  ],
] as const;

export default function PolishSupportPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-4xl px-6 py-12"
    >
      <header className="border-b border-surface-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Wsparcie
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary">
          W czym możemy pomóc?
        </h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          Wybierz sytuację. Nowy przegląd zawsze zaczyna się od ogólnego opisu
          bez danych poufnych.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {routes.map(([title, href, body]) => (
          <Link
            key={title}
            href={href}
            className="border border-surface-border p-5 hover:border-brand-accent"
          >
            <h2 className="font-semibold text-text-primary">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 border border-signal-red/30 p-5">
        <h2 className="font-semibold text-text-primary">
          Znalazłem podatność bezpieczeństwa
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Prywatne zgłoszenia podatności kieruj wyłącznie na{" "}
          <a
            className="text-brand-accent hover:underline"
            href={`mailto:${SECURITY_CONTACT_EMAIL}?subject=${encodeURIComponent("Private vulnerability report")}`}
          >
            {SECURITY_CONTACT_EMAIL}
          </a>
          . Ten adres nie służy do zwykłych zgłoszeń klientów.
        </p>
        <p className="mt-3 text-sm text-text-muted">
          {POLISH_NO_SECRETS_NOTE}
        </p>
      </section>

      <section
        id="contact"
        className="mt-8 border border-surface-border bg-surface-bg p-5"
        aria-labelledby="polish-support-contact-title"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Kontakt ze wsparciem
        </p>
        <h2
          id="polish-support-contact-title"
          className="mt-2 text-xl font-semibold text-text-primary"
        >
          Napisz z właściwego adresu służbowego
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          W wiadomości podaj identyfikator istniejącego zgłoszenia lub krótki,
          niepoufny opis problemu. Nie wysyłaj załączników, gdy wiadomość była
          nieoczekiwana.
        </p>
        <a
          href={SUPPORT_MAILTO}
          className="mt-4 inline-flex min-h-11 items-center justify-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          Napisz do wsparcia: {PUBLIC_CONTACT_EMAIL}
        </a>
        <p className="mt-3 text-xs leading-5 text-text-muted">
          {POLISH_NO_SECRETS_NOTE}
        </p>
      </section>
    </main>
  );
}
