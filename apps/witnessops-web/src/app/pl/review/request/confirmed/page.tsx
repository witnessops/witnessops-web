import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = { title: "Zgłoszenie potwierdzone", robots: { index: false, follow: false } };

export default function PolishConfirmedPage() {
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Zgłoszenie przeglądu</p><h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary">Adres e-mail został potwierdzony</h1><p className="mt-5 text-base leading-7 text-text-muted">Podsumowanie zgłoszenia zostało zapisane i przekazane do oceny operatora. Nie rozpoczęliśmy jeszcze pracy i nie przyjęliśmy materiałów klienta.</p><section className="mt-8 border border-surface-border p-6"><h2 className="font-semibold text-text-primary">Co wydarzy się dalej</h2><ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted"><li>1. Sprawdzimy dopasowanie oferty i granice zakresu.</li><li>2. Potwierdzimy upoważnienie, wymagany dostęp, cenę, termin oraz sposób obsługi materiałów.</li><li>3. Odpowiemy e-mailem z kolejnym krokiem.</li></ol></section><div className="mt-7 flex gap-4 text-sm"><Link className="text-brand-accent hover:underline" href="/pl/catalog">Zobacz oferty</Link><Link className="text-brand-accent hover:underline" href="/pl/docs">Przeczytaj dokumentację</Link></div><div className="mt-10"><PublicContactRoute /></div></main>;
}
