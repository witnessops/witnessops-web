import type { Metadata } from "next";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Dlaczego WitnessOps",
  description:
    "Dowiedz się, dlaczego WitnessOps zaczyna od ściśle określonego zakresu i dostarcza sprawdzalny wynik z dowodami oraz ograniczeniami.",
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
    "Najpierw rzeczywista sytuacja",
    "Zaczynamy od tego, co się wydarzyło lub co trzeba sprawdzić, a nie od narzędzi i terminologii technicznej.",
  ],
  [
    "Jeden uzgodniony zakres",
    "Przed rozpoczęciem potwierdzamy system, upoważnienie, cenę, termin, potrzebny dostęp oraz wyłączenia.",
  ],
  [
    "Sprawdzalny wynik",
    "Dostawa oddziela ustalenia poparte materiałem od niewiadomych, ograniczeń i elementów poza zakresem.",
  ],
  [
    "Podpisany zapis wykonania do późniejszego sprawdzenia",
    "Instrukcja wskazuje sposób weryfikacji i wyjaśnia, co wynik potwierdza, a czego nie potwierdza.",
  ],
] as const;

export default function PolishWhyWitnessOpsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page mx-auto max-w-5xl px-6 py-12 lg:py-20">
      <header className="max-w-4xl border-b border-surface-border pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Dlaczego WitnessOps
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary md:text-5xl">
          Nie musisz wierzyć w ogólne zapewnienie. Powinieneś móc zobaczyć, co zrobiono i gdzie kończy się wynik.
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-text-secondary">
          WitnessOps zamienia jedno uzgodnione zadanie w jasno określone rezultaty: raport, wskazane materiały, ograniczenia, podpisany zapis wykonania i instrukcję weryfikacji.
        </p>
      </header>

      <section className="grid gap-4 py-10 md:grid-cols-2">
        {principles.map(([title, body]) => (
          <article key={title} className="border border-surface-border bg-surface-card/30 p-5">
            <h2 className="font-semibold text-text-primary">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-surface-border py-8">
        <h2 className="text-2xl font-semibold text-text-primary">Ważna granica</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          Potwierdzenie nie jest gwarancją bezpieczeństwa, certyfikacją zgodności, zatwierdzeniem uruchomienia ani dowodem, że poza uzgodnionym zakresem nie pominięto żadnego faktu. Każda oferta opisuje własne granice.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton href="/pl/catalog" variant="secondary" label="Wybierz ofertę" />
          <CtaButton href="/pl/review/request" variant="primary" label="Rozpocznij zgłoszenie" />
        </div>
      </section>

      <div className="mt-10">
        <PublicContactRoute />
      </div>
    </main>
  );
}
