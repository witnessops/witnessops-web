import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { buyerServiceByProductId, buyerServiceByPublicOfferId } from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { NewSalesIntakeClosed } from "@/components/review-request/new-sales-intake-closed";
import {
  NEW_SALES_EXTERNAL_PRODUCT_ID,
  resolveNewSalesPageQuery,
} from "@/lib/new-review-request-policy";
import { languageAlternates } from "@/lib/public-seo";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto, PUBLIC_CONTACT_SUBJECTS } from "@/lib/public-contact";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const decision = resolveNewSalesPageQuery({
    offerId: params.offerId,
    productId: params.productId,
    offer: params.offer,
  });
  const publicExposureOrder = decision.state === "selected" && decision.role === "product";
  const agentActionOrder = decision.state === "selected" && decision.role === "offer";

  return {
    title: agentActionOrder
      ? `Rozpocznij ${PUBLIC_AGENT_ACTION_OFFER.name.pl}`
      : publicExposureOrder
        ? `Rozpocznij ${EXTERNAL_ATTACK_SURFACE_OFFER.name.pl}`
      : "Opowiedz, co wymaga sprawdzenia",
    description: agentActionOrder
      ? `${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. ${PUBLIC_AGENT_ACTION_OFFER.price.pl}. ${PUBLIC_AGENT_ACTION_OFFER.fitCheck.pl}. ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}.`
      : publicExposureOrder
        ? "Wskaż jeden system publicznie dostępny i podstawę upoważnienia. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów."
      : "Wybierz Agent Action Security Review albo External Attack Surface Review. Stary identyfikator nie wybiera przeglądu.",
    alternates: languageAlternates("/pl/review/request", {
      en: "/review/request",
      pl: "/pl/review/request",
    }),
  };
}

export default async function PolishReviewRequestPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const decision = resolveNewSalesPageQuery({
    offerId: params.offerId,
    productId: params.productId,
    offer: params.offer,
  });
  if (decision.state === "rejected") {
    return <NewSalesIntakeClosed locale="pl" reason={decision.reason} />;
  }
  if (decision.state === "chooser") {
    return <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Zapytaj o sprawę</p>
      <h1 className="mt-5 max-w-xl text-4xl font-medium leading-tight tracking-tight">Jedno pytanie. Tylko niepoufne szczegóły.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">Wybierz Agent Action Security Review albo External Attack Surface Review. Nazwa wyświetlana, stary identyfikator albo swobodny opis nie wybiera innego przeglądu.</p>
      <div className="mt-10"><ContactForm compact landing locale="pl" /></div>
      <p className="mt-6 text-sm leading-6 text-text-muted">Ten formularz nie rozpoczyna pracy ani kontroli wobec celu.</p>
      <p className="mt-3 text-sm leading-6 text-text-muted">Wolisz e-mail? <a href={salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)} className="underline underline-offset-4">{PUBLIC_SALES_REVIEW_EMAIL}</a></p>
    </main>;
  }
  const agentActionOrder = decision.role === "offer";
  const publicExposureOrder = decision.role === "product";
  const buyerService = agentActionOrder
    ? buyerServiceByPublicOfferId(PUBLIC_AGENT_ACTION_OFFER.id)
    : buyerServiceByProductId(NEW_SALES_EXTERNAL_PRODUCT_ID);
  const selectedOffer = buyerService
    ? {
        name: buyerService.name.pl,
        situation: buyerService.situation.pl,
        price: buyerService.price.pl,
        timing: buyerService.timing.pl,
      }
    : undefined;

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
            ? "Wskaż jeden autoryzowany system dostępny z internetu, podstawę upoważnienia i powód, dla którego jego zewnętrzna powierzchnia ataku ma teraz znaczenie. Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia terminu realizacji. To nie jest test penetracyjny."
            : `${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. Najpierw potwierdzimy dopasowanie. Na razie bez sekretów i materiałów.`}
        </p>
        {selectedOffer ? <div className="mt-4 border-l-2 border-brand-accent pl-4 text-sm leading-6 text-text-secondary"><p className="sr-only">Wybrana oferta: {selectedOffer.name}</p><p>Cena: {selectedOffer.price}</p><p>Termin: {selectedOffer.timing}</p>{publicExposureOrder ? <p className="mt-2">Rozmowa sprzedażowa nie jest wymagana.</p> : null}</div> : null}
      </header>
      <div className="grid max-w-3xl gap-6">
        <section className="self-start border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
          <ContactForm
            compact={Boolean(selectedOffer)}
            locale="pl"
            intent={decision.intent}
          />
        </section>
        <details className="border-y border-surface-border">
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">Kolejne kroki i zakres</summary>
          <div className="space-y-4 pb-5">
          <section className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Co dalej
            </h2>
            {agentActionOrder ? (
              <ol className="mt-4 list-none space-y-3 text-sm leading-6 text-text-muted">
                <li>1. {PUBLIC_AGENT_ACTION_OFFER.fitCheckQuestion.pl} Bez sekretów.</li>
                <li>2. {PUBLIC_AGENT_ACTION_OFFER.unit.pl}. {PUBLIC_AGENT_ACTION_OFFER.price.pl}.</li>
                <li>3. {PUBLIC_AGENT_ACTION_OFFER.timing.pl}. Zgłoszenie nie rozpoczyna pracy.</li>
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
