import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerServiceByProductId } from "@/lib/buyer-services";
import { getSku, resolveSkuId, type CatalogSku } from "@witnessops/catalog";

type PageProps = { params: Promise<{ skuId: string }> };

type DetailFrame = {
  claim: string;
  verificationPath: string;
  notIncluded: string[];
  nextStep: string;
};

function detailFrame(sku: CatalogSku): DetailFrame {
  const workflowDefaults: DetailFrame = {
    claim:
      "This package creates a bounded claim about one agreed action, workflow, or handoff and names the evidence that supports it.",
    verificationPath:
      "The delivered packet names the receipt artifact, verifier result where produced, and challenge path for the scoped evidence. If a verifier does not apply, the packet must say so.",
    notIncluded: [
      "self-serve checkout",
      "compliance certification",
      "open-ended investigation",
      "customer evidence intake before scope is agreed",
    ],
    nextStep: "Request a non-secret fit check so scope, fee, timing, and evidence handling can be agreed.",
  };

  const map: Record<string, DetailFrame> = {
    "WORKFLOW-FIT": {
      claim:
        "This creates a go/no-go fit assessment for one possible proof run. It is not the proof run itself.",
      verificationPath:
        "No verifier result is produced by the fit check. WitnessOps replies with fit, likely scope, next action, and obvious gaps.",
      notIncluded: ["evidence intake", "proof run start", "customer file upload", "legal or compliance opinion"],
      nextStep: "Send only the non-secret action summary and boundary through the request form.",
    },
    "WORKFLOW-S": workflowDefaults,
    "WORKFLOW-M": {
      ...workflowDefaults,
      claim:
        "This package creates a bounded launch or multi-record workflow claim with a scope map, decision record, evidence package, receipt, and challenge path.",
      notIncluded: [...workflowDefaults.notIncluded, "guarantee that the launch is secure"],
    },
    "WORKFLOW-L": {
      ...workflowDefaults,
      claim:
        "This package creates a multi-boundary claim for incident, custody, or enterprise-scale work, with named limits and known gaps.",
      notIncluded: [...workflowDefaults.notIncluded, "hack-back", "fund movement", "continuous monitoring"],
    },
    "WORKFLOW-RERUN": {
      claim:
        "This package creates a fresh snapshot and drift note for a previously agreed scope.",
      verificationPath:
        "The delivered packet names the new evidence snapshot and receipt. It compares against the same agreed scope only.",
      notIncluded: ["new scope expansion", "new system intake", "self-serve checkout", "customer evidence before handling is agreed"],
      nextStep: "Request a rerun and name the prior scope that should stay unchanged.",
    },
    "OFFSEC-LOCAL-AUDIT": {
      claim:
        "This package creates an authorized local host posture claim with findings, report, receipt, manifest, proofpack, and buyer walkthrough.",
      verificationPath:
        "Use the included receipt, manifest, signed proofpack, and walkthrough to inspect the artifact set. WitnessOps /api/verify applies only when the delivered artifact names that verifier path.",
      notIncluded: ["exploitation", "secret collection", "fund movement", "unapproved hosts", "compliance certification"],
      nextStep: "Request scope for the authorized hosts and evidence handling before any collection occurs.",
    },
    "OFFSEC-LAUNCH-READY": {
      claim:
        "This package creates a launch-readiness security proof package naming checked posture, findings, drift, and limits.",
      verificationPath:
        "Use the delivered report, drift data, proofpack, and any named verifier path included in the packet. Do not infer a verifier that is not named.",
      notIncluded: ["production readiness guarantee", "OffSec portal checkout", "secret collection", "unapproved systems", "compliance certification"],
      nextStep: "Request a launch-readiness fit check with systems and boundaries named at a high level.",
    },
    "OFFSEC-CUSTODY-OPS": {
      claim:
        "This package creates a read-only custody or wallet-ops posture claim with receipted deliverables.",
      verificationPath:
        "Use the delivered posture, findings, report, and proofpack to inspect what was reviewed and what remains outside scope.",
      notIncluded: ["custody of funds", "fund movement", "exchange service", "private key handling", "compliance certification"],
      nextStep: "Request a fit check that names the custody posture question without sending keys or wallet evidence.",
    },
    "OFFSEC-INCIDENT-READY": {
      claim:
        "This package creates an incident-readiness claim that separates what is known, inferred, and still unknown.",
      verificationPath:
        "Use the readiness report, receipt trail, and proofpack to inspect the bounded evidence and gaps.",
      notIncluded: ["hack-back", "destructive testing", "live incident command", "secret intake before handling is agreed"],
      nextStep: "Request a non-secret incident-readiness fit check and name the high-level boundary.",
    },
    "OFFSEC-PILOT": {
      claim:
        "This package creates an entry proofpack set for a signed, time-boxed pilot scope.",
      verificationPath:
        "Use the proofpack set and buyer walkthrough to inspect the pilot outputs and limits.",
      notIncluded: ["open-ended retainer", "unsigned scope", "unapproved hosts", "production monitoring"],
      nextStep: "Request a pilot fit check and keep the first message non-secret.",
    },
    "OFFSEC-RETAINER": {
      claim:
        "This is a future request shape for recurring bounded collections and reviews.",
      verificationPath:
        "Verification or inspection paths must be named in the agreed retainer scope before any claim is made.",
      notIncluded: ["EDR", "SIEM", "continuous monitoring", "unbounded collection", "automatic proof of security"],
      nextStep: "Request a fit check if you need recurring bounded receipt trails.",
    },
    "OFFSEC-PROOF-INFRA": {
      claim:
        "This is a future setup request for receipted collection and verification infrastructure.",
      verificationPath:
        "The engagement would define the verifier integration and receipt authority gates before setup work starts.",
      notIncluded: ["managed proof run by default", "public marketplace", "app launch", "secret custody"],
      nextStep: "Request an infrastructure fit check and name the pipeline question.",
    },
  };

  if (map[sku.id]) return map[sku.id];

  if (sku.track === "operator_saas") {
    return {
      claim:
        "This creates no proof claim. It is private-preview workspace access for approved operator use.",
      verificationPath:
        "There is no proof verification path for workspace access by itself. Proof runs remain separately scoped service packages.",
      notIncluded: [
        "public app signup",
        "self-serve checkout",
        "bundled proof runs",
        "customer evidence upload",
        "workspace access as verification",
      ],
      nextStep: "Request preview access only if the workspace need is separate from a proof run.",
    };
  }

  return {
    claim:
      "This package creates a bounded claim only after scope, fee, timing, and evidence handling are agreed.",
    verificationPath:
      "The delivered packet must name the receipt, artifact, manifest, verifier, or inspection path that supports the claim.",
    notIncluded: ["unsupported verifier claims", "self-serve checkout", "customer evidence before scope is agreed"],
    nextStep: "Request a non-secret fit check before sending source material.",
  };
}

function boundaryLabel(boundary: string) {
  const map: Record<string, string> = {
    authorized_hosts_only: "Authorized hosts only",
    read_only: "Read-only",
    no_fund_movement: "No fund movement",
    no_custody: "No custody",
    not_hack_back: "No hack-back",
    assess_rotate_preserve: "Assess, rotate, preserve",
    time_boxed_1_2_weeks: "Time-boxed, usually 1-2 weeks",
    signed_scope_required: "Signed scope required",
    bounded_collections_only: "Bounded collections only",
    brings_witnessops_into_sale: "WitnessOps involvement must be agreed in the sale",
    no_proof_run_from_pricing: "No proof run starts from pricing",
    non_secret_intake_only: "Non-secret intake only",
    no_compliance_cert: "No compliance certification",
    quote_after_scope: "Quote after scope",
    same_scope_only: "Same scope only",
    no_auth: "No authentication launch",
    no_billing: "No billing launch",
    no_proof_runs_included: "No bundled proof runs",
    read_only_var: "Read-only where applicable",
    sales_assisted: "Sales-assisted",
    requires_active_saas_tier: "Requires active workspace tier",
    mesh_bind_only: "Private operator environment only",
  };
  return map[boundary] ?? boundary.replace(/_/g, " ");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skuId } = await params;
  const id = resolveSkuId(skuId);
  const sku = id ? getSku(id) : undefined;
  if (!sku) return { title: "SKU not found" };
  const buyerService = buyerServiceByProductId(sku.id);
  return {
    title: buyerService?.name.en ?? sku.name,
    description: buyerService?.situation.en ?? sku.summary,
    alternates: { canonical: `/catalog/${sku.id.toLowerCase()}` },
  };
}

export default async function CatalogSkuDetailPage({ params }: PageProps) {
  const { skuId } = await params;
  const id = resolveSkuId(skuId);
  if (!id) notFound();
  const sku = getSku(id);
  if (!sku) notFound();

  const buyerService = buyerServiceByProductId(sku.id);
  const frame = detailFrame(sku);
  if (buyerService) {
    return (
      <BuyerServiceDetail locale="en" service={buyerService} technicalId={sku.id}>
        <div className="grid gap-9 lg:grid-cols-2 lg:gap-12">
          <section>
            <h2 className="text-xl font-semibold text-text-primary">Claim created</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{frame.claim}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text-primary">Verification path</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {frame.verificationPath}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-text-primary">Evidence included</h2>
            <ul className="mt-4 grid gap-3 text-sm text-text-secondary">
              {sku.deliverables.map((deliverable) => (
                <li
                  key={deliverable}
                  className="border border-surface-border bg-surface-card/40 px-4 py-3"
                >
                  {deliverable}
                </li>
              ))}
            </ul>
          </section>
          <div className="grid gap-8">
            <section>
              <h2 className="text-xl font-semibold text-text-primary">Named boundaries</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                {sku.boundaries.map((boundary) => (
                  <li key={boundary}>— {boundaryLabel(boundary)}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-semibold text-text-primary">Not included</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                {frame.notIncluded.map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </BuyerServiceDetail>
    );
  }

  const primary = sku.cta.primary;
  const secondary = sku.cta.secondary;
  const isExternal = (href: string) =>
    href.startsWith("http://") || href.startsWith("https://");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl px-6 py-10 lg:py-14"
    >
      <Link
        href="/catalog"
        className="text-xs uppercase tracking-[0.16em] text-brand-accent hover:underline"
      >
        ← Catalog
      </Link>
      <header className="mt-4 border-b border-surface-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          {sku.id}
        </p>
        <h1
          className="mt-2 text-3xl font-semibold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {sku.name}
        </h1>
        <p className="mt-2 text-lg text-brand-accent">{sku.price.display}</p>
        <p className="mt-4 text-sm leading-7 text-text-secondary">{sku.summary}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Claim created
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{frame.claim}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Evidence included
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
          {sku.deliverables.map((d) => (
            <li key={d} className="border border-surface-border bg-surface-card/40 px-4 py-3">
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Verification path
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{frame.verificationPath}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Named boundary
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          {sku.boundaries.map((b) => (
            <li key={b}>— {boundaryLabel(b)}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          What is not included
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          {frame.notIncluded.map((item) => (
            <li key={item}>— {item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8 border border-surface-border bg-surface-card/30 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Next step
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary">{frame.nextStep}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        {primary ? (
          isExternal(primary) ? (
            <a
              href={primary}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center border border-surface-border px-5 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Primary CTA
            </a>
          ) : (
            <CtaButton href={primary} variant="primary" label="Get started" />
          )
        ) : null}
        {secondary && !isExternal(secondary) ? (
          <CtaButton href={secondary} variant="secondary" label="Inspect sample" />
        ) : null}
      </div>

      <div className="mt-10">
        <PublicContactRoute productName={sku.name} subject="fit-check" />
      </div>
    </main>
  );
}
