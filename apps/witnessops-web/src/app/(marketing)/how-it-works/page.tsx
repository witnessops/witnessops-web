import type { Metadata } from "next";
import Link from "next/link";

import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "How a review works",
  description: "Scope, authority and evidence handling are agreed before a WitnessOps review starts.",
  alternates: { canonical: canonicalUrl("/how-it-works") },
};

const steps = [
  ["Agree the boundary", "Scope, exclusions, price, authority and evidence handling are agreed before work starts."],
  ["Start without secrets", "The initial enquiry uses a short, non-secret description. Do not send credentials or production evidence."],
  ["Understand the limits", "The report distinguishes supported findings, unavailable evidence and questions the review could not answer."],
] as const;

export default function HowItWorksPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">How a review works</p>
      <h1 className="mt-3 text-4xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}>
        Scope before work. Evidence beside findings.
      </h1>
      <ol className="mt-8 space-y-6">
        {steps.map(([title, body], index) => (
          <li key={title}>
            <h2 className="text-lg text-text-primary">{`0${index + 1} ${title}`}</h2>
            <p className="mt-1 text-text-secondary">{body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-text-muted">Delivery timing agreed in the signed statement of work.</p>
      <p className="mt-4 text-sm text-text-secondary">
        <Link href="/reviews/agent-action-security-review" className="underline-offset-4 hover:underline">See the current review</Link>
        {" · "}
        <Link href="/early-access" className="underline-offset-4 hover:underline">How the app works</Link>
        {" · "}
        <Link href="/contact" className="underline-offset-4 hover:underline">Discuss a review</Link>
      </p>
    </main>
  );
}
