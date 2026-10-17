import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChronicleBody, ChroniclePager } from "@/components/marketing/chronicle-body";
import {
  CHRONICLE_FICTION_LABEL,
  PUBLISHED_CHAPTERS,
  chronicleJsonLd,
} from "@/lib/chronicles";
import { canonicalUrl } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PUBLISHED_CHAPTERS.map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = PUBLISHED_CHAPTERS.find((item) => item.slug === slug);
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
  const chapter = PUBLISHED_CHAPTERS.find((item) => item.slug === slug);
  if (!chapter) notFound();
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[680px] px-6 py-16">
      <link rel="preload" href="/fonts/newsreader-400.woff2" as="font" type="font/woff2" crossOrigin="" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(chronicleJsonLd(chapter)).replaceAll("<", "\\u003c") }} />
      <p className="wo-small text-text-muted">
        <Link href="/research" className="underline-offset-4 hover:underline">Research</Link>
        {" / "}
        <Link href="/chronicles" className="underline-offset-4 hover:underline">The Sovereign Chronicles</Link>
      </p>
      <p className="wo-mono-caps mt-8 text-brand-accent">{chapter.kicker}</p>
      <h1 data-chronicle-title className="wo-h1 mt-3 text-text-primary">{chapter.title}</h1>
      {chapter.subtitle ? <p className="wo-lead mt-4 text-text-secondary">{chapter.subtitle}</p> : null}
      <p className="wo-mono-caps mt-4 text-text-secondary">{chapter.dateline}</p>
      <p className="wo-small mt-2 text-text-muted">{chapter.meta}</p>
      <p className="wo-small mt-6 rounded-md border border-brand-accent/40 bg-surface-inset px-4 py-3 text-text-primary">{CHRONICLE_FICTION_LABEL}</p>
      <ChronicleBody chapter={chapter} />
      <ChroniclePager chapter={chapter} />
    </main>
  );
}
