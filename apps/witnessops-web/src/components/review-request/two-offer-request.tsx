import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { BUYER_SERVICES, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { publicPaidReviews } from "@/lib/public-paid-reviews";
import { resolveNewReviewSelection } from "@/lib/new-review-request-policy";
import { linkedinPremiumCampaignAttribution } from "@/lib/marketing-attribution";
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_SUBJECTS, publicContactMailto } from "@/lib/public-contact";
import { languageAlternates } from "@/lib/public-seo";

export type ReviewSearchParams = Record<string, string | string[] | undefined>;

const copy = {
  en: {
    title: "Choose a security review", description: "Choose the AI Agent Tools & Access Review or External Attack Surface Review. Agree scope, authority, price and handling before work begins.",
    choose: "Which review fits your decision?", chooseBody: "Choose one of the two paid reviews. A fit enquiry is not a booking or permission to inspect a system.",
    unavailable: "This link does not select a current offer", unavailableBody: "The selection is retired, unknown or ambiguous. Nothing has been substituted. Choose a current review below. Earlier requests and accepted agreements retain their original terms.",
    request: "Tell us what you need to understand", aiCta: "Scope an AI review", externalCta: "Scope an external review",
    aiIntro: "Name the agent setup, selected connection, device class and one consequential action. Describe the decision or deadline without sending source material or secrets.",
    externalIntro: "Name one authorised internet-facing system, the decision or deadline and your authority to commission the review. This is not a penetration test.",
    scope: "Scope and start conditions", next: "We confirm fit, capacity, the exact boundary, authority, price, timing, inputs, handling and recipients before work starts.",
    boundary: "No review or target-facing check starts from this form. Payment and mailbox verification alone do not authorise inspection.",
    retest: "For new external engagements, the included focused retest of reported findings is within 30 calendar days beginning at initial report handover.",
    email: "Not sure which fits? Send a non-secret fit question by email:", details: "See scope and deliverables",
  },
  pl: {
    title: "Wybierz przegląd bezpieczeństwa", description: "Wybierz przegląd narzędzi i dostępu agenta AI albo External Attack Surface Review. Najpierw uzgodnimy zakres, upoważnienie, cenę i obsługę materiałów.",
    choose: "Który przegląd pomoże w Twojej decyzji?", chooseBody: "Wybierz jeden z dwóch płatnych przeglądów. Pytanie o dopasowanie nie rezerwuje pracy ani nie upoważnia do inspekcji systemu.",
    unavailable: "Ten link nie wybiera aktualnej oferty", unavailableBody: "Wybór jest historyczny, nieznany lub niejednoznaczny. Nie zastąpiliśmy go inną usługą. Wybierz aktualny przegląd poniżej. Wcześniejsze zgłoszenia i zaakceptowane umowy zachowują swoje warunki.",
    request: "Opisz, co chcesz zrozumieć", aiCta: "Omów przegląd agenta AI", externalCta: "Omów przegląd ekspozycji",
    aiIntro: "Wskaż konfigurację agenta, wybrane połączenie, rodzaj urządzenia i jedno istotne działanie. Opisz decyzję lub termin bez przesyłania materiałów źródłowych i sekretów.",
    externalIntro: "Wskaż jeden autoryzowany system dostępny z internetu, decyzję lub termin i podstawę upoważnienia do przeglądu. To nie jest test penetracyjny.",
    scope: "Zakres i warunki rozpoczęcia", next: "Przed pracą potwierdzimy dopasowanie, dostępność, dokładny zakres, upoważnienie, cenę, termin, wymagane dane, obsługę materiałów i odbiorców.",
    boundary: "Ten formularz nie rozpoczyna przeglądu ani sprawdzeń wobec celu. Sama płatność i weryfikacja skrzynki nie upoważniają do inspekcji.",
    retest: "Dla nowych przeglądów ekspozycji jedno sprawdzenie zgłoszonych ustaleń jest wliczone w okresie 30 dni kalendarzowych od przekazania pierwszego raportu.",
    email: "Nie wiesz, który wybrać? Wyślij niepoufne pytanie o dopasowanie:", details: "Zobacz zakres i wyniki",
  },
} as const;

export function twoOfferRequestMetadata(locale: BuyerLocale): Metadata {
  const text = copy[locale];
  return {
    title: text.title, description: text.description,
    alternates: languageAlternates(locale === "pl" ? "/pl/review/request" : "/review/request", { en: "/review/request", pl: "/pl/review/request" }),
    openGraph: { title: `${text.title} | WitnessOps`, description: text.description, siteName: "WitnessOps", type: "website" },
    twitter: { card: "summary_large_image", title: `${text.title} | WitnessOps`, description: text.description },
  };
}

export function TwoOfferRequest({ locale, params }: { locale: BuyerLocale; params: ReviewSearchParams }) {
  const text = copy[locale];
  const selection = resolveNewReviewSelection(params);
  const services = publicPaidReviews(BUYER_SERVICES);
  const service = selection.kind === "selected" ? services.find(({ id }) => id === selection.serviceId) : undefined;
  if (selection.kind === "selected" && !service) throw new Error("Selected public review is unavailable");
  const external = service?.id === "external-exposure-assessment";
  return <main id="main-content" tabIndex={-1} className="buyer-page" data-request-selection={service?.id ?? selection.kind}>
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <h1 className="text-4xl font-semibold leading-tight tracking-tight text-text-primary">{service ? text.request : selection.kind === "unavailable" ? text.unavailable : text.choose}</h1>
      <p className="mt-5 text-base leading-7 text-text-secondary">{service ? external ? text.externalIntro : text.aiIntro : selection.kind === "unavailable" ? text.unavailableBody : text.chooseBody}</p>
      {service && selection.kind === "selected" ? <>
        <section className="mt-7 border border-surface-border p-5" aria-label={service.name[locale]}>
          <h2 className="text-2xl font-semibold">{service.name[locale]}</h2>
          <p className="mt-3">{service.price[locale]}</p><p className="mt-2 text-sm leading-6">{service.timing[locale]}</p>
          <p className="mt-3 text-sm leading-6">{service.result[locale]}</p>
          {external ? <p className="mt-3 text-sm leading-6">{text.retest}</p> : null}
          {service.detailHref[locale] ? <Link href={service.detailHref[locale]!} className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">{text.details}</Link> : null}
        </section>
        <div className="mt-8"><ContactForm key={selection.intent} locale={locale} intent={selection.intent} compact campaignAttribution={linkedinPremiumCampaignAttribution(params)} /></div>
        <details className="mt-6 border-y border-surface-border py-4"><summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2">{text.scope}</summary><p className="mt-3 text-sm leading-6">{service.boundary[locale]}</p><p className="mt-3 text-sm leading-6">{text.next}</p></details>
      </> : <div className="mt-8 grid gap-5">{services.map((review, index) => <article key={review.id} data-review-choice={review.id} className="border border-surface-border p-5">
        <h2 className="text-2xl font-semibold">{review.name[locale]}</h2><p className="mt-3">{review.price[locale]}</p><p className="mt-3 text-sm leading-6">{review.situation[locale]}</p>
        <Link href={buyerServiceRequestHref(locale, review)} className="mt-4 inline-flex min-h-11 items-center border border-brand-accent px-5 font-semibold focus-visible:outline focus-visible:outline-2">{index === 0 ? text.aiCta : text.externalCta}</Link>
      </article>)}</div>}
      <p className="mt-6 text-sm leading-6 text-text-muted">{text.boundary}</p>
      <p className="mt-4 text-sm leading-6">{text.email} <a className="underline underline-offset-4" href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)}>{PUBLIC_CONTACT_EMAIL}</a></p>
    </div>
  </main>;
}
