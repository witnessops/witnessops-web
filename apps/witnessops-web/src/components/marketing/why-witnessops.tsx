import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";
import type { BuyerLocale } from "@/lib/buyer-services";
import { ReviewerProfile } from "./reviewer-profile";

export function WhyWitnessOps({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  const prefix = pl ? "/pl" : "";
  const principles = pl ? [
    ["Uprawnienia i zabezpieczenia", "Kto może wywołać działanie? Gdzie wymagane jest zatwierdzenie? Sprawdzamy, czy zasady znajdują odzwierciedlenie w konfiguracji i uzgodnionych testach."],
    ["Rzeczywisty wynik", "Co zmieniło się w systemie docelowym? Porównujemy oczekiwany wynik z dostępnymi zapisami i obserwacjami. Sam komunikat o sukcesie nie wystarcza."],
    ["Ustalenia, które można sprawdzić", "Każde ustalenie wskazuje materiały, które je wspierają. Oddzielamy obserwacje, wnioski i kwestie, których nie udało się potwierdzić."],
    ["Praktyczny kolejny krok", "Otrzymujesz priorytety i zalecenia. Gdy zakres obejmuje naprawę, przekazujemy zmiany, wyniki uzgodnionych testów i instrukcje obsługi."],
  ] : [
    ["Permissions and controls", "Who can trigger an action? Where is approval required? We examine whether the rules are reflected in configuration and agreed tests."],
    ["The actual outcome", "What changed in the destination system? We compare the expected result with available records and observations. A success message alone is not enough."],
    ["Findings you can inspect", "Each finding points to the material supporting it. We distinguish observations, inferences and questions the evidence cannot answer."],
    ["A practical next step", "You receive priorities and recommendations. When repair is in scope, the handover includes changes, agreed test results and operating instructions."],
  ];
  return <main id="main-content" tabIndex={-1} className="buyer-page">
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">{pl ? "Dlaczego WitnessOps" : "Why WitnessOps"}</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-text-primary lg:text-6xl">{pl ? "Zrozum ustalenia. Sprawdź dowody. Zdecyduj, co dalej." : "Understand the finding. Inspect the evidence. Decide what to do."}</h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-text-secondary">{pl ? "WitnessOps bada konkretne pytanie o bezpieczeństwo na podstawie systemu, dostępnych zapisów i uzgodnionych sprawdzeń. Każde ustalenie wskazuje źródła, znaczenie problemu, niepewności i zalecany kolejny krok." : "WitnessOps traces a specific security question through the relevant system, available records and agreed checks. Each finding explains what supports it, why it matters, what remains uncertain and the recommended next step."}</p>
        <div className="mt-7 flex flex-wrap gap-3"><CtaButton href={`${prefix}/review/request`} variant="primary" label={pl ? "Omów zakres przeglądu" : "Scope a review"} /><CtaButton href={`${prefix}/catalog`} variant="secondary" label={pl ? "Zobacz usługi" : "Explore services"} /></div>
      </header>
      <section className="mt-14 border-t border-surface-border pt-8" aria-labelledby="why-method-heading">
        <h2 id="why-method-heading" className="text-2xl font-semibold tracking-tight text-text-primary">{pl ? "Co sprawdzamy i co z tego wynika" : "What we examine and what you get"}</h2>
        <div className="mt-6 grid gap-x-10 md:grid-cols-2">{principles.map(([title, body], i) => <article key={title} className="border-t border-surface-border py-6"><p className="text-xs font-semibold text-brand-accent">0{i + 1}</p><h3 className="mt-2 text-lg font-semibold text-text-primary">{title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-text-secondary">{body}</p></article>)}</div>
      </section>
      <section className="mt-8 border-y border-surface-border bg-surface-card/30 px-5 py-7 sm:px-8" aria-labelledby="why-evidence-heading">
        <h2 id="why-evidence-heading" className="text-2xl font-semibold text-text-primary">{pl ? "Zajrzyj do przykładu" : "Inspect the work"}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{pl ? "Publiczne demo pokazuje weryfikację opublikowanych plików i zadeklarowanej syntetycznej zmiany klucza. To przykład metody, a nie dowód rzeczywistej operacji u dostawcy ani wynik pracy dla klienta." : "The public demo checks published artifacts and a declared synthetic key rotation. It demonstrates the method; it is not evidence of a real provider action or a customer engagement."}</p>
        <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2">{[
          ["/review/sample-cases/ai-agent-action-proof-run", pl ? "Demo weryfikacji (EN)" : "Verification demo"],
          [`${prefix}/verify`, pl ? "Zweryfikuj zapis" : "Verify a receipt"],
          [`${prefix}/docs`, pl ? "Dokumentacja" : "Read the documentation"],
        ].map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{label} →</Link>)}</div>
      </section>
      <section className="py-9" aria-labelledby="why-scope-heading">
        <h2 id="why-scope-heading" className="text-2xl font-semibold text-text-primary">{pl ? "Jasne granice wniosków" : "Clear limits on every conclusion"}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">{pl ? "Wynik weryfikacji nazywa mechanizm, sprawdzony zakres i materiały, które go wspierają. Poprawny podpis nie dowodzi, że opisane działanie było bezpieczne lub prawidłowe. Przegląd nie jest certyfikacją zgodności ani zapewnieniem dla całego środowiska." : "A verification result names the mechanism, checked scope and supporting artifacts. A valid signature does not establish that the underlying action was safe or correct. A scoped review is not compliance certification or whole-environment assurance."}</p>
        <details className="mt-4 max-w-3xl"><summary className="cursor-pointer py-3 text-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{pl ? "Co uzgadniamy przed pracą" : "What we agree before work starts"}</summary><p className="pb-3 text-sm leading-7 text-text-secondary">{pl ? "Systemy i działania objęte zakresem, upoważnienie i dostęp, sposób postępowania z materiałami, wyniki pracy, wyłączenia, cena i termin. Wdrożenie zmian wymaga uzgodnionego zakresu i upoważnienia." : "The systems and actions in scope, authorization and access, evidence handling, deliverables, exclusions, price and timing. Implementing changes requires an agreed scope and authorization."}</p></details>
      </section>
      <ReviewerProfile locale={locale} />
      <section className="mt-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold text-text-primary">{pl ? "Masz konkretną wątpliwość?" : "Have a system or action in mind?"}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{pl ? "Zacznij od krótkiego opisu, bez danych poufnych." : "Start with a short description, without confidential data."}</p></div><CtaButton href={`${prefix}/review/request`} variant="primary" label={pl ? "Omów zakres przeglądu" : "Scope a review"} /></section>
    </div>
  </main>;
}
