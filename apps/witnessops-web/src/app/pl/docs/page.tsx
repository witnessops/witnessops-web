import type { Metadata } from "next";
import { getDocsUrl } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

const EN_DOCS = getDocsUrl("witnessops", "/", { mode: "canonical" });

export const metadata: Metadata = {
  title: "Dokumentacja WitnessOps",
  description:
    "Dowiedz się, co dostarcza WitnessOps, co wspiera wynik i jak go sprawdzić.",
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
          Dowiedz się, co dostarcza WitnessOps, co wspiera wynik i jak go
          sprawdzić.
        </h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-text-muted">
          Opowiedz, co się wydarzyło. WitnessOps określi ściśle uzgodniony
          zakres, wykona ustalone prace i dostarczy udokumentowany wynik wraz z
          dowodami, ograniczeniami oraz sposobem weryfikacji.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton href="/pl/catalog" variant="primary" label="Zrozum usługę" />
          <CtaButton
            href="/pl/verify"
            variant="secondary"
            label="Zweryfikuj zapis"
          />
          <CtaButton
            href={EN_DOCS}
            variant="ghost"
            label="Dokumentacja techniczna (EN)"
          />
        </div>
      </header>
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <article className="border border-surface-border p-5">
          <h2 className="font-semibold text-text-primary">Dla kupujących</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Porównaj sześć ofert, jasno określone rezultaty, potrzebne
            informacje, ceny, terminy i wyłączenia.
          </p>
        </article>
        <article className="border border-surface-border p-5">
          <h2 className="font-semibold text-text-primary">
            Dla osób sprawdzających
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Poznaj strukturę podpisanego zapisu wykonania, wskazany sposób
            weryfikacji i granice każdego wyniku. Szczegóły techniczne: EN na
            witnessops.com/docs.
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
