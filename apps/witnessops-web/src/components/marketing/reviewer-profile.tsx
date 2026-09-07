import type { BuyerLocale } from "@/lib/buyer-services";

export function ReviewerProfile({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  return <details className="border-y border-surface-border py-3">
    <summary className="cursor-pointer py-3 text-sm font-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{pl ? "Informacje o firmie" : "Company background"}</summary>
    <p className="max-w-2xl pb-3 text-sm leading-6 text-text-secondary">{pl ? "WitnessOps założył Karol Stefanski, wcześniej inżynier w Waystone i Nostra." : "WitnessOps was founded by Karol Stefanski, previously an engineer at Waystone and Nostra."} <a href="https://www.linkedin.com/in/karol-s/" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{pl ? "Doświadczenie zawodowe na LinkedIn" : "Professional background on LinkedIn"} →</a></p>
  </details>;
}
