import type { Metadata } from "next";
import Link from "next/link";
import { getDocsUrl } from "@witnessops/config";

import { POLISH_DOC_LABELS } from "../docs-navigation";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug.join("/");
  return {
    title: POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna",
    robots: { index: false, follow: true },
  };
}

export default async function PolishDocsFallback({ params }: Props) {
  const slug = (await params).slug.join("/");
  const title = POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna";
  const enDocsHome = getDocsUrl("witnessops", "/", { mode: "canonical" });

  return (
    <main id="main-content" tabIndex={-1} className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Dokumentacja WitnessOps · granica PL / EN
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-text-primary">{title}</h1>
      <div className="mt-5 border border-brand-accent/40 bg-brand-accent/5 p-4 text-sm leading-6 text-text-muted">
        <strong className="font-semibold text-text-primary">
          Polska wersja tej szczegółowej strony nie jest pełną dokumentacją
          techniczną.
        </strong>{" "}
        Pełna ścieżka kupującego jest dostępna po polsku. Źródłowa dokumentacja
        modelu, weryfikatora i specyfikacji pozostaje po angielsku na{" "}
        <span className="whitespace-nowrap">docs.witnessops.com</span>.
      </div>
      <p className="mt-4 text-sm leading-6 text-text-muted">
        Nie tłumaczymy automatycznie umów produktowych, identyfikatorów, poleceń
        ani semantyki weryfikatora. Dzięki temu techniczna treść nie zmienia
        znaczenia podczas tłumaczenia.
      </p>
      <div className="mt-7 flex flex-wrap gap-4 text-sm">
        <Link className="text-brand-accent hover:underline" href="/pl/docs">
          Wróć do dokumentacji PL
        </Link>
        <Link
          className="inline-flex items-center border border-brand-accent bg-brand-accent/10 px-3 py-2 font-semibold text-text-primary hover:opacity-90"
          href={enDocsHome}
        >
          Otwórz dokumentację techniczną (EN)
        </Link>
      </div>
    </main>
  );
}
