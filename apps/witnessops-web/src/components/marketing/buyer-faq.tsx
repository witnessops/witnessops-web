import Link from "next/link";
import { buyerCatalogHref, buyerRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { BUYER_FAQ } from "@/lib/buyer-faq";

export function BuyerFaq({ locale }: { locale: BuyerLocale }) {
  const text = BUYER_FAQ[locale];
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-buyer-faq-locale={locale}>
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 md:py-14">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">WitnessOps · FAQ</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary md:text-5xl">{text.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-text-secondary">{text.intro}</p>
        </header>
        <section aria-label={locale === "pl" ? "Pytania kupującego" : "Buyer questions"} className="mt-8 border-t border-surface-border">
          {text.items.map(({ question, answer }) => (
            <details key={question} className="border-b border-surface-border py-1">
              <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">{question}</summary>
              <p className="max-w-3xl pb-5 text-sm leading-7 text-text-secondary">{answer}</p>
            </details>
          ))}
        </section>
        <nav aria-label={locale === "pl" ? "Następne kroki" : "Next steps"} className="mt-9 flex flex-wrap gap-4">
          <Link href={buyerCatalogHref(locale)} className="inline-flex min-h-11 items-center border border-surface-border px-5 font-semibold text-text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{text.compare}</Link>
          <Link href={buyerRequestHref(locale)} className="inline-flex min-h-11 items-center border border-brand-accent px-5 font-semibold text-text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{text.choose}</Link>
        </nav>
      </div>
    </main>
  );
}
