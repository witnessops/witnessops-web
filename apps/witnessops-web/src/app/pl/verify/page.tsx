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

      <details className="mt-10 border border-surface-border bg-surface-bg p-5">
        <summary className="cursor-pointer text-sm font-semibold text-text-primary">
          Co oznacza ten wynik
        </summary>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
          <p>
            Dla Public Exposure Review poprawny strukturalnie zapis pozostaje dziś
            nieokreślony: ta strona nie otrzymuje pełnego pakietu dowodowego, a
            serwerowa polityka kluczy produkcyjnych nie jest aktywna. Strona nie
            przyjmuje danych zaufania ani dowodów dostarczonych przez wywołującego.
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
