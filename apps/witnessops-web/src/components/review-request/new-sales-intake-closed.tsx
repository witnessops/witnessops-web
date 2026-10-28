import Link from "next/link";

import {
  newSalesRequestHref,
  type IntakeRejectionReason,
} from "@/lib/new-review-request-policy";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

const copy = {
  en: {
    title: "This link does not start a new review",
    body: `New paid-review requests accept only ${PUBLIC_AGENT_ACTION_OFFER.name.en}. A legacy, unknown, or conflicting identifier is not a request. To ask about this link, email engage@mail.witnessops.com.`,
    records:
      "Existing requests and issued agreements keep their original terms.",
    agent: PUBLIC_AGENT_ACTION_OFFER.name.en,
    boundary: "No work or target-facing check starts from this page.",
  },
  pl: {
    title: "Ten link nie rozpoczyna nowego przeglądu",
    body: `Nowe płatne zgłoszenia przyjmują wyłącznie ${PUBLIC_AGENT_ACTION_OFFER.name.pl}. Stary, nieznany albo sprzeczny identyfikator nie jest zgłoszeniem. Aby zapytać o ten link, napisz na engage@mail.witnessops.com.`,
    records:
      "Istniejące zgłoszenia i wydane uzgodnienia zachowują pierwotne warunki.",
    agent: PUBLIC_AGENT_ACTION_OFFER.name.pl,
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
          <Link className="underline" href={newSalesRequestHref(locale)}>
            {text.agent}
          </Link>
        </li>
      </ul>
      <p className="mt-6 text-sm leading-6 text-text-muted">{text.boundary}</p>
    </main>
  );
}
