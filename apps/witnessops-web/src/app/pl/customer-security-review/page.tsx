import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "WitnessOps bierze jeden kwestionariusz i jeden zakres produktu, ustala, które proponowane odpowiedzi mają wsparcie w dostarczonych materiałach, oddziela oświadczenia kierownictwa i otwarte kwestie, a następnie przekazuje pakiet odpowiedzi do zatwierdzenia.",
  alternates: {
    canonical: "/pl/customer-security-review",
    languages: {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
      "x-default": "/customer-security-review",
    },
  },
};

const deliverables = [
  "proponowaną macierz odpowiedzi",
  "indeks materiałów",
  "listę zastrzeżeń i niepopartych twierdzeń",
  "listę otwartych kwestii i właścicieli",
  "mapę twierdzeń, jeśli jest przydatna",
  "notę przewodnią dla klienta lub osoby zatwierdzającej",
];

const boundaries = [
  "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.",
  "WitnessOps nie certyfikuje zgodności ani nie gwarantuje, że klient, audytor lub dział zakupów zaakceptuje pakiet.",
  "WitnessOps nie tworzy fikcyjnych materiałów i nie przedstawia niepopartego twierdzenia jako popartego.",
];

export default function PolishCustomerSecurityReviewPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-text-muted">Customer Security Review Sprint</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              Prześlij kwestionariusz bezpieczeństwa, który blokuje transakcję.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
              WitnessOps bierze jeden kwestionariusz i jeden zakres produktu, ustala, które
              proponowane odpowiedzi mają wsparcie w dostarczonych materiałach, oddziela oświadczenia
              kierownictwa i otwarte kwestie, a następnie przekazuje pakiet odpowiedzi do
              zatwierdzenia.
            </p>
            <Link
              href="/pl/review/request"
              className="mt-8 inline-flex min-h-12 items-center justify-center bg-black px-6 text-center text-sm font-semibold leading-5 text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              Rozpocznij wstępną ocenę bez informacji poufnych
            </Link>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              Zacznij od ogólnego opisu bez informacji poufnych. Podczas wstępnej oceny nie wysyłaj
              plików, danych logowania, logów, zrzutów ekranu, kluczy prywatnych, kluczy API, kodów
              MFA, kodów odzyskiwania, tokenów sesyjnych ani materiałów klienta.
            </p>
          </div>
          <aside className="bg-black p-6 text-white sm:p-7">
            <div className="sm:grid sm:grid-cols-2 sm:gap-8 lg:block">
              <div>
                <p className="text-sm font-semibold text-white/60">Cena i termin</p>
                <p className="mt-3 text-3xl font-semibold">Od €1,600</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Po wstępnej ocenie bez informacji poufnych. Jeden kwestionariusz. Jeden zakres
                  produktu.
                </p>
              </div>
              <div className="mt-6 border-t border-white/20 pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8 lg:mt-6 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
                <p className="text-sm leading-6 text-white/80">
                  Około trzech dni roboczych po potwierdzeniu zakresu, właścicieli, wymaganych
                  materiałów i dostępu do dowodów.
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div>
            <h2 className="text-3xl font-semibold text-text-primary">Co otrzymujesz</h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-text-primary">Ograniczenia</h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {boundaries.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="border-t border-surface-border pt-10">
          <PublicContactRoute subject="fit-check" locale="pl" />
        </div>
      </div>
    </main>
  );
}
