import type { Metadata } from "next";
import { VerifyConsole } from "@/components/verify/verify-console";
import { listVerifyFixtures } from "@/lib/verify-fixtures";

export const metadata: Metadata = {
  title: "Zweryfikuj dostawę",
  description: "Sprawdź potwierdzenie, nazwany mechanizm i ograniczenia wyniku.",
  alternates: { canonical: "/pl/verify", languages: { en: "/verify", pl: "/pl/verify", "x-default": "/verify" } },
};

export default function PolishVerifyPage() {
  const fixtures = listVerifyFixtures();
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-6 py-12">
    <header className="max-w-4xl border-b border-surface-border pb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Weryfikacja dostawy</p>
      <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[0.04em] text-text-primary">Sprawdź potwierdzenie dostawy</h1>
      <p className="mt-5 text-base leading-7 text-text-secondary">Ta kontrola potwierdza, że potwierdzenie odpowiada zapisanej strukturze i nie zmieniło się według nazwanego mechanizmu weryfikacyjnego.</p>
      <p className="mt-3 text-sm leading-7 text-text-muted">Nazwany mechanizm: WitnessOps public receipt-first verifier v1 przez <code>/api/verify</code>. Wynik dotyczy potwierdzenia JSON. Nie dowodzi, że każdy fakt jest prawdziwy, system jest bezpieczny, nie pominięto materiałów poza zakresem, system zdalny pozostaje dziś bez zmian ani że WitnessOps potwierdził zgodność.</p>
    </header>
    <section className="mt-8" id="verify-console"><VerifyConsole fixtures={fixtures} /></section>
  </main>;
}
