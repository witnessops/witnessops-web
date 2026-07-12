import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { getPolishSkus, POLISH_NO_SECRETS_NOTE, POLISH_OFFERS } from "@/lib/public-i18n";

export const metadata: Metadata = {
  title: "WitnessOps — jasny wynik ograniczonego przeglądu",
  description: "Opowiedz, co się wydarzyło. WitnessOps uzgodni zakres i dostarczy jasny wynik z dowodami, ograniczeniami i potwierdzeniem.",
  alternates: { canonical: "/pl", languages: { en: "/", pl: "/pl", "x-default": "/" } },
};

export default function PolishHomePage() {
  const offers = getPolishSkus();
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
      <header className="max-w-4xl border-b border-surface-border pb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Jasny zakres. Jasny wynik.</p>
        <h1 className="mt-4 text-4xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary md:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
          Opowiedz nam, co się wydarzyło.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
          WitnessOps określi ograniczony zakres przeglądu, wykona uzgodnione prace i dostarczy jasny wynik z dowodami, ograniczeniami oraz potwierdzeniem, które można później sprawdzić.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
          Zacznij od informacji bez sekretów. Przed rozpoczęciem pracy potwierdzimy dokładny zakres, cenę, termin i wymagany dostęp. {POLISH_NO_SECRETS_NOTE}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <CtaButton href="/pl/review/request" variant="primary" label="Rozpocznij zgłoszenie" />
          <CtaButton href="/pl/catalog" variant="secondary" label="Wybierz ofertę" />
        </div>
      </header>

      <section className="py-12" aria-labelledby="situations-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Od czego zacząć?</p>
        <h2 id="situations-heading" className="mt-2 text-3xl font-semibold text-text-primary">Wybierz sytuację, która najlepiej opisuje potrzebę</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((sku) => {
            const copy = POLISH_OFFERS[sku.id];
            return (
              <Link key={sku.id} href={`/pl/catalog/${sku.id.toLowerCase()}`} className="border border-surface-border bg-surface-card/40 p-5 transition hover:border-brand-accent">
                <h3 className="font-semibold text-text-primary">{copy.name}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{copy.situation}</p>
                <p className="mt-4 text-sm font-semibold text-brand-accent">{copy.price}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 border-y border-surface-border py-10 md:grid-cols-3">
        {[
          ["Jeden uzgodniony zakres", "Najpierw potwierdzamy, co jest objęte pracą, a co pozostaje poza nią."],
          ["Konkretna dostawa", "Otrzymujesz raport, wskazane materiały i potwierdzenie odpowiednie dla wybranej oferty."],
          ["Wynik, który można sprawdzić", "Instrukcja wyjaśnia nazwany mechanizm, wynik oraz jego ograniczenia."],
        ].map(([title, body]) => <article key={title}><h2 className="font-semibold text-text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-text-muted">{body}</p></article>)}
      </section>

      <section className="py-12">
        <h2 className="text-2xl font-semibold text-text-primary">Jak działa WitnessOps</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {["Opisujesz sytuację bez przekazywania sekretów.", "Potwierdzamy ofertę, zakres, upoważnienie, cenę i termin.", "Wykonujemy uzgodnione prace i dostarczamy wynik z ograniczeniami oraz potwierdzeniem."].map((item, index) => <li key={item} className="border border-surface-border p-4 text-sm leading-6 text-text-secondary"><span className="mr-2 text-brand-accent">{index + 1}.</span>{item}</li>)}
        </ol>
      </section>
      <PublicContactRoute />
    </main>
  );
}
