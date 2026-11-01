import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Nie znaleziono strony · WitnessOps" },
  robots: { index: false, follow: true },
};

export default function PolishNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-text-muted">404</p>
      <h1 className="mt-4 text-4xl font-medium text-text-primary">Nie znaleziono strony</h1>
      <p className="mt-4 max-w-xl text-text-secondary">
        Pod tym adresem nie ma strony WitnessOps. Sprawdź adres lub wróć na stronę główną.
      </p>
      <p className="mt-8 flex flex-wrap gap-6 text-text-primary">
        <Link className="underline underline-offset-4" href="/pl">Strona główna</Link>
        <Link className="underline underline-offset-4" href="/pl/support">Pomoc</Link>
      </p>
    </main>
  );
}
