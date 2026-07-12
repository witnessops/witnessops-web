import type { Metadata } from "next";
import Link from "next/link";
import { POLISH_DOC_LABELS } from "../docs-navigation";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug.join("/");
  return { title: POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna", robots: { index: false, follow: true } };
}

export default async function PolishDocsFallback({ params }: Props) {
  const slug = (await params).slug.join("/");
  const title = POLISH_DOC_LABELS.get(slug) ?? "Dokumentacja techniczna";
  return <main id="main-content" tabIndex={-1} className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Dokumentacja WitnessOps</p><h1 className="mt-3 text-4xl font-semibold text-text-primary">{title}</h1><p className="mt-5 text-base leading-7 text-text-muted">Polska wersja tej szczegółowej strony jest przygotowywana. Pełna ścieżka kupującego jest dostępna po polsku, natomiast źródłowa dokumentacja techniczna pozostaje obecnie po angielsku.</p><p className="mt-4 text-sm leading-6 text-text-muted">Nie tłumaczymy automatycznie umów produktowych, identyfikatorów, poleceń ani semantyki weryfikatora. Dzięki temu techniczna treść nie zmienia znaczenia podczas tłumaczenia.</p><div className="mt-7 flex flex-wrap gap-4 text-sm"><Link className="text-brand-accent hover:underline" href="/pl/docs">Wróć do dokumentacji</Link><Link className="text-brand-accent hover:underline" href={`/docs/${slug}`}>Otwórz angielską dokumentację techniczną</Link></div></main>;
}
