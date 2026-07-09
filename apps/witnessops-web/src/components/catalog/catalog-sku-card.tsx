import { CtaButton } from "@/components/shared/cta-button";
import type { CatalogSku } from "@witnessops/catalog";
import Link from "next/link";

function statusLabel(status: string) {
  const map: Record<string, string> = {
    ship_today: "Ship today",
    quote_after_scope: "Quote after scope",
    prep_only: "Prep only",
    demo_only: "Demo only",
    future: "Future",
  };
  return map[status] ?? status;
}

function availabilityLabel(availability?: string) {
  const map: Record<string, string> = {
    private_preview_request_access: "Private preview — request access",
    witnessops_request: "Available through WitnessOps request",
  };
  return availability ? map[availability] : undefined;
}

export function CatalogSkuCard({ sku }: { sku: CatalogSku }) {
  const detailHref = `/catalog/${sku.id.toLowerCase()}`;
  const primaryCta = sku.cta.primary;
  const normalizedPrimaryCta =
    primaryCta === "https://witnessops.com/review/request"
      ? "/review/request"
      : primaryCta;
  const isMailto = normalizedPrimaryCta?.startsWith("mailto:");
  const isExternal =
    normalizedPrimaryCta?.startsWith("http://") ||
    normalizedPrimaryCta?.startsWith("https://");
  const ctaLabel = isMailto
    ? "Email"
    : normalizedPrimaryCta === "/review/request"
      ? "Request"
      : isExternal
        ? "Open"
        : "Request";
  const publicAvailability = availabilityLabel(sku.availability);

  return (
    <article className="border border-surface-border bg-surface-card/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
          {statusLabel(sku.status)}
        </span>
        {publicAvailability ? (
          <span className="text-xs text-text-muted">{publicAvailability}</span>
        ) : null}
        <span className="text-xs text-text-muted">{sku.price.display}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-text-primary">{sku.name}</h3>
      <p className="mt-2 text-sm leading-7 text-text-secondary">{sku.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={detailHref}
          className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent hover:underline"
        >
          Details
        </Link>
        {normalizedPrimaryCta ? (
          isMailto ? (
            <a
              href={normalizedPrimaryCta}
              className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted hover:text-text-primary"
            >
              {ctaLabel}
            </a>
          ) : isExternal ? (
            <a
              href={normalizedPrimaryCta}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted hover:text-text-primary"
            >
              {ctaLabel}
            </a>
          ) : (
            <CtaButton href={normalizedPrimaryCta} variant="secondary" label={ctaLabel} />
          )
        ) : null}
      </div>
    </article>
  );
}
