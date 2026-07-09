import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { CtaButton } from "@/components/shared/cta-button";
import { getSkusByTrack, loadCatalog } from "@witnessops/catalog";

const buyerDoubts = [
  {
    doubt: "Vendor changed something. Can we prove what happened?",
    packageFamily: "Workflow S or Workflow re-run",
    artifacts: "Scope map, evidence package, receipt, drift note when scope repeats.",
    boundary: "One named vendor action or the same previously agreed scope.",
  },
  {
    doubt: "An AI agent touched code. What changed and what was admitted?",
    packageFamily: "Workflow S",
    artifacts: "Action boundary, evidence manifest, receipt artifact, challenge path.",
    boundary: "One repo, action, tool path, or change lane.",
  },
  {
    doubt: "We are launching. What is checked, what is not, and who owns the risk?",
    packageFamily: "Workflow M or Launch Readiness Review",
    artifacts: "Scope map, findings, drift notes, decision record, proof package.",
    boundary: "Authorized systems only; no compliance certification.",
  },
  {
    doubt: "We had an incident. What do we know, infer, and still not know?",
    packageFamily: "Workflow L or Incident Readiness Pack",
    artifacts: "Timeline, readiness report, receipt trail, named gaps.",
    boundary: "Assessment and preservation; no hack-back or secret intake first.",
  },
  {
    doubt: "Someone approved access. Who had authority and where did it stop?",
    packageFamily: "Workflow S or Workflow M",
    artifacts: "Authority map, action path, evidence manifest, receipt artifact.",
    boundary: "One approval path, access change, or operational handoff.",
  },
  {
    doubt: "We need an offline packet another person can inspect.",
    packageFamily: "Local Server Audit, Workflow S, or Pilot entry",
    artifacts: "Manifest, receipt, walkthrough, proof package where scope supports it.",
    boundary: "The packet names what is evidence, what is sample, and what is outside scope.",
  },
];

const requestShapes = [
  {
    name: "Vendor Action Proof Capsule",
    base: "Workflow S or M",
    promise: "Turn one vendor change into a bounded evidence packet.",
    boundary: "One action and one agreed evidence path.",
    status: "Request shape",
  },
  {
    name: "AI-Agent Action Receipt",
    base: "Workflow S",
    promise: "Show what the agent claimed, touched, and left outside scope.",
    boundary: "One agent action or change lane.",
    status: "Request shape",
  },
  {
    name: "Deployment Proof Pack",
    base: "Workflow M",
    promise: "Name what was checked before launch and what remains a risk owner decision.",
    boundary: "Launch-readiness review, not compliance certification.",
    status: "Request shape",
  },
  {
    name: "Incident Timeline Capsule",
    base: "Workflow L",
    promise: "Separate known facts, inferred sequence, and unresolved gaps.",
    boundary: "No active response, hack-back, or secret intake from the first request.",
    status: "Request shape",
  },
  {
    name: "Custody Event Capsule",
    base: "Custody / Wallet-Ops Review or Workflow L",
    promise: "Record posture and authority boundaries without fund movement.",
    boundary: "Read-only; no custody, transfer, or exchange authority.",
    status: "Request shape",
  },
  {
    name: "Board Evidence Brief",
    base: "Workflow M or L",
    promise: "Summarize evidence, limits, and challenge path for a non-technical reviewer.",
    boundary: "Evidence brief only; no legal or compliance opinion.",
    status: "Add-on request shape",
  },
  {
    name: "Offline Verification Kit",
    base: "Local Server Audit or Pilot entry",
    promise: "Package files another person can inspect without trusting the original workspace.",
    boundary: "Only named artifacts and sidecars are in scope.",
    status: "Request shape",
  },
  {
    name: "Authority Map Sprint",
    base: "Workflow S",
    promise: "Map who approved, who acted, and where authority stopped.",
    boundary: "One approval chain or handoff.",
    status: "Request shape",
  },
  {
    name: "Proof Desk Retainer",
    base: "Continuous Shield Retainer",
    promise: "Recurring bounded checks and receipts for agreed scopes.",
    boundary: "Future request shape; not continuous monitoring or EDR.",
    status: "Future request shape",
  },
];

export const metadata: Metadata = {
  title: "Service Package Catalog",
  description:
    "WitnessOps service package catalog: choose an operational doubt and request a bounded proof package, private-preview workspace access, or security proof package.",
  alternates: { canonical: "/catalog" },
};

export default function CatalogIndexPage() {
  const catalog = loadCatalog();
  const offsec = getSkusByTrack("offsec_proof");
  const workflows = getSkusByTrack("witnessops_workflow");
  const saas = getSkusByTrack("operator_saas");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Service package catalog</div>
        <h1
          className="mt-2 max-w-4xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pick the operational doubt you need converted into a checkable proof packet.
        </h1>
        <p className="mt-6 max-w-[760px] text-base leading-8 text-text-secondary">
          {catalog.safe_claim} This catalog is a menu of requestable service
          shapes and price anchors. It is not checkout, self-serve SaaS, or an
          external OffSec portal. Proof runs are sold as bounded service
          packages, and workspace access is private preview only.
        </p>
        <p className="mt-4 max-w-[760px] text-sm leading-7 text-text-muted">
          Start from the doubt, not the SKU. A fit check decides whether the
          work can be scoped, what evidence handling is needed, which package
          fits, and what remains outside the claim. First request only: no
          secrets, files, logs, screenshots, credentials, private keys, MFA
          codes, raw exports, or customer evidence.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/review/request" variant="primary" label="Request one proof run" />
          <CtaButton href="/catalog/workflows" variant="secondary" label="Browse proof packages" />
          <CtaButton href="/catalog/operator-platform" variant="secondary" label="Workspace access" />
          <CtaButton href="/catalog/offsec" variant="secondary" label="Security proof packages" />
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Choose your doubt</div>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">
          Common reasons teams ask for a proof run
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {buyerDoubts.map((item) => (
            <article key={item.doubt} className="border border-surface-border bg-surface-card/40 p-5">
              <h3 className="text-base font-semibold text-text-primary">{item.doubt}</h3>
              <dl className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Likely fit</dt>
                  <dd>{item.packageFamily}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Evidence packet</dt>
                  <dd>{item.artifacts}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Named boundary</dt>
                  <dd>{item.boundary}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <CtaButton href="/review/request" variant="secondary" label="Request fit check" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Proof packages
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          Use these when the question is about one action, workflow, launch
          gate, incident boundary, custody posture, or rerun that needs a
          checkable packet with named limits.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workflows.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
        <p className="mt-4 text-sm text-text-muted">
          <Link href="/catalog/workflows" className="text-brand-accent hover:underline">
            View all workflow packages →
          </Link>
        </p>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Operator workspace access
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Private preview only. Request access through WitnessOps; there is no
          public app signup or self-serve checkout in the buyer path. Workspace
          access does not create a proof claim, and proof runs are not included.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {saas.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Security proof packages
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Security proof packages are available through WitnessOps request while
          the public OffSec surface is being prepared. Buyers do not need an
          external portal or checkout.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {offsec.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-surface-border pt-8">
        <div className="kb-section-tag">Request shapes</div>
        <h2 className="mt-2 text-2xl font-semibold text-text-primary">
          Proof capsule patterns
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">
          These are not new standalone SKUs. They are plain-language ways to ask
          for the existing packages when your team starts from a real operating
          question.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {requestShapes.map((shape) => (
            <article key={shape.name} className="border border-surface-border bg-surface-card/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {shape.status}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-text-primary">{shape.name}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{shape.promise}</p>
              <p className="mt-3 text-xs leading-5 text-text-muted">Base: {shape.base}</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">Boundary: {shape.boundary}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
