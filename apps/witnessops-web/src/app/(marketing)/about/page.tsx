import type { Metadata } from "next";
import Link from "next/link";

import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "About",
  description: "WitnessOps is the organization that publishes the reviews and the records other people can check.",
  alternates: { canonical: canonicalUrl("/about") },
};

export default function AboutPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Organization</p>
      <h1 className="mt-3 text-4xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}>
        About WitnessOps
      </h1>
      <p className="mt-4 text-text-secondary">
        WitnessOps is an organization. It publishes one review for new engagements and the records that let someone else check the work.
      </p>
      <p className="mt-4 text-text-secondary">
        Registered details stay on the <Link href="/company" className="underline-offset-4 hover:underline">company page</Link>.
        Contact <a href="mailto:engage@mail.witnessops.com" className="underline-offset-4 hover:underline">engage@mail.witnessops.com</a>.
      </p>
    </main>
  );
}
