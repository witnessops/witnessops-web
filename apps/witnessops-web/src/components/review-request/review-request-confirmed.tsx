"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { verificationLight } from "@/components/shared/verification-light-shell";
import {
  buyerCatalogHref,
  buyerServiceById,
  type BuyerService,
} from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import {
  readReviewRequestConfirmation,
  type ReviewRequestConfirmation,
  type ReviewRequestConfirmationLocale,
  type ReviewRequestKind,
} from "@/lib/review-request-confirmation";
import { ReviewRequestRecord } from "./review-request-record";

const serviceIdByRequestKind: Partial<
  Record<ReviewRequestKind, BuyerService["id"]>
> = {
  "customer-security-review-sprint": "customer-security-review-sprint",
  "one-server-security-check": "one-server-security-check",
  "launch-readiness-check": "launch-readiness-check",
  "key-access-custody-review": "key-access-custody-review",
  "incident-readiness-review": "incident-readiness-review",
  "professional-public-footprint-audit":
    "professional-public-footprint-audit",
};

const copy = {
  en: {
    loading: "Loading the browser-held request record…",
    eyebrow: "Review request / recorded",
    title: "You have the boundary record.",
    intro:
      "Keep the reference below. WitnessOps now has the non-secret request summary for asynchronous fit and scope review.",
    boundaryNote:
      "Do not send secrets or source materials until scope and evidence handling are agreed. No security, legal, or compliance conclusion has been made.",
    nextLabel: "What happens next",
    nextSteps: [
      "We assess whether this request fits one bounded review.",
      "We confirm scope, authority, evidence handling, timing, and fee by email.",
      "Work begins only after those terms are explicitly agreed.",
    ],
    primaryOfferNextSteps: [
      `We assess whether ${PRIMARY_OFFER.unit.en.toLowerCase()} fits the reconstruction boundary without asking for secrets.`,
      `If it fits, ${PRIMARY_OFFER.price.en}; we agree scope, evidence rules, exclusions, and evidence handling before source material is accepted.`,
      `${PRIMARY_OFFER.timing.en}.`,
    ],
    publicExposureNextSteps: [
      "We assess whether the requested public system fits one authorized, fixed-scope review.",
      "We confirm payment, the SOW, written authority, required inputs, evidence handling, and the collection window by email.",
      "Target-facing work starts only after every condition above is confirmed.",
    ],
    waitLabel: "Inspect while you wait",
    specimen: "Inspect a sample review record",
    accessChangeSpecimen: "Inspect an access-change proof sample",
    publicExposureSpecimen: "Inspect the Public Exposure Review sample",
    proofModel: "Read the proof model",
    serviceCatalogue: "Explore the service catalogue",
    missingEyebrow: "Review request / no local record",
    missingTitle: "This page alone proves nothing.",
    missingBody:
      "No confirmed request record is present in this browser session. Open this page through the mailbox-verification flow; a direct visit does not establish that a mailbox or request was verified.",
    restart: "Start a scoped request",
  },
  pl: {
    loading: "Wczytywanie zapisu zgłoszenia przechowywanego w przeglądarce…",
    eyebrow: "Zgłoszenie przeglądu / zapisane",
    title: "Masz zapis granicy zgłoszenia.",
    intro:
      "Zachowaj poniższy numer referencyjny. WitnessOps ma teraz niepoufne podsumowanie zgłoszenia do asynchronicznej oceny dopasowania i zakresu.",
    boundaryNote:
      "Nie wysyłaj sekretów ani materiałów źródłowych, dopóki nie uzgodnimy zakresu i sposobu ich obsługi. Nie sformułowano żadnych wniosków dotyczących bezpieczeństwa, kwestii prawnych ani zgodności.",
    nextLabel: "Co wydarzy się dalej",
    nextSteps: [
      "Sprawdzimy, czy to zgłoszenie pasuje do jednego ograniczonego przeglądu.",
      "Potwierdzimy e-mailem zakres, upoważnienie, obsługę materiałów, termin i cenę.",
      "Praca rozpocznie się dopiero po jednoznacznym uzgodnieniu tych warunków.",
    ],
    primaryOfferNextSteps: [
      `Sprawdzimy bez sekretów, czy ${PRIMARY_OFFER.unit.pl.toLowerCase()} pasuje do zakresu rekonstrukcji.`,
      `Jeśli pasuje, ${PRIMARY_OFFER.price.pl.toLowerCase()}; przed przyjęciem materiałów uzgodnimy zakres, zasady dowodowe, wyłączenia i sposób obsługi.`,
      `${PRIMARY_OFFER.timing.pl}.`,
    ],
    publicExposureNextSteps: [
      "Sprawdzimy, czy zgłoszony publiczny system pasuje do jednego autoryzowanego przeglądu o stałym zakresie.",
      "Potwierdzimy e-mailem płatność, SOW, pisemne upoważnienie, wymagane dane wejściowe, obsługę materiałów i okno zbierania.",
      "Praca wobec celu rozpocznie się dopiero po potwierdzeniu wszystkich tych warunków.",
    ],
    waitLabel: "Sprawdź w oczekiwaniu",
    specimen: "Sprawdź przykładowy zapis przeglądu (EN)",
    accessChangeSpecimen: "Sprawdź przykład zmiany dostępu (EN)",
    publicExposureSpecimen: "Sprawdź przykład Public Exposure Review (EN)",
    proofModel: "Przeczytaj model dowodowy",
    serviceCatalogue: "Zobacz katalog usług",
    missingEyebrow: "Zgłoszenie przeglądu / brak lokalnego zapisu",
    missingTitle: "Ta strona sama niczego nie dowodzi.",
    missingBody:
      "W tej sesji przeglądarki nie ma potwierdzonego zapisu zgłoszenia. Otwórz tę stronę przez proces weryfikacji skrzynki; bezpośrednia wizyta nie potwierdza skrzynki ani zgłoszenia.",
    restart: "Rozpocznij zgłoszenie zakresu",
  },
} as const;

export function ReviewRequestConfirmed({
  locale,
}: {
  locale: ReviewRequestConfirmationLocale;
}) {
  const [confirmation, setConfirmation] = useState<
    ReviewRequestConfirmation | null | undefined
  >(undefined);
  const text = copy[locale];

  useEffect(() => {
    setConfirmation(readReviewRequestConfirmation(window.sessionStorage, locale));
  }, [locale]);

  if (confirmation === undefined) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[60vh] max-w-[960px] px-6 py-12 md:py-16"
        aria-busy="true"
      >
        <p className={verificationLight.label}>WitnessOps / request record</p>
        <p className={`mt-4 text-sm ${verificationLight.muted}`}>
          {text.loading}
        </p>
      </main>
    );
  }

  if (!confirmation) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-[60vh] max-w-[760px] px-6 py-12 md:py-16"
        data-ui-proof-id="review-request-record-missing"
      >
        <p className={`${verificationLight.label} ${verificationLight.trust}`}>
          {text.missingEyebrow}
        </p>
        <h1
          className={`mt-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-5xl ${verificationLight.title}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {text.missingTitle}
        </h1>
        <p className={`mt-5 max-w-[640px] text-base leading-relaxed ${verificationLight.body}`}>
          {text.missingBody}
        </p>
        <Link
          href={locale === "pl" ? "/pl/review/request" : "/review/request"}
          className="mt-7 inline-flex min-h-12 items-center border border-[#b94716] bg-[#b94716] px-5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b94716] focus-visible:ring-offset-2"
        >
          {text.restart}
        </Link>
      </main>
    );
  }

  const publicExposureReview =
    confirmation.requestKind === "public-exposure-review";
  const primaryOfferRequest =
    confirmation.requestKind === "agent-risk-control-review";
  const aiAgentActionProofRun =
    confirmation.requestKind === "ai-agent-action-proof-run";
  const accessChangeProofRun =
    confirmation.requestKind === "access-change-proof-run";
  const nextSteps = publicExposureReview
    ? text.publicExposureNextSteps
    : primaryOfferRequest
      ? text.primaryOfferNextSteps
      : text.nextSteps;
  const proofResource = publicExposureReview
    ? {
        href: "/review/sample-cases/external-exposure-assessment",
        label: text.publicExposureSpecimen,
      }
    : primaryOfferRequest || aiAgentActionProofRun
      ? {
          href: "/review/sample-cases/ai-agent-action-proof-run",
          label: text.specimen,
        }
      : accessChangeProofRun
        ? {
            href: "/review/sample-cases/access-removed-proof",
            label: text.accessChangeSpecimen,
          }
      : undefined;
  const serviceId = serviceIdByRequestKind[confirmation.requestKind];
  const selectedService = serviceId ? buyerServiceById(serviceId) : undefined;
  const selectedServiceResource = selectedService
    ? {
        href:
          selectedService.detailHref[locale] ?? buyerCatalogHref(locale),
        label:
          locale === "pl"
            ? `Sprawdź usługę: ${selectedService.name.pl}`
            : `Review ${selectedService.name.en}`,
      }
    : {
        href: buyerCatalogHref(locale),
        label: text.serviceCatalogue,
      };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-[1040px] px-6 py-12 md:py-16"
      data-ui-proof-id="review-request-confirmed"
    >
      <section className="mb-10 max-w-[760px]">
        <p className={`${verificationLight.label} ${verificationLight.trust}`}>
          {text.eyebrow}
        </p>
        <h1
          className={`mt-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] md:text-5xl ${verificationLight.title}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {text.title}
        </h1>
        <p className={`mt-5 max-w-[680px] text-base leading-relaxed ${verificationLight.body}`}>
          {text.intro}
        </p>
        <p className={`mt-4 max-w-[680px] text-sm leading-relaxed ${verificationLight.muted}`}>
          {text.boundaryNote}
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <ReviewRequestRecord confirmation={confirmation} />

        <aside className="space-y-4">
          <section className={`p-5 ${verificationLight.card}`}>
            <h2 className={`mb-4 ${verificationLight.label}`}>
              {text.nextLabel}
            </h2>
            <ol className={`space-y-4 text-sm leading-relaxed ${verificationLight.body}`}>
              {nextSteps.map((item, index) => (
                <li key={item} className="grid grid-cols-[28px_1fr] gap-2">
                  <span
                    className={verificationLight.accent}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className={`p-5 ${verificationLight.card}`}>
            <h2 className={`mb-3 ${verificationLight.label}`}>
              {text.waitLabel}
            </h2>
            <div className="space-y-2 text-sm">
              <Link
                href={proofResource?.href ?? selectedServiceResource.href}
                className={`block min-h-11 border border-[#e4e0d8] bg-[#faf9f7] p-3 font-semibold transition hover:border-[#b94716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b94716] focus-visible:ring-offset-2 ${verificationLight.title}`}
              >
                {proofResource?.label ?? selectedServiceResource.label}
              </Link>
              {proofResource ? (
                <Link
                href={
                  locale === "pl"
                    ? "/pl/docs/how-receipts-work"
                    : "/docs/how-it-works/proof-model"
                }
                className={`block min-h-11 border border-[#e4e0d8] bg-[#faf9f7] p-3 font-semibold transition hover:border-[#b94716] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b94716] focus-visible:ring-offset-2 ${verificationLight.title}`}
              >
                {text.proofModel}
              </Link>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-10">
        <PublicContactRoute locale={locale} subject="fit-check" />
      </div>
    </main>
  );
}
