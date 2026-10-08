import Link from "next/link";

import {
  newSalesRequestHref,
  NEW_SALES_AGENT_ACTION_OFFER_ID,
  NEW_SALES_EXTERNAL_PRODUCT_ID,
  type IntakeRejectionReason,
} from "@/lib/new-review-request-policy";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";

const copy = {
  en: {
    title: "This link does not start a new review",
    body: "New paid-review requests accept only Agent Action Security Review or External Attack Surface Review. A legacy, unknown, or conflicting identifier is not a request.",
    records:
      "Existing requests and issued agreements keep their original terms.",
    agent: PUBLIC_AGENT_ACTION_OFFER.name.en,
    external: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
    boundary: "No work or target-facing check starts from this page.",
  },
  pl: {
    title: "Ten link nie rozpoczyna nowego przeglądu",
    body: "Nowe płatne zgłoszenia przyjmują wyłącznie Agent Action Security Review albo External Attack Surface Review. Stary, nieznany albo sprzeczny identyfikator nie jest zgłoszeniem.",
    records:
      "Istniejące zgłoszenia i wydane uzgodnienia zachowują pierwotne warunki.",
    agent: PUBLIC_AGENT_ACTION_OFFER.name.pl,
    external: EXTERNAL_ATTACK_SURFACE_OFFER.name.pl,
    boundary: "Ta strona nie rozpoczyna pracy ani kontroli wobec celu.",
  },
} as const;

export function NewSalesIntakeClosed({
  locale,
  reason,
}: {
  locale: "en" | "pl";
  reason: IntakeRejectionReason;
}) {
  const text = copy[locale];
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-6 py-16 lg:py-24"
      data-intake-rejection={reason}
    >
      <h1 className="text-4xl font-semibold">{text.title}</h1>
      <p className="mt-5 leading-7">{text.body}</p>
      <p className="mt-5 leading-7">{text.records}</p>
      <ul className="mt-6 space-y-3">
        <li>
          <Link className="underline" href={newSalesRequestHref(locale, NEW_SALES_AGENT_ACTION_OFFER_ID)}>
            {text.agent}
          </Link>
        </li>
        <li>
          <Link className="underline" href={newSalesRequestHref(locale, NEW_SALES_EXTERNAL_PRODUCT_ID)}>
            {text.external}
          </Link>
        </li>
      </ul>
      <p className="mt-6 text-sm leading-6 text-text-muted">{text.boundary}</p>
    </main>
  );
}
