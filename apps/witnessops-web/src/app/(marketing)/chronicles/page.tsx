import type { Metadata } from "next";
import Link from "next/link";

import {
  CHRONICLE_SERIES_INTRO,
  PUBLISHED_CHAPTERS,
  RESERVED_CHAPTERS,
} from "@/lib/chronicles";
import { canonicalUrl } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "The Sovereign Chronicles",
  description: CHRONICLE_SERIES_INTRO,
  alternates: { canonical: canonicalUrl("/chronicles") },
  openGraph: {
    title: "The Sovereign Chronicles",
    description: CHRONICLE_SERIES_INTRO,
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
};

function publishedChapter(id: "001" | "002" | "003") {
  const chapter = PUBLISHED_CHAPTERS.find((item) => item.id === id);
  if (!chapter) {
    throw new Error(`Missing published chronicle ${id}`);
  }
  return chapter;
}

const chapterOne = publishedChapter("001");
const chapterTwo = publishedChapter("002");
const chapterThree = publishedChapter("003");

const rows = [
  { ...chapterOne, kicker: "CHAPTER I · TUESDAY · 17:23", href: `/chronicles/${chapterOne.slug}` },
  { ...chapterTwo, kicker: "CHAPTER II · WEDNESDAY · 09:12", href: `/chronicles/${chapterTwo.slug}` },
  { ...chapterThree, kicker: "CHAPTER III · 15 OCTOBER 2026 · 02:40 WARSAW", href: `/chronicles/${chapterThree.slug}` },
] as const;

export default function ChroniclesIndexPage() {
  return (
    <main id="main-content" tabIndex={-1} className="relative mx-auto max-w-3xl px-6 py-16">
      {process.env.NEXT_PUBLIC_BRAND_WATERMARK === "1" ? (
        <div className="pointer-events-none absolute right-6 top-16" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-black.svg" alt="" className="wo-watermark wo-watermark--black" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-white.svg" alt="" className="wo-watermark wo-watermark--white" />
        </div>
      ) : null}
      <p className="wo-small text-text-muted"><Link href="/research" className="underline-offset-4 hover:underline">Research</Link> / The Sovereign Chronicles</p>
      <p className="wo-mono-caps mt-8 text-brand-accent">Series · Fiction</p>
      <h1 data-chronicle-title className="wo-h1 mt-3 text-text-primary">The Sovereign Chronicles</h1>
      <p className="wo-small mt-4 text-text-secondary">{CHRONICLE_SERIES_INTRO}</p>
      <ol className="mt-10 divide-y divide-surface-border border-y border-surface-border">
        {rows.map((row) => (
          <li key={row.id} className="py-6">
            <p className="wo-chapter-index text-brand-accent">{row.id}</p>
            <p className="wo-mono-caps mt-2 text-text-muted">{row.kicker}</p>
            <h3 className="wo-h3 mt-2 text-text-primary"><Link href={row.href} className="underline-offset-4 hover:underline">{row.title}</Link></h3>
          </li>
        ))}
      </ol>
      <section className="mt-8 rounded-md border border-dashed border-surface-border p-5" aria-label="Chapter 004, The Agent Who Scheduled a Meeting With Himself, coming soon">
        <p className="wo-mono-caps text-text-muted">Up next · Chapter IV · Coming soon · Not linked</p>
        <h3 className="wo-h3 mt-2 text-text-muted">{RESERVED_CHAPTERS[0].title}</h3>
        <p className="wo-small mt-2 text-text-muted">{RESERVED_CHAPTERS[0].teaser}</p>
      </section>
      <p className="wo-small mt-10 text-text-secondary">
        Outside the stories, WitnessOps runs two focused security reviews.{" "}
        <Link href="/reviews" className="underline-offset-4 hover:underline">Compare the two reviews</Link>
      </p>
    </main>
  );
}
