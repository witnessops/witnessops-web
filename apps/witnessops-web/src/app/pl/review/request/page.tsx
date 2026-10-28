import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { ContactCompanyDetails } from "@/components/marketing/company-details";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { buyerServiceByPublicOfferId } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { NewSalesIntakeClosed } from "@/components/review-request/new-sales-intake-closed";
import { resolveNewSalesPageQuery } from "@/lib/new-review-request-policy";
import { languageAlternates } from "@/lib/public-seo";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const decision = resolveNewSalesPageQuery({
    offerId: params.offerId,
    productId: params.productId,
    offer: params.offer,
  });
  const agentActionOrder = decision.state === "selected";

  return {
    title: agentActionOrder
      ? `Rozpocznij ${PUBLIC_AGENT_ACTION_OFFER.name.pl}`
      : "To zgłoszenie nie rozpoczyna przeglądu",
    description: agentActionOrder
      ? `${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. ${PUBLIC_AGENT_ACTION_OFFER.price.pl}. ${PUBLIC_AGENT_ACTION_OFFER.fitCheck.pl}. ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}.`
      : "Nowe płatne zgłoszenia przyjmują wyłącznie Agent Action Security Review. Aby zapytać o ten link, napisz na engage@mail.witnessops.com.",
    alternates: languageAlternates("/pl/contact", {
      en: "/contact",
      pl: "/pl/contact",
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
    return (
      <>
        <NewSalesIntakeClosed locale="pl" reason={decision.reason} />
        <ContactCompanyDetails locale="pl" />
      </>
    );
  }
  const buyerService = buyerServiceByPublicOfferId(PUBLIC_AGENT_ACTION_OFFER.id);
  const selectedOffer = buyerService
    ? {
        name: buyerService.name.pl,
        situation: buyerService.situation.pl,
        price: buyerService.price.pl,
        timing: buyerService.timing.pl,
      }
    : undefined;

  return (
    <>
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
          {`${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. Najpierw potwierdzimy dopasowanie. Na razie bez sekretów i materiałów.`}
        </p>
        {selectedOffer ? <div className="mt-4 border-l-2 border-brand-accent pl-4 text-sm leading-6 text-text-secondary"><p className="sr-only">Wybrana oferta: {selectedOffer.name}</p><p>Cena: {selectedOffer.price}</p><p>Termin: {selectedOffer.timing}</p></div> : null}
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
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary">Kolejne kroki i zakres</summary>
          <div className="space-y-4 pb-5">
          <section className="border border-surface-border bg-surface-bg p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Co dalej
            </h2>
            <ol className="mt-4 list-none space-y-3 text-sm leading-6 text-text-muted">
              <li>1. {PUBLIC_AGENT_ACTION_OFFER.fitCheckQuestion.pl} Bez sekretów.</li>
              <li>2. {PUBLIC_AGENT_ACTION_OFFER.unit.pl}. {PUBLIC_AGENT_ACTION_OFFER.price.pl}.</li>
              <li>3. {PUBLIC_AGENT_ACTION_OFFER.timing.pl}. Zgłoszenie nie rozpoczyna pracy.</li>
            </ol>
          </section>
          <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Ważna granica</h2><p className="mt-3 text-sm leading-6 text-text-muted">Samo zgłoszenie nie rozpoczyna pracy. Nie przyjmujemy materiałów klienta, dopóki nie uzgodnimy zakresu i sposobu ich obsługi.</p></section>
          {selectedOffer ? <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Wybrana sytuacja</h2><p className="mt-3 text-sm leading-6 text-text-muted">{selectedOffer.situation}</p></section> : null}
          </div>
        </details>
      </div>
      <div className="mt-10"><PublicContactRoute locale="pl" /></div>
      </div>
    </main>
    <ContactCompanyDetails locale="pl" />
    </>
  );
}
