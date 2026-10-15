import Link from "next/link";

import { withdrawnOfferCopy } from "@/lib/withdrawn-offer-routes";

/** Withdrawal notice rendered inside the public site shell. */
export function WithdrawnOfferNotice({ polish }: { polish: boolean }) {
  const copy = withdrawnOfferCopy(polish);

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        WitnessOps
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
        {copy.title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">{copy.body}</p>
      <ul className="mt-8 space-y-3 text-base">
        {copy.links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-brand-accent underline underline-offset-4">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
