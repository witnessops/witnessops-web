import type { Metadata } from "next";
import Link from "next/link";
import { VerifyConsole } from "@/components/verify/verify-console";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Zweryfikuj dostawę",
  description:
    "Prześlij lub wklej podpisany zapis wykonania, aby sprawdzić poprawność struktury, integralność i ograniczenia wyniku.",
  alternates: {
    canonical: "/pl/verify",
    languages: { en: "/verify", pl: "/pl/verify", "x-default": "/verify" },
  },
};

export default function PolishVerifyPage() {
  const fixtures = listVerifyFixtures();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-6 py-12"
    >
      <header className="border-b border-surface-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Weryfikacja
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary">
          Zweryfikuj zapis WitnessOps
        </h1>
        <p className="mt-5 text-base leading-7 text-text-secondary">
          Prześlij plik zapisu lub wklej jego JSON. Sprawdzenie potwierdzi, czy
          zapis jest poprawny strukturalnie, czy przechodzi kontrole
          integralności oraz co wynik ustala — i czego nie ustala.
        </p>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Wynik ważny potwierdza kontrole wskazane w zapisie. Nie dowodzi, że
          każde działanie leżące u podstaw było poprawne, ani pełnej historii
          operacyjnej.
        </p>
      </header>

      <section className="mt-8" id="verify-console">
        <VerifyConsole fixtures={fixtures} />
      </section>

      <details className="mt-10 border border-surface-border bg-surface-bg p-5">
        <summary className="cursor-pointer text-sm font-semibold text-text-primary">
          Co oznacza ten wynik
        </summary>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
          <p>
            Wynik dotyczy podpisanego zapisu JSON. Nie potwierdza zgodności z
            regulacjami, pełnego bezpieczeństwa systemu ani kompletności
            materiałów poza zakresem zapisu.
          </p>
          <p>
            Szczegóły techniczne (EN):{" "}
            <Link
              href="/docs/how-it-works/verification"
              className="text-brand-accent underline-offset-4 hover:underline"
            >
              how verification works
            </Link>
            .
          </p>
        </div>
      </details>

      <nav
        className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm"
        aria-label="Powiązane materiały"
      >
        <Link
          href="/docs/how-it-works/verification"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Dokumentacja weryfikacji (EN)
        </Link>
        <Link
          href="/docs/evidence/receipts"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Receipts (EN)
        </Link>
        <Link
          href="/pl/library"
          className="text-brand-accent underline-offset-4 hover:underline"
        >
          Biblioteka
        </Link>
      </nav>
    </main>
  );
}
