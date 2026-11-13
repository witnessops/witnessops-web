import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChronicleBody, ChroniclePager } from "@/components/marketing/chronicle-body";
import { ChronicleAudioPlayer } from "@/components/marketing/chronicle-audio-player";
import { getChronicleNarration } from "@/lib/chronicle-narration";
import { EditorialHero } from "@/components/editorial/editorial-article";
import { getChronicleArtwork } from "@/lib/chronicle-illustrations";
import {
  CHRONICLE_FICTION_LABEL,
  ALL_CHAPTERS,
  chronicleJsonLd,
} from "@/lib/chronicles";
import { canonicalUrl } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_CHAPTERS.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = ALL_CHAPTERS.find((item) => item.slug === slug);
  if (!chapter) return {};
  const title = `${chapter.title} · The Sovereign Chronicles`;
  return {
    title,
    description: chapter.description,
    alternates: { canonical: canonicalUrl(`/chronicles/${chapter.slug}`) },
    openGraph: {
      title,
      description: chapter.description,
      type: "article",
      siteName: "WitnessOps",
      images: DEFAULT_OPEN_GRAPH_IMAGES,
    },
    twitter: {
      images: DEFAULT_TWITTER_IMAGES,
      card: "summary_large_image",
      title,
      description: chapter.description,
    },
  };
}

export default async function ChronicleChapterPage({ params }: PageProps) {
  const { slug } = await params;
  const chapter = ALL_CHAPTERS.find((item) => item.slug === slug);
  if (!chapter) notFound();
  const narration = getChronicleNarration(chapter);
  const artwork = getChronicleArtwork(chapter);
  return (
    <main id="main-content" tabIndex={-1} className={artwork ? "px-6 pb-16 pt-4 sm:pb-20 sm:pt-6" : "px-6 py-16 sm:py-20"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(chronicleJsonLd(chapter)).replaceAll("<", "\\u003c") }} />
      {artwork ? <div className="mb-8 sm:mb-10"><EditorialHero hero={artwork.hero} priority /></div> : null}
      <article className="mx-auto max-w-[760px]" data-chronicle-article>
        <header className="border-b border-surface-border pb-10">
          <p className="wo-small text-text-muted">
            <Link href="/research" className="underline-offset-4 hover:underline">Research</Link>
            {" / "}
            <Link href="/chronicles" className="underline-offset-4 hover:underline">The Sovereign Chronicles</Link>
          </p>
          <p className="wo-mono-caps mt-8 text-brand-accent">{chapter.kicker}</p>
          <h1 data-chronicle-title className="wo-h1 mt-3 text-text-primary">{chapter.title}</h1>
          {chapter.subtitle ? <p className="wo-lead mt-4 text-text-secondary">{chapter.subtitle}</p> : null}
          <p data-chronicle-dateline className="wo-small mt-4 text-text-secondary">{chapter.dateline}</p>
          <p className="wo-small mt-2 text-text-muted">{chapter.meta}</p>
          <p className="wo-small mt-6 text-text-secondary">{CHRONICLE_FICTION_LABEL}</p>
          {narration ? <ChronicleAudioPlayer src={narration.src} title={chapter.title} durationSeconds={narration.durationSeconds} /> : null}
        </header>
        <ChronicleBody chapter={chapter} />
        <ChroniclePager chapter={chapter} />
      </article>
    </main>
  );
}
