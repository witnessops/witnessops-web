import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

const primaryPaths = [
  {
    href: "/pl/catalog",
    title: "Usługi",
    description:
      "Porównaj przeglądy według sytuacji, rezultatu, ceny i terminu.",
    cta: "Przeglądaj usługi",
  },
  {
    href: "/pl/customer-security-review",
    title: "Przykłady",
    description:
      "Zobacz oznaczony przykład oferty przed wysłaniem zgłoszenia.",
    cta: "Zobacz przykład CSR",
  },
  {
    href: "/pl/verify",
    title: "Zweryfikuj zapis",
    description:
      "Prześlij lub wklej JSON zapisu i odczytaj wynik o ograniczonym zakresie.",
    cta: "Otwórz weryfikator",
  },
] as const;

const secondaryGroups = [
  {
    title: "Przewodniki dla kupujących",
    description: "Zakres, przekazanie wyniku i sposób zgłoszenia.",
    links: [
      [
        "Dlaczego WitnessOps",
        "/pl/why-witnessops",
        "Jak praca o określonym zakresie staje się zrozumiała i możliwa do sprawdzenia.",
      ],
      [
        "Dokumentacja po polsku",
        "/pl/docs",
        "Objaśnienia w zatwierdzonej polskiej wersji.",
      ],
      [
        "Sprint kwestionariusza bezpieczeństwa",
        "/pl/customer-security-review",
        "Jedna odpowiedź na kwestionariusz z jasnymi ograniczeniami.",
      ],
      [
        "Rozpocznij przegląd",
        "/pl/review/request",
        "Krótka, niepoufna ocena dopasowania — bez plików i sekretów.",
      ],
    ],
  },
  {
    title: "Usługi",
    description: "Katalog i granice ofert.",
    links: [
      [
        "Katalog usług",
        "/pl/catalog",
        "Natywne polskie opisy zatwierdzonych ofert.",
      ],
    ],
  },
  {
    title: "Przykłady (EN)",
    description: "Oznaczone przykłady przeglądów — nie dane klientów.",
    links: [
      [
        "Przykłady przeglądów",
        "/review/sample-cases",
        "Sytuacje, materiały i granice — treść przykładowa po angielsku.",
      ],
      [
        "Pakiet zmiany agenta AI",
        "/review/sample-cases/ai-agent-action-proof-run",
        "Pełny pakiet przykładowy po angielsku.",
      ],
      [
        "Kontrola elementów SBOM (CISA 2026)",
        "/review/sample-cases/sbom-cisa-2026-minimum-elements",
        "Lista kontrolna na syntetycznym SBOM — nie certyfikat.",
      ],
    ],
  },
  {
    title: "Weryfikacja i dokumentacja",
    description: "Narzędzie publiczne oraz szczegóły techniczne.",
    links: [
      [
        "Zweryfikuj zapis",
        "/pl/verify",
        "Prześlij lub wklej JSON zapisu i odczytaj wynik.",
      ],
      [
        "Jak działa weryfikacja (EN)",
        "/docs/how-it-works/verification",
        "Co wynik ustala, a czego nie.",
      ],
      [
        "Dokumentacja (EN hubs)",
        "/docs",
        "Model i granice — pełna treść techniczna po angielsku.",
      ],
    ],
  },
] as const;

const exampleBoundary =
  "Przykłady są oznaczone jako demonstracje lub ilustracje. Nie są materiałem klienta ani certyfikacją zgodności. Ważny wynik publicznej weryfikacji potwierdza kontrole wskazane w zapisie — nie to, że każde działanie leżące u podstaw było poprawne.";

export const metadata: Metadata = {
  title: "Biblioteka WitnessOps",
  description:
    "Publiczne punkty wejścia do usług, przykładów, weryfikacji zapisów i dokumentacji.",
  alternates: languageAlternates("/pl/library", {
    en: "/library",
    pl: "/pl/library",
  }),
};

export default function PolishLibraryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <header className="max-w-3xl border-b border-surface-border pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Biblioteka
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl">
            Publiczne punkty wejścia
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            Zacznij od usług, przykładu albo sprawdzenia zapisu. Dokumentację
            otwieraj dopiero, gdy potrzebujesz szczegółów.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaButton
              href="/pl/catalog"
              variant="primary"
              label="Przeglądaj usługi"
            />
            <CtaButton
              href="/pl/verify"
              variant="secondary"
              label="Zweryfikuj zapis"
            />
            <CtaButton
              href="/pl/review/request"
              variant="secondary"
              label="Rozpocznij przegląd"
            />
          </div>
        </header>

        <section className="mt-10" aria-labelledby="library-start-heading">
          <h2
            id="library-start-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Zacznij tutaj
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {primaryPaths.map((path, index) => (
              <Link
                key={path.href}
                href={path.href}
                className={`block border p-5 transition-colors hover:border-brand-accent ${
                  index === 0
                    ? "border-brand-accent/50 bg-brand-accent/5"
                    : "border-surface-border bg-surface-bg"
                }`}
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  {path.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {path.description}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-brand-accent">
                  {path.cta} →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="library-more-heading">
          <h2
            id="library-more-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Więcej tras
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {secondaryGroups.map((group) => (
              <section
                key={group.title}
                className="border border-surface-border bg-surface-bg p-5"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  {group.title}
                </h3>
                <p className="mt-2 text-sm text-text-muted">{group.description}</p>
                <ul className="mt-5 space-y-4">
                  {group.links.map(([label, href, note]) => (
                    <li key={href + label} className="border-t border-surface-border pt-4">
                      <Link
                        href={href}
                        className="inline-flex min-h-11 items-center font-semibold text-text-primary underline decoration-1 underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                      >
                        {label}
                      </Link>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {note}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <p className="mt-10 max-w-3xl text-sm leading-7 text-text-muted">
          {exampleBoundary}
        </p>
      </div>
    </main>
  );
}
