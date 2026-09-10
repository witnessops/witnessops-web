import type { Metadata } from 'next';
import { canonicalUrl } from './public-seo';

export type EditorialType = 'Essay' | 'Research note' | 'Evidence reconstruction' | 'Field note';
/** Repository-owned illustrative artwork, not evidence. Dimensions are intrinsic pixels. */
export type EditorialHeroImage = { src: string; alt: string; width: number; height: number; position?: string };
export type EditorialEntry = {
  hero?: EditorialHeroImage;
  slug: string; href: string; type: EditorialType; title: string;
  publishedAt: string; modifiedAt?: string; summary: string; deck: string;
  contentReference: string; featured?: boolean; openGraphSummary?: string;
  author?: { name: string; role: string };
};
export const civilizationArticle: EditorialEntry = {
  slug: 'when-civilization-can-no-longer-understand-itself',
  href: '/articles/when-civilization-can-no-longer-understand-itself',
  type: 'Essay', title: 'When Civilization Can No Longer Understand Itself',
  publishedAt: '2026-09-03', featured: true,
  // User-supplied editorial artwork; creator/licence not independently established.
  hero: {
    src: '/images/editorial/when-civilization-can-no-longer-understand-itself.png',
    alt: 'Illustration of a lone person overlooking a futuristic city, a fragmented classical statue, server towers and a networked globe.',
    width: 1916, height: 821, position: '30% 50%',
  },
  summary: 'AI does not need to rebel to become dangerous. The deeper risk begins when humans can still operate civilization but can no longer independently understand, challenge, reconstruct, or recover it.',
  deck: 'AI does not need to rebel against humanity to become dangerous. A quieter loss of control begins when machines become indispensable to systems that humans can operate, but can no longer independently understand, challenge, or rebuild.',
  openGraphSummary: 'The real AI control problem may begin when machine intelligence becomes indispensable to systems humans can operate but can no longer independently challenge.',
  author: { name: 'Karol Stefański', role: 'Founder of WitnessOps' },
  contentReference: 'src/app/(marketing)/articles/when-civilization-can-no-longer-understand-itself/page.tsx',
};
export const exposureSnapshotNote: EditorialEntry = {
  slug: 'reading-a-public-exposure-snapshot', href: '/research/reading-a-public-exposure-snapshot',
  type: 'Research note', title: 'How to read a public exposure snapshot', publishedAt: '2026-09-10',
  summary: 'Why a completed check is not a security grade, how request attempts differ from collected responses, and where the evidence stops.',
  deck: 'Introductory note based on existing public WitnessOps product boundaries. No new target was checked for this article.',
  contentReference: 'src/app/research/reading-a-public-exposure-snapshot/page.tsx',
};
export const editorialArticles: readonly EditorialEntry[] = [civilizationArticle, exposureSnapshotNote];
export function editorialDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
}
export function editorialMetadata(entry: EditorialEntry): Metadata {
  const url = canonicalUrl(entry.href);
  return {
    title: entry.title, description: entry.summary, alternates: { canonical: url },
    ...(entry.author ? { authors: [{ name: entry.author.name }] } : {}),
    openGraph: { type: 'article', url, title: entry.title, description: entry.openGraphSummary ?? entry.summary,
      publishedTime: `${entry.publishedAt}T00:00:00+02:00`, modifiedTime: `${entry.modifiedAt ?? entry.publishedAt}T00:00:00+02:00`,
      ...(entry.author ? { authors: [entry.author.name] } : {}) },
  };
}
export function editorialJsonLd(entry: EditorialEntry) {
  return {
    '@context': 'https://schema.org', '@type': 'Article', headline: entry.title,
    description: entry.summary, datePublished: entry.publishedAt,
    dateModified: entry.modifiedAt ?? entry.publishedAt, mainEntityOfPage: canonicalUrl(entry.href),
    author: entry.author ? { '@type': 'Person', name: entry.author.name } : { '@type': 'Organization', name: 'WitnessOps' },
    publisher: { '@type': 'Organization', name: 'WitnessOps', url: canonicalUrl('/') },
  };
}
