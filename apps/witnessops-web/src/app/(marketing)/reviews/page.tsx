import type { Metadata } from "next";
import Link from "next/link";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "WitnessOps reviews: Agent Action Security Review and External Attack Surface Review. Prices exclude VAT.",
  alternates: { canonical: canonicalUrl("/reviews") },
};

const offers = [
  {
    name: PUBLIC_AGENT_ACTION_OFFER.name.en,
    price: PUBLIC_AGENT_ACTION_OFFER.price.en,
    href: "/catalog#agent-action-security-review",
  },
  {
    name: EXTERNAL_ATTACK_SURFACE_OFFER.name.en,
    price: EXTERNAL_ATTACK_SURFACE_OFFER.price.en,
    href: EXTERNAL_ATTACK_SURFACE_OFFER.route.en,
  },
] as const;

export default function ReviewsIndexPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-16">
      <h1 className="text-3xl text-text-primary" style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}>
        Reviews
      </h1>
      <p className="mt-4 text-text-secondary">
        Two reviews. The fee and the delivery timing are agreed in the signed statement of work.
      </p>
      <ul className="mt-8 flex flex-col gap-4">
        {offers.map((offer) => (
          <li key={offer.href} className="rounded-md border border-surface-border p-4">
            <Link href={offer.href} className="text-text-primary underline-offset-4 hover:underline">
              {offer.name}
            </Link>
            <p className="mt-1 text-sm text-text-secondary">{offer.price}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
