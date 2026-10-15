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

type PageProps = { params: Promise<{ slug: string }> };

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
      images: ["/chronicles/og-placeholder.svg"],
    },
    twitter: {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(chronicleJsonLd(chapter)).replaceAll("<", "\\u003c") }} />
      <p className="text-sm text-text-muted">
        <Link href="/research" className="underline-offset-4 hover:underline">Research</Link>
        {" / "}
        <Link href="/chronicles" className="underline-offset-4 hover:underline">The Sovereign Chronicles</Link>
      </p>
      <p className="mt-8 font-mono text-xs uppercase tracking-[0.18em] text-brand-accent">{chapter.kicker}</p>
      <h1 className="mt-3 text-[40px] leading-[44px] tracking-[-0.045em] text-text-primary sm:text-[72px] sm:leading-[76px]" style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}>{chapter.title}</h1>
      {chapter.subtitle ? <p className="mt-4 text-lg text-text-secondary">{chapter.subtitle}</p> : null}
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-text-secondary">{chapter.dateline}</p>
      <p className="mt-2 text-sm text-text-muted">{chapter.meta}</p>
      <p className="mt-6 rounded-md border border-brand-accent/40 bg-surface-inset px-4 py-3 text-sm text-text-primary">{CHRONICLE_FICTION_LABEL}</p>
      <ChronicleBody chapter={chapter} />
      <ChroniclePager chapter={chapter} />
    </main>
  );
}
