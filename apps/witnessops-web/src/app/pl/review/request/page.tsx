import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { POLISH_NO_SECRETS_NOTE, POLISH_OFFERS } from "@/lib/public-i18n";
import { getSku } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Rozpocznij zgłoszenie",
  description: "Opisz sytuację bez sekretów. Przed rozpoczęciem pracy potwierdzimy ofertę, zakres, cenę, termin i wymagany dostęp.",
  alternates: { canonical: "/pl/review/request", languages: { en: "/review/request", pl: "/pl/review/request", "x-default": "/review/request" } },
};

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function PolishReviewRequestPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const productId = one(params.productId);
  const sku = productId ? getSku(productId) : undefined;
  const polishOffer = productId ? POLISH_OFFERS[productId] : undefined;

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1040px] px-6 py-12 md:py-16">
      <header className="mb-8 max-w-[720px]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Zgłoszenie przeglądu</p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary md:text-5xl">Opowiedz, co się wydarzyło</h1>
        <p className="mt-4 text-base leading-7 text-text-muted">To pierwsza rozmowa o dopasowaniu, a nie przekazanie dowodów. Opisz potrzebę i środowisko zwykłym językiem.</p>
        {polishOffer ? <div className="mt-5 border border-brand-accent/30 bg-brand-accent/5 p-4 text-sm leading-6 text-text-secondary"><p className="font-semibold text-brand-accent">Wybrana oferta: {polishOffer.name}</p><p className="mt-2">Cena: {polishOffer.price}</p><p>Termin: {polishOffer.timing}</p></div> : null}
        <p className="mt-4 text-sm leading-7 text-text-muted">{POLISH_NO_SECRETS_NOTE}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="border border-surface-border p-6 md:p-8" style={{ background: "var(--color-surface-bg-alt)" }}><ContactForm /></section>
        <aside className="space-y-4">
          <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Co dalej</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted"><li>1. Potwierdzimy, która oferta pasuje.</li><li>2. Uzgodnimy zakres, upoważnienie, dostęp, cenę i termin.</li><li>3. Odpowiemy przed przyjęciem materiałów źródłowych.</li></ol></section>
          <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Ważna granica</h2><p className="mt-3 text-sm leading-6 text-text-muted">Samo zgłoszenie nie rozpoczyna pracy. Nie przyjmujemy materiałów klienta, dopóki nie uzgodnimy zakresu i sposobu ich obsługi.</p></section>
          {sku && polishOffer ? <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Wybrana sytuacja</h2><p className="mt-3 text-sm leading-6 text-text-muted">{polishOffer.situation}</p></section> : null}
        </aside>
      </div>
      <div className="mt-10"><PublicContactRoute /></div>
    </main>
  );
}
