import Link from "next/link";

interface ManualCommercialConfirmationProps {
  email: string;
  issuanceId: string;
  locale: "en" | "pl";
  requestLabel: string;
  verifiedAt?: string | null;
}

const copy = {
  en: {
    eyebrow: "WitnessOps — manual review request",
    title: "Your request is queued for operator review.",
    verified: "Mailbox verified",
    request: "Requested path",
    reference: "Issuance reference",
    next: "What happens next",
    steps: [
      "We assess whether this request fits one bounded review.",
      "We confirm scope, authority, evidence handling, timing, and fee by email.",
      "Work begins only after those terms are explicitly agreed.",
    ],
    boundary:
      "No automated assessment, target-facing action, or other work has started from this mailbox confirmation.",
    catalogue: "Review the service catalogue",
  },
  pl: {
    eyebrow: "WitnessOps — zgłoszenie do ręcznego przeglądu",
    title: "Twoje zgłoszenie oczekuje na przegląd operatora.",
    verified: "Skrzynka e-mail potwierdzona",
    request: "Wybrana ścieżka",
    reference: "Numer zgłoszenia",
    next: "Co wydarzy się dalej",
    steps: [
      "Sprawdzimy, czy to zgłoszenie pasuje do jednego ograniczonego przeglądu.",
      "Potwierdzimy e-mailem zakres, upoważnienie, obsługę materiałów, termin i cenę.",
      "Praca rozpocznie się dopiero po jednoznacznym uzgodnieniu tych warunków.",
    ],
    boundary:
      "Potwierdzenie skrzynki nie uruchomiło automatycznej oceny, działań wobec celu ani żadnej innej pracy.",
    catalogue: "Zobacz katalog usług",
  },
} as const;

export function ManualCommercialConfirmation({
  email,
  issuanceId,
  locale,
  requestLabel,
  verifiedAt,
}: ManualCommercialConfirmationProps) {
  const text = copy[locale];

  return (
    <main
      className="min-h-screen bg-black text-zinc-100"
      data-testid="manual-commercial-confirmation"
    >
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <header>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-zinc-500">
            {text.eyebrow}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100">{text.title}</h1>
        </header>

        <section className="rounded border border-emerald-900 bg-emerald-950/30 px-4 py-3">
          <p className="text-sm font-medium text-emerald-300">{text.verified}</p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-500">{email}</p>
          {verifiedAt ? (
            <p className="mt-1 font-mono text-xs text-zinc-600">
              {verifiedAt.replace("T", " ").replace("Z", " UTC")}
            </p>
          ) : null}
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-950/60 p-5">
          <dl className="space-y-4">
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                {text.request}
              </dt>
              <dd className="mt-1 text-sm text-zinc-200">{requestLabel}</dd>
            </div>
            <div>
              <dt className="font-mono text-xs uppercase tracking-wider text-zinc-500">
                {text.reference}
              </dt>
              <dd className="mt-1 break-all font-mono text-sm text-zinc-300">
                {issuanceId}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            {text.next}
          </h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-zinc-300">
            {text.steps.map((step, index) => (
              <li key={step} className="border-l border-zinc-800 pl-4">
                <span className="mr-2 font-mono text-zinc-500">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded border border-amber-900/60 bg-amber-950/20 p-4">
          <p className="text-sm leading-6 text-amber-100">{text.boundary}</p>
        </section>

        <Link
          href={locale === "pl" ? "/pl/catalog" : "/catalog"}
          className="inline-flex min-h-11 items-center border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {text.catalogue}
        </Link>
      </div>
    </main>
  );
}
