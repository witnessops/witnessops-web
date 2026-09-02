import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import {
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
} from "@/lib/buyer-services";
import { isCurrentPublicCatalogSku } from "@/lib/public-commercial-routes";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { POLISH_OFFERS } from "@/lib/public-i18n";
import { getSku } from "@witnessops/catalog";
import { languageAlternates } from "@/lib/public-seo";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function oneParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const productId = oneParam(params.productId);
  const offerId = oneParam(params.offerId);
  const requestedSku = productId ? getSku(productId) : undefined;
  const sku = requestedSku && isCurrentPublicCatalogSku(requestedSku.id)
    ? requestedSku
    : undefined;
  const publicExposureOrder = sku?.id === "OFFSEC-EXTERNAL-EXPOSURE";
  const primaryOfferOrder = offerId === PRIMARY_OFFER.id;

  return {
    title: publicExposureOrder
      ? "Rozpocznij Public Exposure Review"
      : primaryOfferOrder
        ? `Rozpocznij ${PRIMARY_OFFER.name.pl}`
      : "Opowiedz, co wymaga sprawdzenia",
    description: publicExposureOrder
      ? "Wskaż jeden system publicznie dostępny i podstawę upoważnienia. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów."
      : primaryOfferOrder
        ? `${PRIMARY_OFFER.unit.pl}. ${PRIMARY_OFFER.price.pl}. ${PRIMARY_OFFER.fitCheck.pl}. ${PRIMARY_OFFER.timing.pl}.`
      : "Opisz niepoufnie ankietę, serwer, wdrożenie, incydent, zmianę dostępu lub działanie, które wymaga sprawdzenia.",
    alternates: languageAlternates("/pl/review/request", {
      en: "/review/request",
      pl: "/pl/review/request",
    }),
  };
}

export default async function PolishReviewRequestPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const productId = oneParam(params.productId);
  const offerId = oneParam(params.offerId);
  const requestedSku = productId ? getSku(productId) : undefined;
  const sku = requestedSku && isCurrentPublicCatalogSku(requestedSku.id)
    ? requestedSku
    : undefined;
  const polishOffer = sku ? POLISH_OFFERS[sku.id] : undefined;
  const requestedOffer = offerId
    ? buyerServiceByPublicOfferId(offerId)
    : undefined;
  const buyerService = sku
    ? buyerServiceByProductId(sku.id)
    : requestedOffer;
  const selectedOffer = buyerService
    ? {
        name: buyerService.name.pl,
        situation: buyerService.situation.pl,
        price: buyerService.price.pl,
        timing: buyerService.timing.pl,
      }
    : polishOffer;
  const publicExposureOrder = sku?.id === "OFFSEC-EXTERNAL-EXPOSURE";
  const primaryOfferOrder = buyerService?.id === PRIMARY_OFFER.id;

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16">
      <header className="mb-8 max-w-[720px]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          {selectedOffer?.name ?? "Zgłoszenie przeglądu"}
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl">
          {selectedOffer
            ? `Zgłoś: ${selectedOffer.name}`
            : "Opowiedz, co wymaga sprawdzenia"}
        </h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          {publicExposureOrder
            ? "Wskaż jeden system publicznie dostępny i podstawę upoważnienia. Rozmowa sprzedażowa nie jest wymagana. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu."
            : primaryOfferOrder
              ? "Nazwij jeden istotny workflow agenta lub automatyzacji. Wystarczy niepoufne podsumowanie; materiały przyjmujemy dopiero po uzgodnieniu zakresu, zasad dowodowych i sposobu obsługi."
            : selectedOffer
              ? "Podaj jedno niepoufne podsumowanie dla wybranej usługi. Przed rozpoczęciem pracy potwierdzimy dopasowanie, dokładny zakres, wymagane materiały, cenę i termin."
              : "Zacznij od jednej niepoufnej potrzeby. Przed rozpoczęciem pracy lub przyjęciem materiałów potwierdzimy, czy zakres jest wystarczająco ograniczony."}
        </p>
        {selectedOffer ? <div className="mt-5 border border-brand-accent/30 bg-brand-accent/5 p-4 text-sm leading-6 text-text-secondary"><p className="font-semibold text-brand-accent">Wybrana oferta: {selectedOffer.name}</p><p className="mt-2">Cena: {selectedOffer.price}</p><p>Termin: {selectedOffer.timing}</p></div> : null}
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
          <ContactForm
            locale="pl"
            intent={sku?.id ?? buyerService?.id ?? "review"}
          />
        </section>
        <aside className="space-y-4">
          <section className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Co dalej
            </h2>
            {primaryOfferOrder ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <li>
                  1. Sprawdzimy bez sekretów, czy jeden nazwany workflow
                  pasuje do zakresu rekonstrukcji.
                </li>
                <li>
                  2. Uzgodnimy zakres, zasady dowodowe, wyłączenia i sposób
                  obsługi materiałów.
                </li>
                <li>
                  3. {PRIMARY_OFFER.timing.pl}; {PRIMARY_OFFER.price.pl.toLowerCase()}.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <li>1. Potwierdzimy, która oferta pasuje.</li>
                <li>
                  2. Uzgodnimy zakres, upoważnienie, dostęp, cenę i termin.
                </li>
                <li>3. Odpowiemy przed przyjęciem materiałów źródłowych.</li>
              </ol>
            )}
          </section>
          <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Ważna granica</h2><p className="mt-3 text-sm leading-6 text-text-muted">Samo zgłoszenie nie rozpoczyna pracy. Nie przyjmujemy materiałów klienta, dopóki nie uzgodnimy zakresu i sposobu ich obsługi.</p></section>
          {selectedOffer ? <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Wybrana sytuacja</h2><p className="mt-3 text-sm leading-6 text-text-muted">{selectedOffer.situation}</p></section> : null}
        </aside>
      </div>
      <div className="mt-10"><PublicContactRoute locale="pl" /></div>
      </div>
    </main>
  );
}
