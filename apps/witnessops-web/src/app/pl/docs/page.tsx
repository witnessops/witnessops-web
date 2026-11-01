import type { Metadata } from "next";
import { getDocsUrl } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

const EN_DOCS = getDocsUrl("witnessops", "/", { mode: "canonical" });

export const metadata: Metadata = {
  title: "Dokumentacja",
  description:
    "Dowiedz się, co otrzymasz od WitnessOps i jak sprawdzić wynik.",
  alternates: languageAlternates("/pl/docs", {
    en: "/docs",
    pl: "/pl/docs",
  }),
};

export default function PolishDocsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <header className="border-b border-surface-border pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Dokumentacja
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary">
          Dokumentacja WitnessOps
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted">
          Poznaj przegląd ekspercki oraz aplikację i CLI WitnessOps. Zakres i cenę przeglądu uzgadniamy osobno.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          Utworzenie konta jest bezpłatne i nie wymaga karty. Po potwierdzeniu adresu e-mail możesz utworzyć własny obszar roboczy bez zaproszenia. Dołączenie do obszaru roboczego innej osoby wymaga zaproszenia od jego właściciela. Aplikacja działa w przeglądarce; CLI jest opcjonalne.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton href="/pl/docs/understand-the-service" variant="primary" label="Poznaj usługę" />
          <CtaButton href={getDocsUrl("witnessops", "/getting-started", { mode: "canonical" })} variant="secondary" label="Pierwsze kroki (EN)" />
          <CtaButton
            href="/pl/verify"
            variant="secondary"
            label="Zweryfikuj zapis"
          />
          <CtaButton
            href={EN_DOCS}
            variant="ghost"
            label="Instrukcje aplikacji i CLI (EN)"
          />
        </div>
      </header>
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="border border-surface-border p-5">
          <h2 className="font-semibold text-text-primary">Pomoc ekspercka</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Poznaj zakres przeglądu, jego cenę, potrzebne informacje oraz to,
            czego przegląd nie obejmuje.
          </p>
        </article>
        <article className="border border-surface-border p-5">
          <h2 className="font-semibold text-text-primary">
            Dla osób sprawdzających
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Raport przedstawia zarejestrowane obserwacje. Publiczny weryfikator przyjmuje obsługiwany zapis w formacie JSON, ale nie pełny pakiet. Instrukcje techniczne są dostępne po angielsku.
          </p>
        </article>
      </section>
      <section className="mt-8 border border-surface-border bg-surface-card/30 p-5">
        <h2 className="font-semibold text-text-primary">Ważna granica</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          WitnessOps może mapować obserwacje do zewnętrznych standardów. Nie
          stanowi to certyfikacji ani ustalenia zgodności. Pełna dokumentacja
          techniczna pozostaje po angielsku.
        </p>
      </section>
    </main>
  );
}
