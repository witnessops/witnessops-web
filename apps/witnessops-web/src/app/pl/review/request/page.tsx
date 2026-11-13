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
      ? params.fitCall === "1" ? "Poproś o 20-minutową rozmowę z ekspertem" : `Zapytaj o ${PUBLIC_AGENT_ACTION_OFFER.name.pl}`
      : "To zgłoszenie nie rozpoczyna przeglądu",
    description: agentActionOrder
      ? params.fitCall === "1" ? "Podaj niepoufny temat, strefę czasową i dwa preferowane terminy. Operator potwierdzi dostępny termin zaproszeniem albo zaproponuje inne." : `${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. ${PUBLIC_AGENT_ACTION_OFFER.price.pl} ${PUBLIC_AGENT_ACTION_OFFER.fitCheck.pl}. ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}`
      : "Ten link nie jest dostępny dla nowych zleceń. Istniejące zgłoszenia i podpisane umowy zachowują pierwotne warunki.",
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
  if (params.fitCall === "1") {
    return (
      <>
        <main id="main-content" tabIndex={-1} className="buyer-page">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-12">
            <header className="mb-6 max-w-[720px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">{PUBLIC_AGENT_ACTION_OFFER.name.pl}</p>
              <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl">Porozmawiaj z ekspertem</h1>
              <p className="mt-4 text-base leading-7 text-text-muted">Poproś o 20-minutową rozmowę. Podaj tylko krótki, niepoufny temat, służbowy adres e-mail, strefę czasową i dwa preferowane terminy. To prośba, a nie rezerwacja.</p>
              <p className="mt-3 text-sm leading-6 text-text-secondary">Po potwierdzeniu adresu kodem operator sprawdzi dostępność i potwierdzi termin zaproszeniem albo zaproponuje inne. {PUBLIC_AGENT_ACTION_OFFER.price.pl} To zgłoszenie nie upoważnia do rozpoczęcia przeglądu.</p>
            </header>
            <section className="border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
              <ContactForm compact fitCall locale="pl" intent={decision.intent} />
            </section>
          </div>
        </main>
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
            ? "Zacznij od sprawdzenia dopasowania. Nie wysyłaj sekretów."
            : "Opowiedz, co wymaga sprawdzenia"}
        </h1>
        <p className="mt-4 text-base leading-7 text-text-muted">
          Napisz, jakie to działanie, jakich systemów dotyczy i do kiedy potrzebujesz decyzji.
        </p>
        {selectedOffer ? <div className="mt-4 border-l-2 border-brand-accent pl-4 text-sm leading-6 text-text-secondary"><p className="sr-only">Wybrana oferta: {selectedOffer.name}</p><p>{selectedOffer.price}</p><p>{selectedOffer.timing}</p></div> : null}
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
              <li>1. Wyślij krótki opis i potwierdź adres e-mail kodem z wiadomości.</li>
              <li>2. Sprawdzimy, czy przegląd odpowiada Twojej potrzebie, i odpowiemy e-mailem.</li>
              <li>3. Przed pracą uzgodnimy zakres, upoważnienie, opłatę, termin i sposób przekazania materiałów. Samo zgłoszenie nie rozpoczyna przeglądu.</li>
            </ol>
          </section>
          <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Materiały dopiero po uzgodnieniu zasad</h2><p className="mt-3 text-sm leading-6 text-text-muted">Nie dołączaj logów, zrzutów ekranu, kodu ani danych klientów. Sposób przekazania i wykorzystania materiałów ustalimy po ocenie zapytania.</p></section>
          {selectedOffer ? <section className="border border-surface-border bg-surface-bg p-5"><h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Dla kogo jest przegląd</h2><p className="mt-3 text-sm leading-6 text-text-muted">{selectedOffer.situation}</p></section> : null}
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
