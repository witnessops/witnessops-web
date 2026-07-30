import type { Metadata } from "next";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Dlaczego WitnessOps",
  description:
    "Jasna praca. Materiały, które można prześledzić. Widoczne ograniczenia. WitnessOps zamienia jeden zdefiniowany problem w praktyczny wynik, który może sprawdzić kolejna odpowiedzialna osoba.",
  alternates: {
    canonical: "/pl/why-witnessops",
    languages: {
      en: "/why-witnessops",
      pl: "/pl/why-witnessops",
      "x-default": "/why-witnessops",
    },
  },
};

const principles = [
  [
    "Zaczynamy od sytuacji",
    "Kupujący opisuje problem zwykłym językiem. WitnessOps proponuje najmniejszy przegląd, który daje użyteczny wynik.",
  ],
  [
    "Najpierw uzgadniamy zakres",
    "Zakres, upoważnienie, wynik, cena, termin, sposób postępowania z materiałami i wyłączenia są uzgadniane przed rozpoczęciem pracy.",
  ],
  [
    "Status materiałów pozostaje widoczny",
    "Obserwacje, oświadczenia kierownictwa, niepoparte twierdzenia, niewiadome i nierozwiązane kwestie pozostają rozdzielone.",
  ],
  [
    "Zostawiamy praktyczne przekazanie",
    "Końcowy pakiet jest uporządkowany tak, aby kolejna osoba mogła sprawdzić wynik, zrozumieć ograniczenia i zdecydować o następnym kroku.",
  ],
] as const;

export default function PolishWhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page mx-auto max-w-5xl px-6 py-12 lg:py-20">
      <header className="max-w-4xl border-b border-surface-border pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Dlaczego WitnessOps
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-text-primary md:text-5xl">
          Jasna praca. Materiały, które można prześledzić. Widoczne ograniczenia.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-text-secondary">
          Praca związana z bezpieczeństwem i operacjami staje się trudna do oceny, gdy zakres,
          materiały źródłowe i pozostałe braki są rozproszone między zgłoszeniami, zrzutami ekranu,
          wiadomościami i pamięcią zespołu. WitnessOps zamienia jeden zdefiniowany problem w
          praktyczny wynik, który może sprawdzić kolejna odpowiedzialna osoba.
        </p>
      </header>

      <section className="py-10">
        <h2 className="text-2xl font-semibold text-text-primary">Co nas wyróżnia</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {principles.map(([title, body]) => (
            <article key={title} className="border border-surface-border bg-surface-card/30 p-5">
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-surface-border py-8">
        <h2 className="text-2xl font-semibold text-text-primary">Granica weryfikacji</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          WitnessOps opisuje wynik jako zweryfikowany tylko wtedy, gdy takie twierdzenie wspiera
          nazwany mechanizm, na przykład podpisany receipt, manifest materiałów, wynik weryfikatora
          lub proof bundle. Weryfikacja artefaktu nie oznacza automatycznie, że każde działanie
          bazowe było poprawne, bezpieczne lub kompletne.
        </p>
        <p className="mt-6 text-sm font-semibold text-text-primary">
          Powiedz nam, co się wydarzyło. Zacznij od wstępnej oceny bez informacji poufnych.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton href="/pl/review/request" variant="primary" label="Rozpocznij przegląd" />
          <CtaButton href="/pl/catalog" variant="secondary" label="Zobacz usługi" />
        </div>
      </section>

      <div className="mt-10">
        <PublicContactRoute locale="pl" />
      </div>
    </main>
  );
}
