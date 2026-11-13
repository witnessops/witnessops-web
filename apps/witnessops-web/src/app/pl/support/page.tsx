import type { Metadata } from "next";
import Link from "next/link";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import {
  PUBLIC_CONTACT_EMAIL,
  publicContactMailto,
} from "@/lib/public-contact";
import { POLISH_NO_SECRETS_NOTE } from "@/lib/public-i18n";
import { languageAlternates } from "@/lib/public-seo";

const SUPPORT_MAILTO = publicContactMailto("WitnessOps support request");
const VULNERABILITY_MAILTO = publicContactMailto("Private vulnerability report");

export const metadata: Metadata = {
  title: "Wsparcie",
  description: "Pomoc dotycząca zgłoszeń, weryfikacji zapisów i kontaktu z WitnessOps.",
  alternates: languageAlternates("/pl/support", {
    en: "/support",
    pl: "/pl/support",
  }),
};

const routes = [
  [
    PUBLIC_AGENT_ACTION_OFFER.name.pl,
    "/pl/reviews/agent-action-security-review",
    `Przegląd jednego istotnego działania agenta lub automatyzacji. ${PUBLIC_AGENT_ACTION_OFFER.price.pl}`,
  ],
  [
    "Mam istniejące zgłoszenie",
    "#contact",
    "Napisz z tego samego adresu służbowego i podaj identyfikator zgłoszenia.",
  ],
  [
    "Chcę sprawdzić zapis WitnessOps",
    "/pl/verify",
    "Prześlij plik zapisu lub wklej jego JSON, aby poznać wynik kontroli i jej ograniczenia.",
  ],
  [
    "Otrzymałem nieoczekiwaną wiadomość od WitnessOps",
    "#contact",
    "Nie otwieraj załączników ani nie klikaj linków. Napisz do nas, podając ogólny opis wiadomości bez danych poufnych.",
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
          Wybierz temat, w którym potrzebujesz pomocy. Jeśli pytasz o nowy
          przegląd, zacznij od ogólnego opisu bez danych poufnych.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
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
          Chcę zgłosić podatność
        </h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          Aby zgłosić podatność, napisz na{" "}
          <a
            href={VULNERABILITY_MAILTO}
            className="[overflow-wrap:anywhere] text-brand-accent hover:underline"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
          . Link uzupełni temat wiadomości dotyczącej podatności.
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
          Napisz do nas
        </h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          Jeśli sprawa dotyczy istniejącego zgłoszenia, napisz z tego samego
          adresu służbowego i podaj jego identyfikator. W pozostałych sprawach
          wystarczy krótki opis bez informacji poufnych. Jeśli otrzymana
          wiadomość wzbudza podejrzenia, nie przesyłaj jej załączników.
        </p>
        <a
          href={SUPPORT_MAILTO}
          className="mt-4 inline-block max-w-full min-h-11 border border-brand-accent bg-brand-accent px-5 py-3 text-sm font-semibold text-text-inverse [overflow-wrap:anywhere] hover:brightness-110"
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
