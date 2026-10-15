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
      <h1 className="mt-4 font-sans text-[48px] font-light leading-[56px] tracking-[-0.03em] text-text-primary">
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
