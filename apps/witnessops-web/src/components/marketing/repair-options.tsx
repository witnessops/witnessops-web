import Link from "next/link";
import { buyerPublicOfferRequestHref, type BuyerLocale } from "@/lib/buyer-services";

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
    <p className="mt-5 text-sm text-text-muted">{pl ? "Ceny pilotażowe, bez VAT i opłat dostawców. Zakres, dostępność i warunki potwierdzamy przed zobowiązaniem." : "Pilot pricing, excluding VAT and third-party fees. Scope, availability and terms are confirmed before commitment."}</p>
    <details className="mt-6 border-t border-surface-border"><summary className="cursor-pointer py-4 font-semibold text-text-primary">{pl ? "Proces wpływa na pieniądze, dostęp lub decyzje agenta AI?" : "Does the workflow control money, access or consequential AI actions?"}</summary><p className="max-w-3xl text-sm leading-6 text-text-secondary">{pl ? "Osobny Agent Action Security Review (€2 500 bez VAT) analizuje uprawnienia, zatwierdzanie i dowody wykonania jednego działania. To opcja dla innego problemu, a nie obowiązkowy etap naprawy." : "The separate Agent Action Security Review (€2,500 excluding VAT) examines authority, approval and execution evidence for one consequential action. It is an optional specialist review when the problem calls for it, with no automatic upsell from a repair."}</p><Link className="inline-flex min-h-11 items-center text-brand-accent underline" href="/catalog/workflows">{pl ? "Zobacz zakres przeglądu (EN)" : "See the specialist review"}</Link></details>
    <Link href={buyerPublicOfferRequestHref(locale, "automation-repair-handover")} className="mt-4 inline-flex min-h-11 items-center text-brand-accent underline">{pl ? "Opisz, czego potrzebujesz →" : "Describe what you need →"}</Link>
  </section>;
}
