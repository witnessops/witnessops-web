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
        "This review produces a bounded, read-only picture of one authorised Linux server: what was checked, which evidence supports the result, and what remains unresolved. It is not a penetration test or certification.",
      verificationPath:
        "Inspect the delivered report, receipt, and hash manifest. Structural web verify may apply when the receipt uses a supported schema; offline byte checks stay on the operator path when named.",
      notIncluded: [
        "exploitation",
        "secret collection",
        "fund movement",
        "unapproved hosts",
        "compliance certification",
      ],
      nextStep: "Start a non-secret fit check for the authorised host and evidence handling before any collection.",
    },
    "OFFSEC-EXTERNAL-EXPOSURE": {
      claim:
        "This assessment produces a bounded outside-in picture of one authorised public domain: what was checked, which observations support the findings, and what remains unknown. It is not a penetration test, certification, or proof that the system is secure.",
      verificationPath:
        "Inspect the delivered scope record, reports, evidence manifest, artifact hashes, and — where the supported path is produced — the signed receipt and offline verifier. Package integrity does not prove security or completeness.",
      notIncluded: [
        "exploitation or credential attacks",
        "authenticated application testing",
        "destructive or denial-of-service testing",
        "customer-data collection",
        "internal, cloud-account, source-code, mobile, or smart-contract review",
        "open-ended asset discovery",
        "compliance certification or a security guarantee",
      ],
      nextStep:
        "Start a non-secret pilot fit check and name the decision, authorised public boundary, accepting party, and deadline. Do not send credentials or target evidence.",
    },
    "OFFSEC-LAUNCH-READY": {
      claim:
        "This review produces a bounded pre-launch readiness package naming checked posture, findings, drift, and open decisions. It is not a guarantee that the release is defect-free or safe in every environment.",
      verificationPath:
        "Use the delivered report, drift notes, and any named verifier path in the packet. Do not infer a verifier that is not named.",
      notIncluded: [
        "production readiness guarantee",
        "self-serve portal checkout",
        "secret collection",
        "unapproved systems",
        "compliance certification",
      ],
      nextStep: "Start a non-secret fit check with systems and boundaries named at a high level.",
    },
    "OFFSEC-CUSTODY-OPS": {
      claim:
        "This review produces a read-only picture of how key, access or custody controls are documented. WitnessOps does not take custody of funds or secrets.",
      verificationPath:
        "Use the delivered posture notes, findings, and report to inspect what was reviewed and what remains outside scope.",
      notIncluded: [
        "custody of funds",
        "fund movement",
        "exchange service",
        "private key handling",
        "compliance certification",
      ],
      nextStep: "Start a fit check that names the custody question without sending keys or wallet evidence.",
    },
    "OFFSEC-INCIDENT-READY": {
      claim:
        "This review produces a readiness report for one defined incident scenario, separating observed preparation, assertions, unknowns, and open decisions. It is not emergency incident response or a 24/7 service.",
      verificationPath:
        "Use the readiness report and named evidence references to inspect the bounded picture and gaps.",
      notIncluded: [
        "hack-back",
        "destructive testing",
        "live incident command",
        "secret intake before handling is agreed",
        "guarantee of incident outcome",
      ],
      nextStep: "Start a non-secret incident-readiness fit check and name the high-level boundary.",
    },
    "OFFSEC-PILOT": {
      claim:
        "This is a signed, time-boxed pilot for one bounded collection or review scope with inspectable outputs and named limits.",
      verificationPath:
        "Use the pilot deliverables and walkthrough to inspect outputs and limits.",
      notIncluded: ["open-ended retainer", "unsigned scope", "unapproved hosts", "production monitoring"],
      nextStep: "Start a pilot fit check and keep the first message non-secret.",
    },
    "OFFSEC-RETAINER": {
      claim:
        "This is a future request shape for recurring bounded collections and reviews.",
      verificationPath:
        "Verification or inspection paths must be named in the agreed retainer scope before any claim is made.",
      notIncluded: ["EDR", "SIEM", "continuous monitoring", "unbounded collection", "automatic proof of security"],
      nextStep: "Start a fit check if you need recurring bounded review packages.",
    },
    "OFFSEC-PROOF-INFRA": {
      claim:
        "This is a future setup request for receipted collection and verification infrastructure.",
      verificationPath:
        "The engagement would define the verifier integration and receipt authority gates before setup work starts.",
      notIncluded: ["managed proof run by default", "public marketplace", "app launch", "secret custody"],
      nextStep: "Start an infrastructure fit check and name the pipeline question.",
    },
    "SBOM-MIN-ELEMENTS": {
      claim:
        "This review packages a checklist of CISA 2026 SBOM minimum elements for one named software unit: present, partial, missing, or unknown fields with named gaps. It is not a compliance certificate and not a vulnerability assessment.",
      verificationPath:
        "Inspect the SBOM artifact, generation context, checklist, evidence manifest, and sample-scoped receipt where produced. Structural package checks do not prove supplier honesty or exploitability.",
      notIncluded: [
        "CISA or federal compliance certification",
        "vulnerability-free software claim",
        "KEV absence",
        "full AI-SBOM or multi-tenant SaaS coverage",
        "live customer SBOM authenticity by default",
      ],
      nextStep: "Start a non-secret fit check and name the software unit and SBOM format you can share after scope is agreed.",
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
  const title = buyerService?.name.en ?? sku.name;
  const description = buyerService?.situation.en ?? sku.summary;
  const canonical = buyerService?.detailHref.en ?? `/catalog/${sku.id.toLowerCase()}`;
  const polish = buyerService?.detailHref.pl;
  return {
    title,
    description,
    alternates: {
      canonical,
      ...(polish
        ? {
            languages: {
              en: canonical,
              pl: polish,
              "x-default": canonical,
            },
          }
        : {}),
    },
    openGraph: {
      title: `${title} | WitnessOps`,
      description,
      siteName: "WitnessOps",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | WitnessOps`,
      description,
    },
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
      <BuyerServiceDetail
        locale="en"
        service={buyerService}
        technicalId={sku.id}
        claim={frame.claim}
        verificationPath={frame.verificationPath}
        notIncluded={frame.notIncluded}
      />
    );
  }

  const primary = sku.cta.primary;
  const secondary = sku.cta.secondary;
  const isExternal = (href: string) =>
    href.startsWith("http://") || href.startsWith("https://");

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="catalog-sku-detail">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link
          href="/catalog"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          ← Back to services
        </Link>

        <header className="mt-8 grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              {sku.id}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              {sku.name}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{sku.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {primary ? (
                isExternal(primary) ? (
                  <a
                    href={primary}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center border border-brand-accent bg-brand-accent px-6 text-sm font-semibold text-white"
                  >
                    Get started
                  </a>
                ) : (
                  <CtaButton href={primary} variant="primary" label="Get started" />
                )
              ) : null}
              {secondary && !isExternal(secondary) ? (
                <CtaButton href={secondary} variant="secondary" label="Inspect sample" />
              ) : null}
              <CtaButton href="/catalog" variant="secondary" label="View services" />
            </div>
          </div>
          <aside className="border border-brand-accent/40 bg-brand-accent/5 p-6 sm:p-7">
            <p className="text-sm font-semibold text-text-muted">Commercial line</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{sku.price.display}</p>
            <p className="mt-5 border-t border-surface-border pt-5 text-sm leading-6 text-text-secondary">
              {frame.nextStep}
            </p>
          </aside>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            What is claimed
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">{frame.claim}</p>
        </section>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              What you receive
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {sku.deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              How to inspect the result
            </h2>
            <p className="mt-6 border-t border-surface-border pt-4 text-base leading-7 text-text-secondary">
              {frame.verificationPath}
            </p>
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Boundaries</h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {sku.boundaries.map((boundary) => (
              <li key={boundary} className="border-t border-surface-border pt-4">
                {boundaryLabel(boundary)}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <h3 className="text-xl font-semibold text-text-primary">Not included</h3>
            <ul className="mt-4 space-y-3 text-base leading-7 text-text-secondary">
              {frame.notIncluded.map((item) => (
                <li key={item} className="border-t border-surface-border pt-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="border-t border-surface-border pt-10">
          <PublicContactRoute productName={sku.name} subject="fit-check" />
        </div>
      </div>
    </main>
  );
}
