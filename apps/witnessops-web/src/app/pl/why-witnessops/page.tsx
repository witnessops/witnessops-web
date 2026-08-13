import type { Metadata } from "next";
import Link from "next/link";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Dlaczego WitnessOps",
  description:
    "Ograniczona, niezależna weryfikacja jednej istotnej aktywności AI lub bezpieczeństwa: odtwórz, co było upoważnione, wykonane, zaobserwowane i nierozwiązane.",
  alternates: languageAlternates("/pl/why-witnessops", {
    en: "/why-witnessops",
    pl: "/pl/why-witnessops",
  }),
};

const principles = [
  [
    "Jedna istotna aktywność",
    "Zaczynamy od jednego przebiegu agenta, decyzji lub sytuacji bezpieczeństwa — nie od programu dla całego środowiska.",
  ],
  [
    "Odtwarzamy przebieg",
    "Ujawniamy, co było upoważnione, wykonane, zaobserwowane i nierozwiązane, z nazwanymi ograniczeniami.",
  ],
  [
    "Najpierw uzgadniamy zakres",
    "Zakres, upoważnienie, wynik, cena, termin, sposób postępowania z materiałami i wyłączenia są uzgadniane przed rozpoczęciem pracy.",
  ],
  [
    "Uzupełniamy continuous compliance",
    "To inna praca niż mapowanie kontroli w stylu Vanta: weryfikujemy jedną ograniczoną aktywność, nie zastępujemy pakietu GRC funkcja w funkcję.",
  ],
] as const;

export default function PolishWhyWitnessOpsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page mx-auto max-w-5xl px-6 py-12 lg:py-20"
    >
      <header className="max-w-4xl border-b border-surface-border pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Dlaczego WitnessOps
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-text-primary md:text-5xl">
          Zweryfikuj jedną istotną aktywność. Odtwórz, co się wydarzyło.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-text-secondary">
          Kategoria robocza:{" "}
          <strong className="font-semibold text-text-primary">
            ograniczona, niezależna weryfikacja istotnej pracy AI i
            bezpieczeństwa
          </strong>
          . Dla jednego przebiegu agenta, decyzji lub aktywności bezpieczeństwa
          odtwarzamy, co było upoważnione, wykonane, zaobserwowane i
          nierozwiązane — tak, by kolejna odpowiedzialna osoba mogła sprawdzić
          wynik bez polegania wyłącznie na pamięci i zrzutach ekranu.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton
            href="/pl/review/request"
            variant="primary"
            label="Rozpocznij przegląd"
          />
          <CtaButton href="/pl/catalog" variant="secondary" label="Zobacz usługi" />
          <CtaButton
            href="/pl/customer-security-review"
            variant="secondary"
            label="Customer Security Review"
          />
        </div>
        <p className="mt-4 text-sm">
          <Link
            href="/pl/verify"
            className="font-semibold text-brand-accent underline-offset-4 hover:underline"
          >
            Zweryfikuj zapis
          </Link>
          <span className="text-text-muted"> · </span>
          <Link
            href="/pl/library"
            className="font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
          >
            Biblioteka
          </Link>
        </p>
      </header>

      <section className="py-10">
        <h2 className="text-2xl font-semibold text-text-primary">Co nas wyróżnia</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {principles.map(([title, body]) => (
            <article
              key={title}
              className="border border-surface-border bg-surface-card/30 p-5"
            >
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-surface-border py-8">
        <h2 className="text-2xl font-semibold text-text-primary">Ograniczenia</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          WitnessOps opisuje wynik jako zweryfikowany tylko wtedy, gdy takie
          twierdzenie wspiera nazwany mechanizm, na przykład podpisany receipt,
          manifest materiałów, wynik weryfikatora lub proof bundle. Weryfikacja
          artefaktu nie oznacza automatycznie, że każde działanie bazowe było
          poprawne, bezpieczne lub kompletne. Ta strona nie jest claimem prawnej
          zgodności, not a production deployment claim, and not a complete AI
          governance program. Nie jest też zapewnieniem dla całego środowiska i
          nie zastępuje narzędzi continuous compliance ani GRC funkcja w funkcję.
        </p>
        <div className="mt-8 border border-surface-border bg-surface-card/30 p-6">
          <p className="text-sm font-semibold text-text-primary">
            Gotowy na przegląd o ustalonym zakresie? Zacznij od wstępnej oceny
            bez informacji poufnych.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton
              href="/pl/review/request"
              variant="primary"
              label="Rozpocznij przegląd"
            />
            <CtaButton href="/pl/catalog" variant="secondary" label="Zobacz usługi" />
          </div>
        </div>
      </section>

      <div className="mt-10">
        <PublicContactRoute locale="pl" />
      </div>
    </main>
  );
}
