import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import {
  buyerServiceByProductId,
  buyerServiceFromRequestOffer,
} from "@/lib/buyer-services";
import { isCurrentPublicCatalogSku } from "@/lib/public-commercial-routes";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";
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
  const offer = oneParam(params.offer);
  const requestedSku = productId ? getSku(productId) : undefined;
  const sku = requestedSku && isCurrentPublicCatalogSku(requestedSku.id)
    ? requestedSku
    : undefined;
  const requestedOffer = buyerServiceFromRequestOffer(offerId, offer);
  const primaryOfferOrder =
    requestedOffer &&
    (offerId !== undefined || !sku);
  const publicExposureOrder =
    !primaryOfferOrder && sku?.id === "OFFSEC-EXTERNAL-EXPOSURE";

  return {
    title: primaryOfferOrder
      ? `Rozpocznij ${requestedOffer.name.pl}`
      : publicExposureOrder
        ? `Rozpocznij ${EXTERNAL_ATTACK_SURFACE_OFFER.name.pl}`
      : "Opowiedz, co wymaga sprawdzenia",
    description: primaryOfferOrder
      ? requestedOffer.id === PRIMARY_OFFER.id
        ? `${PRIMARY_OFFER.unit.pl}. ${PRIMARY_OFFER.price.pl}. ${PRIMARY_OFFER.fitCheck.pl}. ${PRIMARY_OFFER.timing.pl}.`
        : `${requestedOffer.situation.pl} ${requestedOffer.price.pl}. ${requestedOffer.timing.pl}.`
      : publicExposureOrder
        ? "Wskaż jeden system publicznie dostępny i podstawę upoważnienia. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów."
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
  const offer = oneParam(params.offer);
  const requestedSku = productId ? getSku(productId) : undefined;
  const sku = requestedSku && isCurrentPublicCatalogSku(requestedSku.id)
    ? requestedSku
    : undefined;
  const polishOffer = sku ? POLISH_OFFERS[sku.id] : undefined;
  const requestedOffer = buyerServiceFromRequestOffer(offerId, offer);
  const primaryOfferSelected =
    requestedOffer &&
    (offerId !== undefined || !sku);
  const buyerService = primaryOfferSelected
    ? requestedOffer
    : sku
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
  const publicExposureOrder =
    buyerService?.id === "external-exposure-assessment";
  const primaryOfferOrder = buyerService?.id === PRIMARY_OFFER.id;

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-12">
      <header className="mb-5 max-w-[720px]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          {selectedOffer?.name ?? "Zgłoszenie przeglądu"}
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl">
          {selectedOffer
            ? "Opisz, co chcesz sprawdzić"
            : "Opowiedz, co wymaga sprawdzenia"}
        </h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          {publicExposureOrder
            ? "Wskaż jeden autoryzowany system dostępny z internetu, podstawę upoważnienia i powód, dla którego jego zewnętrzna powierzchnia ataku ma teraz znaczenie. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu. To nie jest test penetracyjny."
            : primaryOfferOrder
              ? `Opisz jedno działanie agenta. Wspólnie ustalimy dopasowanie i zakres. Na razie bez sekretów i materiałów.`
            : selectedOffer
              ? "Podaj jedno niepoufne podsumowanie dla wybranej usługi. Przed rozpoczęciem pracy potwierdzimy dopasowanie, dokładny zakres, wymagane materiały, cenę i termin."
              : "Zacznij od jednej niepoufnej potrzeby. Przed rozpoczęciem pracy lub przyjęciem materiałów potwierdzimy, czy zakres jest wystarczająco ograniczony."}
        </p>
        {selectedOffer ? <div className="mt-4 border-l-2 border-brand-accent pl-4 text-sm leading-6 text-text-secondary"><p className="sr-only">Wybrana oferta: {selectedOffer.name}</p><p>Cena: {selectedOffer.price}</p><p>Termin: {selectedOffer.timing}</p>{publicExposureOrder ? <p className="mt-2">Rozmowa sprzedażowa nie jest wymagana.</p> : null}</div> : null}
      </header>
      <div className="grid max-w-3xl gap-6">
        <section className="self-start border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
          <ContactForm
            compact={Boolean(selectedOffer)}
            locale="pl"
            intent={
              primaryOfferOrder
                ? PRIMARY_OFFER.id
                : sku?.id ?? buyerService?.id ?? "review"
            }
          />
        </section>
        <details className="border-y border-surface-border">
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">Kolejne kroki i zakres</summary>
          <div className="space-y-4 pb-5">
          <section className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Co dalej
            </h2>
            {primaryOfferOrder ? (
              <ol className="mt-4 list-none space-y-3 text-sm leading-6 text-text-muted">
                <li>
                  1. Sprawdzimy bez sekretów jedno istotne działanie, możliwy
                  skutek błędu, zaangażowane systemy i narzędzia oraz granice bezpieczeństwa.
                </li>
                <li>
                  2. Uzgodnimy upoważnienie, tożsamość wykonującą, granice
                  uprawnień, dostęp do narzędzi, zasady dowodowe, wyłączenia i obsługę materiałów.
                </li>
                <li>
                  3. {PRIMARY_OFFER.timing.pl}; {PRIMARY_OFFER.price.pl.toLowerCase()}.
                </li>
              </ol>
            ) : (
              <ol className="mt-4 list-none space-y-3 text-sm leading-6 text-text-muted">
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
          </div>
        </details>
      </div>
      <div className="mt-10"><PublicContactRoute locale="pl" /></div>
      </div>
    </main>
  );
}
