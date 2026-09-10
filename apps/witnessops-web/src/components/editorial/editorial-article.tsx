import Image from 'next/image';
import type { ReactNode } from 'react';
import { editorialDate, editorialJsonLd, type EditorialEntry, type EditorialHeroImage } from '@/lib/research';

export const editorialBodyClass = 'mt-5 text-[1.04rem] leading-8 text-text-secondary';
export const editorialHeadingClass = 'mt-16 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl';
export const editorialQuoteClass = 'my-10 border-l-2 border-brand-accent pl-5 text-xl font-medium leading-8 text-text-primary sm:text-2xl';

/** Optional local artwork. The frame reserves its crop before image loading. */
export function EditorialHero({ hero, priority = false }: { hero: EditorialHeroImage; priority?: boolean }) {
  if (!hero.src.startsWith('/') || hero.src.startsWith('//') || !Number.isInteger(hero.width) || !Number.isInteger(hero.height) || hero.width <= 0 || hero.height <= 0) {
    throw new Error('Editorial hero requires a local asset and positive intrinsic dimensions.');
  }
  return <div className="mx-auto aspect-video w-full max-w-[1200px] overflow-hidden sm:aspect-[16/5]" data-editorial-hero>
    <Image src={hero.src} alt={hero.alt} width={hero.width} height={hero.height}
      sizes="(max-width: 1248px) calc(100vw - 48px), 1200px" priority={priority}
      className="h-full w-full object-cover" style={{ objectPosition: hero.position ?? '50% 50%' }} />
  </div>;
}

/** The original Civilization reading shell; bodies remain ordinary page content. */
export function EditorialArticle({ entry, children }: { entry: EditorialEntry; children: ReactNode }) {
  return <main id="main-content" tabIndex={-1} className={entry.hero ? "px-6 pb-16 pt-4 sm:pb-20 sm:pt-6" : "px-6 py-16 sm:py-20"}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(editorialJsonLd(entry)).replaceAll('<', '\\u003c') }} />
    {entry.hero && <div className="mb-8 sm:mb-10"><EditorialHero hero={entry.hero} priority /></div>}
    <article className="mx-auto max-w-[760px]" data-editorial-article>
      <header className="border-b border-surface-border pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent" style={{ fontFamily: 'var(--font-mono)' }}>
          {entry.type} · <time dateTime={entry.publishedAt}>{editorialDate(entry.publishedAt)}</time>
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.04] tracking-tight text-text-primary sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>{entry.title}</h1>
        <p className="mt-6 text-lg leading-8 text-text-secondary sm:text-xl">{entry.deck}</p>
        {entry.author && <p className="mt-6 text-sm text-text-muted">By <span className="font-medium text-text-primary">{entry.author.name}</span>, {entry.author.role}</p>}
      </header>
      {children}
    </article>
  </main>;
}
