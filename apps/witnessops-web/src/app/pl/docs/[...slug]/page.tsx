import type { Metadata } from "next";
import Link from "next/link";
import { getDocsUrl } from "@witnessops/config";

import { POLISH_DOC_LABELS } from "../docs-navigation";
import { POLISH_DOC_CONTENT } from "../polish-doc-content";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug.join("/");
  return {
    title: POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna",
    robots: { index: false, follow: true },
  };
}

export default async function PolishDocsFallback({ params }: Props) {
  const slug = (await params).slug.join("/");
  const title = POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna";
  const enDocsHome = getDocsUrl("witnessops", "/", { mode: "canonical" });
  const doc = Object.hasOwn(POLISH_DOC_CONTENT, slug) ? POLISH_DOC_CONTENT[slug] : undefined;

  if (doc) {
    return (
      <main id="main-content" tabIndex={-1} className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
          Dokumentacja WitnessOps
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-text-primary">{title}</h1>
        <p className="mt-5 text-base leading-7 text-text-secondary">{doc.introduction}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-semibold text-text-primary">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-base leading-7 text-text-secondary">{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-text-secondary">
                {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}
          </section>
        ))}
        <nav className="mt-10 border-t border-surface-border pt-5" aria-label="Powiązane materiały">
          <h2 className="text-base font-semibold text-text-primary">Czytaj dalej</h2>
          <ul className="mt-3 space-y-3">
            {doc.related.map((link) => (
              <li key={link.href}><Link className="text-brand-accent underline underline-offset-4" href={link.href}>{link.label}</Link></li>
            ))}
            <li><Link className="text-brand-accent underline underline-offset-4" href={enDocsHome}>Otwórz dokumentację techniczną (EN)</Link></li>
          </ul>
        </nav>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
        Dokumentacja WitnessOps · język polski i angielski
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-text-primary">{title}</h1>
      <div className="mt-5 border border-brand-accent/40 bg-brand-accent/5 p-4 text-sm leading-6 text-text-muted">
        <strong className="font-semibold text-text-primary">
          Szczegółowa dokumentacja techniczna jest dostępna po angielsku.
        </strong>{" "}
        Informacje dla osób zainteresowanych ofertą znajdziesz po polsku.
        Dokumentacja modelu, weryfikatora i specyfikacji znajduje się na{" "}
        <span className="whitespace-nowrap">witnessops.com/docs</span>.
      </div>
      <p className="mt-4 text-sm leading-6 text-text-muted">
        W dokumentacji angielskiej znajdziesz oryginalne nazwy, identyfikatory
        i polecenia potrzebne do pracy z narzędziami.
      </p>
      <div className="mt-7 flex flex-wrap gap-4 text-sm">
        <Link className="text-brand-accent hover:underline" href="/pl/docs">
          Wróć do dokumentacji PL
        </Link>
        <Link
          className="inline-flex items-center border border-brand-accent bg-brand-accent/10 px-3 py-2 font-semibold text-text-primary hover:opacity-90"
          href={enDocsHome}
        >
          Otwórz dokumentację techniczną (EN)
        </Link>
      </div>
    </main>
  );
}
