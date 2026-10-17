import type { BuyerLocale } from "@/lib/buyer-services";

export function ReviewerProfile({ locale }: { locale: BuyerLocale }) {
  const pl = locale === "pl";
  return <details className="border-y border-surface-border py-3">
    <summary className="cursor-pointer py-3 text-sm font-medium text-text-secondary">{pl ? "Informacje o firmie" : "Company background"}</summary>
    <p className="max-w-2xl pb-3 text-sm leading-6 text-text-secondary">{pl ? "Założyciel" : "Founder"}</p>
  </details>;
}
