import type { Metadata } from 'next';
import Link from 'next/link';
import { EditorialHero } from '@/components/editorial/editorial-article';
import { editorialArticles, editorialDate } from '@/lib/research';
export const metadata: Metadata = { title: 'Research & articles', description: 'Essays, research notes and evidence reconstructions about security, automation and verifiable operations.', alternates: { canonical: '/research' } };
export default function ResearchPage() {
  const featured = editorialArticles.find(entry => entry.featured);
  const latest = editorialArticles.filter(entry => entry !== featured).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return <main id="main-content" className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
    <h1 className="text-4xl font-semibold text-text-primary">Research &amp; articles</h1>
    <p className="mt-4 max-w-2xl text-text-secondary">Essays, research notes and evidence reconstructions about security, automation and verifiable operations.</p>
    {featured && <section aria-label="Featured" className="mt-10 border-b border-surface-border pb-10">
      {featured.hero && <div className="mb-6"><EditorialHero hero={featured.hero} priority /></div>}
      <p className="font-mono text-xs uppercase tracking-widest text-brand-accent">Featured · {featured.type} · <time dateTime={featured.publishedAt}>{editorialDate(featured.publishedAt)}</time></p>
      <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"><Link href={featured.href} className="hover:text-brand-accent">{featured.title}</Link></h2>
      <p className="mt-4 max-w-3xl leading-7 text-text-secondary">{featured.summary}</p>
    </section>}
    <section aria-labelledby="latest-heading" className="mt-8">
      <h2 id="latest-heading" className="text-xl font-semibold">Latest</h2>
      <ol className="mt-2 divide-y divide-surface-border">{latest.map(entry => <li key={entry.href} className="py-6">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-accent">{entry.type} · <time dateTime={entry.publishedAt}>{editorialDate(entry.publishedAt)}</time></p>
        <h3 className="mt-3 text-2xl font-semibold"><Link href={entry.href} className="hover:text-brand-accent">{entry.title}</Link></h3>
        <p className="mt-3 max-w-3xl leading-7 text-text-secondary">{entry.summary}</p>
      </li>)}</ol>
    </section>
  </main>;
}
