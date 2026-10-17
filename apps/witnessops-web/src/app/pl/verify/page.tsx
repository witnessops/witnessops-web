import type { Metadata } from "next";
import Link from "next/link";
import { VerifyConsole } from "@/components/verify/verify-console";
import { listVerifyFixtures } from "@/lib/verify-fixtures";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Zweryfikuj dostawę",
  description:
    "Prześlij lub wklej podpisany zapis wykonania, aby sprawdzić poprawność struktury, integralność i ograniczenia wyniku.",
  alternates: languageAlternates("/pl/verify", {
    en: "/verify",
    pl: "/pl/verify",
  }),
};

function pickExampleReceipt(): string | null {
  const fixtures = listVerifyFixtures();
  const preferred =
    fixtures.find((fixture) => fixture.id === "pv-valid") ??
    fixtures.find(
      (fixture) =>
        fixture.expected.kind === "verification" &&
        fixture.expected.verdict === "indeterminate",
    ) ??
    fixtures[0];
  return preferred?.receiptInput ?? null;
}

export default function PolishVerifyPage() {
  const exampleReceipt = pickExampleReceipt();

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
          Prześlij obsługiwany plik zapisu lub wklej jego JSON. Publiczny adapter
          wykonuje wyłącznie kontrole zapisu i wskazuje materiały, podpisy oraz
          dane zaufania, których nie sprawdzono niezależnie.
        </p>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Domyślny przykład daje wynik nieokreślony (`indeterminate`). Kontrole,
          które przeszły, nie tworzą wyniku ważnego, jeżeli wymagane materiały
          dowodowe lub dane zaufania nie zostały niezależnie sprawdzone.
        </p>
      </header>

      <section className="mt-8" id="verify-console">
        <VerifyConsole exampleReceipt={exampleReceipt} />
      </section>

      <details className="mt-6 rounded-[var(--radius-card)] border border-surface-border bg-surface-card">
        <summary className="min-h-11 cursor-pointer px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:text-brand-accent active:bg-surface-inset">
          Co oznacza ten wynik
        </summary>
        <div className="space-y-3 border-t border-surface-border px-5 py-4 text-sm leading-relaxed text-text-muted">
          <p>
            Dla zapisów w profilu zgodności public_exposure_review poprawny strukturalnie wynik pozostaje dziś
            nieokreślony: ta strona nie otrzymuje pełnego pakietu dowodowego, a
            serwerowa polityka kluczy produkcyjnych nie jest aktywna. Strona nie
            przyjmuje danych zaufania ani dowodów dostarczonych przez wywołującego.
          </p>
          <p>
            Szczegóły techniczne (EN):{" "}
            <Link
              href="/docs/how-it-works/verification"
              className="text-brand-accent underline underline-offset-4 hover:decoration-2 active:text-text-primary"
            >
              how verification works
            </Link>
            .
          </p>
        </div>
      </details>

      <nav
        className="mt-8 flex flex-wrap gap-x-5 border-t border-surface-border pt-4 text-sm"
        aria-label="Powiązane materiały"
      >
        <Link
          href="/docs/how-it-works/verification"
          className="inline-flex min-h-11 items-center text-brand-accent underline-offset-4 hover:underline active:text-text-primary"
        >
          Dokumentacja weryfikacji (EN)
        </Link>
        <Link
          href="/docs/evidence/receipts"
          className="inline-flex min-h-11 items-center text-brand-accent underline-offset-4 hover:underline active:text-text-primary"
        >
          Receipts (EN)
        </Link>
        <Link
          href="/pl/library"
          className="inline-flex min-h-11 items-center text-brand-accent underline-offset-4 hover:underline active:text-text-primary"
        >
          Biblioteka
        </Link>
      </nav>
    </main>
  );
}
