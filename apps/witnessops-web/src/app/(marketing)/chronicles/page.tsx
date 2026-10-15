import type { Metadata } from "next";
import Link from "next/link";

import { WitnessOpsMark } from "@/components/shared/witnessops-mark";
import {
  CHRONICLE_SERIES_INTRO,
  PUBLISHED_CHAPTERS,
  RESERVED_CHAPTERS,
} from "@/lib/chronicles";
import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "The Sovereign Chronicles",
  description: CHRONICLE_SERIES_INTRO,
  alternates: { canonical: canonicalUrl("/chronicles") },
  openGraph: {
    title: "The Sovereign Chronicles",
    description: CHRONICLE_SERIES_INTRO,
    images: ["/chronicles/og-placeholder.svg"],
  },
};

const rows = [
  { ...PUBLISHED_CHAPTERS[0], kicker: "CHAPTER I · TUESDAY · 17:23", href: `/chronicles/${PUBLISHED_CHAPTERS[0].slug}` },
  { id: "002", title: RESERVED_CHAPTERS[0].title, teaser: RESERVED_CHAPTERS[0].teaser, href: null, kicker: "CHAPTER II" },
  { ...PUBLISHED_CHAPTERS[1], kicker: "CHAPTER III · 15 OCTOBER 2026 · 02:40 WARSAW", href: `/chronicles/${PUBLISHED_CHAPTERS[1].slug}` },
] as const;

export default function ChroniclesIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="relative mx-auto max-w-3xl px-6 py-16">
      <div className="pointer-events-none absolute right-6 top-16 opacity-[0.07]" aria-hidden="true">
        <WitnessOpsMark variant="mark" size="lg" tone="current" decorative />
      </div>
      <p className="text-sm text-text-muted"><Link href="/research" className="underline-offset-4 hover:underline">Research</Link> / The Sovereign Chronicles</p>
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.18em] text-brand-accent">Series · Fiction</p>
      <h1 className="mt-3 text-5xl text-text-primary" style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>The Sovereign Chronicles</h1>
      <p className="mt-4 max-w-2xl text-text-secondary">{CHRONICLE_SERIES_INTRO}</p>
      <ol className="mt-10 divide-y divide-surface-border border-y border-surface-border">
        {rows.map((row) => (
          <li key={row.id} className="py-6">
            <p className="font-mono text-3xl text-brand-accent">{row.id}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-text-muted">{row.kicker}</p>
            {row.href ? (
              <h2 className="mt-2 text-2xl text-text-primary"><Link href={row.href} className="underline-offset-4 hover:underline">{row.title}</Link></h2>
            ) : (
              <p className="mt-2 text-2xl text-text-muted">Chapter 002, {row.title}, coming soon</p>
            )}
            {"teaser" in row && row.teaser ? <p className="mt-2 text-sm text-text-muted">{row.teaser} · Coming soon · Not yet linked</p> : null}
          </li>
        ))}
      </ol>
      <section className="mt-8 rounded-md border border-dashed border-surface-border p-5" aria-label="Chapter 004, The Agent Who Scheduled a Meeting With Himself, coming soon">
        <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Up next · Chapter IV · Coming soon · Not linked</p>
        <h2 className="mt-2 text-xl text-text-muted">{RESERVED_CHAPTERS[1].title}</h2>
        <p className="mt-2 text-sm text-text-muted">{RESERVED_CHAPTERS[1].teaser}</p>
      </section>
      <p className="mt-10 text-sm text-text-secondary">
        Outside the stories, WitnessOps runs two focused security reviews.{" "}
        <Link href="/reviews" className="underline-offset-4 hover:underline">Compare the two reviews</Link>
      </p>
    </main>
  );
}
