import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getChronicleArtwork } from "@/lib/chronicle-illustrations";

import {
  CHRONICLE_SERIES_INTRO,
  BONUS_CHAPTERS,
  PUBLISHED_CHAPTERS,
  RESERVED_CHAPTERS,
  type ChronicleChapter,
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

function publishedChapter(id: ChronicleChapter["id"]) {
  const chapter = PUBLISHED_CHAPTERS.find((item) => item.id === id);
  if (!chapter) {
    throw new Error(`Missing published chronicle ${id}`);
  }
  return chapter;
}

const chapterOne = publishedChapter("001");
const chapterTwo = publishedChapter("002");
const chapterThree = publishedChapter("003");
const chapterFour = publishedChapter("004");
const chapterFive = publishedChapter("005");

const rows = [
  { ...chapterOne, kicker: "CHAPTER I · TUESDAY · 17:23", href: `/chronicles/${chapterOne.slug}` },
  { ...chapterTwo, kicker: "CHAPTER II · WEDNESDAY · 09:12", href: `/chronicles/${chapterTwo.slug}` },
  { ...chapterThree, kicker: "CHAPTER III · 15 OCTOBER 2026 · 02:40 WARSAW", href: `/chronicles/${chapterThree.slug}` },
  { ...chapterFour, kicker: "CHAPTER IV · 27 OCTOBER 2026 · 09:00", href: `/chronicles/${chapterFour.slug}` },
  { ...chapterFive, kicker: "CHAPTER V · 13 NOVEMBER 2026", href: `/chronicles/${chapterFive.slug}` },
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
        {rows.map((row) => {
          const hero = getChronicleArtwork(row)?.hero;
          return <li key={row.id} className={hero ? "grid items-center gap-5 py-6 sm:grid-cols-[220px_1fr]" : "py-6"}>
            {hero ? <Image src={hero.src} alt="" width={hero.width} height={hero.height} sizes="(max-width: 639px) calc(100vw - 48px), 220px" className="h-auto w-full border border-surface-border" /> : null}
            <div>
            <p className="wo-chapter-index text-brand-accent">{row.id}</p>
            <p className="wo-mono-caps mt-2 text-text-muted">{row.kicker}</p>
            <h3 className="wo-h3 mt-2 text-text-primary"><Link href={row.href} className="underline-offset-4 hover:underline">{row.title}</Link></h3>
            </div>
          </li>
        })}
      </ol>
      <section className="mt-12" aria-labelledby="bonus-chronicles-heading">
        <h2 id="bonus-chronicles-heading" className="wo-h3 text-text-primary">Receipts from the Future</h2>
        <ul className="mt-5 divide-y divide-surface-border border-y border-surface-border">
          {BONUS_CHAPTERS.map((chapter) => {
            const hero = getChronicleArtwork(chapter)?.hero;
            return <li key={chapter.id} className={hero ? "grid items-center gap-5 py-6 sm:grid-cols-[220px_1fr]" : "py-6"}>
              {hero ? <Image src={hero.src} alt="" width={hero.width} height={hero.height} sizes="(max-width: 639px) calc(100vw - 48px), 220px" className="h-auto w-full border border-surface-border" /> : null}
              <div>
                <p className="wo-chapter-index text-brand-accent">{chapter.id}</p>
                <p className="wo-mono-caps mt-2 text-text-muted">{chapter.dateline}</p>
                <h3 className="wo-h3 mt-2 text-text-primary"><Link href={`/chronicles/${chapter.slug}`} className="underline-offset-4 hover:underline">{chapter.title}</Link></h3>
              </div>
            </li>;
          })}
        </ul>
      </section>
      {RESERVED_CHAPTERS.map((nextChapter) => (
        <section key={nextChapter.id} className="mt-8 rounded-md border border-dashed border-surface-border p-5" aria-label={`Chapter ${nextChapter.id}, ${nextChapter.title}, coming soon`}>
          <p className="wo-mono-caps text-text-muted">{`Up next · Chapter ${nextChapter.id} · Coming soon · Not linked`}</p>
          <h3 className="wo-h3 mt-2 text-text-muted">{nextChapter.title}</h3>
          <p className="wo-small mt-2 text-text-muted">{nextChapter.teaser}</p>
        </section>
      ))}
      <p className="wo-small mt-10 text-text-secondary">
        Outside the stories, WitnessOps publishes one focused security review for new engagements.{" "}
        <Link href="/reviews" className="underline-offset-4 hover:underline">See the current review</Link>
      </p>
    </main>
  );
}
