import Link from "next/link";
import { buyerRequestHref, type BuyerLocale } from "@/lib/buyer-services";

export function RepairOptions({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  const options = pl ? [
    ["Brak opiekuna procesu?", "Zaczynamy od jednego procesu i płatnej diagnozy. Większe odzyskiwanie lub stabilizacja: orientacyjnie €1 000–2 000, po określeniu zakresu."],
    ["Zaczynasz od zera?", "Konfiguracja n8n, migracja lub pierwszy proces. Także małe integracje z jednym wynikiem biznesowym, ograniczoną liczbą systemów i jasnym testem odbioru. Wycena indywidualna."],
    ["Potrzebujesz dalszej opieki?", "Opcjonalnie po naprawie: €300–600/miesiąc za uzgodnione 2–4 godziny. Ustalamy czas reakcji; dodatkowe prace wyceniamy osobno. Bez nielimitowanego wsparcia i obsługi 24/7."],
  ] : [
    ["The original maintainer disappeared?", "Start with one inherited workflow and paid diagnosis. Larger recovery or hardening: an indicative €1,000–2,000, scoped separately after diagnosis."],
    ["Starting fresh?", "n8n setup, migration or a first workflow. We also build selective integrations with one business outcome, limited systems and clear acceptance. Quoted for the agreed scope."],
    ["Want someone to look after it?", "Optional care after repair: €300–600/month for an agreed 2–4 hours. A defined response window; extra work quoted separately. No unlimited support or 24/7 operations."],
  ];
  return <section className="border-t border-surface-border py-8" aria-labelledby="repair-options-heading">
    <h2 id="repair-options-heading" className="text-2xl font-semibold text-text-primary">{pl ? "Inny punkt wyjścia?" : "A different starting point?"}</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{pl ? "n8n · Zapier · Make · Apps Script · API · webhooki · CRM · e-mail · komponenty AI. Dobieramy narzędzia do problemu." : "n8n · Zapier · Make · Apps Script · APIs · webhooks · CRM · email · AI components. The business result determines the scope."}</p>
    <div className="mt-6 grid gap-6 md:grid-cols-3">{options.map(([title, body]) => <article key={title}><h3 className="font-semibold text-text-primary">{title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></article>)}</div>
    <p className="mt-5 text-sm text-text-muted">{pl ? "Historyczne opcje naprawy służą tylko jako informacja i nie stanowią bieżących ofert płatnych przeglądów." : "Historical repair options are shown for context only. They are not current public paid-review selections."}</p>
    <details className="mt-6 border-t border-surface-border"><summary className="cursor-pointer py-4 font-semibold text-text-primary">{pl ? "Proces wpływa na pieniądze, dostęp lub decyzje agenta AI?" : "Does the workflow control money, access or consequential AI actions?"}</summary><p className="max-w-3xl text-sm leading-6 text-text-secondary">{pl ? "Osobny Agent Action Security Review kosztuje €2 500 (stała cena, bez VAT) i obejmuje jedno ważne działanie agenta: zatwierdzenia, tożsamość oraz faktyczne uprawnienia." : "Agent Action Security Review is €2,500 fixed, excluding VAT. It reconstructs one consequential action, its approval and effective permissions; an enquiry does not start the work."}</p><Link className="inline-flex min-h-11 items-center text-brand-accent underline" href="/catalog/workflows">{pl ? "Zobacz zakres przeglądu (EN)" : "See the specialist review"}</Link></details>
    <Link href={buyerRequestHref(locale)} className="mt-4 inline-flex min-h-11 items-center text-brand-accent underline">{pl ? "Opisz, czego potrzebujesz →" : "Describe what you need →"}</Link>
  </section>;
}
