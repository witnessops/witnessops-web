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

function buyerFrame(sku: CatalogSku) {
  const map: Record<string, { doubt: string; boundary: string }> = {
    "WORKFLOW-FIT": {
      doubt: "Is this action bounded enough for one proof run?",
      boundary: "Non-secret fit check only; no evidence intake.",
    },
    "WORKFLOW-S": {
      doubt: "Can one action become a checkable packet?",
      boundary: "One action, one evidence path, quote after scope.",
    },
    "WORKFLOW-M": {
      doubt: "Can a launch or multi-record workflow be inspected later?",
      boundary: "Named launch/workflow boundary; no compliance certification.",
    },
    "WORKFLOW-L": {
      doubt: "Can an incident, custody, or enterprise boundary be made reviewable?",
      boundary: "Multi-boundary package with named limits.",
    },
    "WORKFLOW-RERUN": {
      doubt: "Did the same scoped action drift since last time?",
      boundary: "Same scope only; new snapshot and drift note.",
    },
    "OFFSEC-LOCAL-AUDIT": {
      doubt: "What does an authorized local host show right now?",
      boundary: "Authorized hosts only, read-only, no fund movement.",
    },
    "OFFSEC-LAUNCH-READY": {
      doubt: "What is checked before launch, and what remains outside scope?",
      boundary: "Authorized systems only; read-only readiness review.",
    },
    "OFFSEC-CUSTODY-OPS": {
      doubt: "Where does custody or wallet-ops authority stop?",
      boundary: "Read-only posture; no custody or fund movement.",
    },
    "OFFSEC-INCIDENT-READY": {
      doubt: "What do we know, infer, and still not know after an incident?",
      boundary: "Readiness assessment; no hack-back.",
    },
    "OFFSEC-PILOT": {
      doubt: "Can we try a bounded proofpack set before a larger program?",
      boundary: "Time-boxed pilot with signed scope.",
    },
    "OFFSEC-RETAINER": {
      doubt: "Can recurring agreed scopes get fresh receipt trails?",
      boundary: "Future request shape; bounded collections only.",
    },
    "OFFSEC-PROOF-INFRA": {
      doubt: "Can we set up our own receipt and verification pipeline?",
      boundary: "Future setup request; not a managed proof run by itself.",
    },
  };

  if (map[sku.id]) return map[sku.id];

  if (sku.track === "operator_saas") {
    return {
      doubt: "Do we need private-preview workspace access?",
      boundary: "Access only; proof runs are separate and not included.",
    };
  }

  return undefined;
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
  const frame = buyerFrame(sku);

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
      {frame ? (
        <dl className="mt-4 space-y-2 text-sm leading-6 text-text-muted">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Buyer doubt</dt>
            <dd>{frame.doubt}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Boundary</dt>
            <dd>{frame.boundary}</dd>
          </div>
        </dl>
      ) : null}
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
