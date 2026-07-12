import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { getPolishSkus, POLISH_NO_SECRETS_NOTE, POLISH_OFFERS, polishOfferRequestHref } from "@/lib/public-i18n";

export const metadata: Metadata = {
  title: "Oferty WitnessOps",
  description: "Wybierz przegląd o ściśle określonym zakresie dla konkretnej sytuacji operacyjnej.",
  alternates: { canonical: "/pl/catalog", languages: { en: "/catalog", pl: "/pl/catalog", "x-default": "/catalog" } },
};

export default function PolishCatalogPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="mb-10 border-b border-surface-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Oferty WitnessOps</p>
        <h1 className="mt-2 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary">Co się wydarzyło?</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-text-secondary">Wybierz sytuację. Każda oferta określa zakres, rezultat, cenę lub przedział cenowy, termin oraz wyłączenia.</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{POLISH_NO_SECRETS_NOTE}</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {getPolishSkus().map((sku) => {
          const productId = sku.id;
          const copy = POLISH_OFFERS[productId];
          return (
            <article key={sku.id} className="border border-surface-border bg-surface-card/40 p-5">
              <p className="text-sm leading-6 text-text-muted">{copy.situation}</p>
              <h2 className="mt-3 text-lg font-semibold text-text-primary">{copy.name}</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{copy.result}</p>
              <dl className="mt-4 grid gap-3 text-sm text-text-muted sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wider">Cena</dt><dd className="mt-1">{copy.price}</dd></div><div><dt className="text-xs uppercase tracking-wider">Termin</dt><dd className="mt-1">{copy.timing}</dd></div></dl>
              <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider"><Link className="text-brand-accent hover:underline" href={`/pl/catalog/${sku.id.toLowerCase()}`}>Poznaj ofertę</Link><Link className="text-text-secondary hover:text-text-primary" href={polishOfferRequestHref(productId)}>Rozpocznij zgłoszenie</Link></div>
            </article>
          );
        })}
      </section>
      <div className="mt-10"><PublicContactRoute /></div>
    </main>
  );
}
