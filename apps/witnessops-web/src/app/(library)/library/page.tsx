import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";

const workflowClasses = [
  {
    title: "Privileged access",
    body: "High-risk access events where later review depends on more than a ticket, a log line, or operator memory.",
  },
  {
    title: "Third-party access",
    body: "Vendor or contractor access decisions that need clear authority, bounded scope, and clean end-state evidence.",
  },
  {
    title: "Security exceptions",
    body: "Exception and risk-acceptance paths where the approval, scope, expiry, and follow-through must still line up later.",
  },
  {
    title: "Incident actions",
    body: "Containment and response actions that become expensive to reconstruct once customers, auditors, insurers, or counsel ask questions.",
  },
  {
    title: "Sensitive rule changes",
    body: "Firewall, network, or production-boundary changes where approval, execution, and validation are often scattered across tools.",
  },
];

const startHerePaths = [
  {
    title: "Request a Review",
    description:
      "Submit one real workflow, boundary, or operator decision path for a bounded review.",
    href: "/review/request",
    primary: true,
  },
  {
    title: "Verify a sample receipt",
    description:
      "Inspect a public sample receipt before you submit a real workflow.",
    href: "/verify",
    primary: false,
  },
  {
    title: "Browse named sample cases",
    description:
      "Inspect published workflow-class examples with stable routes and explicit trust-dependent gaps.",
    href: "/review/sample-cases",
    primary: false,
  },
  {
    title: "Review the lane",
    description:
      "See the bounded review surface and what a review covers.",
    href: "/review",
    primary: false,
  },
  {
    title: "See a sample report",
    description:
      "Inspect the illustrative report shape before you submit one real workflow.",
    href: "/review/sample-report",
    primary: false,
  },
];

const proofGapCriteria = [
  "approval exists in one system",
  "execution happens in another",
  "evidence has to be reconstructed later",
  "outside review depends on screenshots, exports, or testimony",
  "the final package cannot be checked cleanly without internal access",
];

const artifactClasses = [
  {
    title: "Verifier fixtures",
    description:
      "Public sample receipts on /verify used to show receipt checks, named failures, and fail-closed behavior. They are not live customer artifacts.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Named sample cases",
    description:
      "Published workflow-class pages with stable routes, authority maps, evidence expectations, and explicit trust-dependent gaps.",
    href: "/review/sample-cases",
    label: "Browse sample cases",
  },
  {
    title: "Illustrative sample report",
    description:
      "A generic dossier that shows review structure and judgment style. It is not a live customer report.",
    href: "/review/sample-report",
    label: "Open sample report",
  },
  {
    title: "Live review request lane",
    description:
      "The public intake path for one real workflow, automation boundary, or operator decision path. It is a live request surface, not a published proof artifact.",
    href: "/review/request",
    label: "Request a Review",
  },
];

export const metadata: Metadata = {
  title: {
    absolute: "WitnessOps Library — proof paths, sample cases, verifier, and review entry points",
  },
  description:
    "Start with one workflow. Inspect sample receipt verification, named sample cases, the illustrative report shape, and the live WitnessOps review request lane.",
  alternates: {
    canonical: "/library",
  },
  openGraph: {
    title: "WitnessOps Library — proof paths, sample cases, verifier, and review entry points",
    description:
      "Inspect the public proof path before you submit one real workflow: sample receipt verification, named sample cases, the illustrative report shape, and the live review lane.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WitnessOps Library — proof paths, sample cases, verifier, and review entry points",
    description:
      "Start with one workflow: inspect the verifier, sample cases, illustrative report shape, and live review lane.",
  },
};

export default function LibraryPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-16 border-b border-surface-border pb-10">
        <div className="kb-section-tag">WitnessOps Library</div>
        <h1
          className="mt-3 text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start here if you need to inspect how one governed workflow holds up under outside scrutiny.
        </h1>
        <p className="mt-5 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          This library is the public entry point for the WitnessOps proof path:
          sample receipt verification, named sample cases, the illustrative
          report shape, and the live review request lane.
        </p>
        <p className="mt-3 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          Use it when the question is not whether a process exists, but whether
          approval, execution, and evidence still line up when someone external
          checks.
        </p>
        <p className="mt-3 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          No live customer proof artifact is linked from this index. The public
          artifact classes here are sample or intake surfaces, each with its own
          boundary and claim limit.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/review/request" variant="primary" label="Request a Review" />
          <CtaButton href="/verify" variant="secondary" label="Verify a sample receipt" />
          <CtaButton href="/review/sample-cases" variant="secondary" label="Browse named sample cases" />
        </div>
      </header>

      <section id="best-fit-workflows" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Best fit workflows
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <p className="mb-5 max-w-[700px] text-sm leading-relaxed text-text-muted">
          WitnessOps is strongest when one sensitive workflow may later face
          audit, customer, regulator, insurer, or counterparty scrutiny.
        </p>
        <div className="space-y-0 border border-surface-border">
          {workflowClasses.map((workflow, i) => (
            <article
              key={workflow.title}
              className={`kb-hover-row kb-hover-row--rail-left flex flex-col gap-2 p-5 sm:flex-row sm:items-baseline sm:gap-6${
                i < workflowClasses.length - 1 ? " border-b border-surface-border" : ""
              }`}
            >
              <h3
                className="shrink-0 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary sm:w-[220px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {workflow.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">{workflow.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="what-you-can-inspect" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What you can inspect here
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="max-w-[700px] space-y-4 text-sm leading-relaxed text-text-muted">
          <p>
            WitnessOps public surfaces include product docs, verifier fixtures,
            named sample cases, one illustrative sample report, the live review
            request lane, and receipt verification.
          </p>
          <p>
            Docs cover the product contract. Review and verify cover live
            operational surfaces. The sample surfaces stay explicitly non-live
            and should be read as explanatory material, not customer proof.
          </p>
        </div>
      </section>

      <section id="artifact-classes" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Artifact classes on this surface
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <p className="mb-5 max-w-[700px] text-sm leading-relaxed text-text-muted">
          Each public surface below has a different authority, status, and claim
          boundary.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {artifactClasses.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="kb-hover-card kb-hover-row kb-hover-row--rail-top relative border border-surface-border bg-surface-bg p-5"
            >
              <h3
                className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {item.description}
              </p>
              <p
                className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section id="why-teams-end-up-here" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Why teams end up here
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="max-w-[700px] space-y-5">
          <p className="text-sm leading-relaxed text-text-muted">
            The common failure mode is not a missing process. It is that the
            approval sits in one tool, the action happens in another, and the
            evidence has to be reconstructed later under pressure.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            That usually means:
          </p>
          <ul className="space-y-2 pl-1">
            {proofGapCriteria.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-relaxed text-text-primary"
              >
                <span className="mt-[7px] inline-block h-1 w-3 shrink-0 bg-brand-accent/40" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-text-muted">
            This library is for inspecting that gap before you decide whether to
            submit one real workflow for review.
          </p>
        </div>
      </section>

      <section id="start-here" className="mb-16">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start here
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <p className="mb-5 max-w-[700px] text-sm leading-relaxed text-text-muted">
          Start with the live review lane if you already have one workflow in
          hand. Start with the verifier and sample cases if you want to inspect
          the public proof path first.
        </p>
        <div className="space-y-4">
          {startHerePaths
            .filter((path) => path.primary)
            .map((path) => (
              <Link
                key={path.href}
                href={path.href}
                className="kb-hover-card kb-hover-row kb-hover-row--rail-top relative block border border-surface-border bg-surface-bg p-6"
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Recommended first stop
                </p>
                <h3
                  className="mt-3 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {path.title}
                </h3>
                <p className="mt-2 max-w-[680px] text-sm leading-relaxed text-text-muted">
                  {path.description}
                </p>
              </Link>
            ))}
          <div className="grid gap-4 md:grid-cols-4">
            {startHerePaths
              .filter((path) => !path.primary)
              .map((path) => (
                <Link
                  key={path.href}
                  href={path.href}
                  className="kb-hover-card kb-hover-row kb-hover-row--rail-top relative border border-surface-border bg-surface-bg p-5"
                >
                  <h3
                    className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {path.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {path.description}
                  </p>
                </Link>
              ))}
          </div>
        </div>
      </section>

      <section id="decision-surface" className="mb-8 border-t border-surface-border pt-10">
        <p
          className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Decision surface
        </p>
        <p className="max-w-[560px] text-xs leading-relaxed text-text-muted">
          If you already have one workflow where approval, execution, and
          evidence do not line up cleanly, move from reading to a bounded
          review.
        </p>
        <Link
          href="/review/request"
          className="mt-4 inline-block text-xs text-text-muted transition-colors hover:text-text-primary"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
        >
          Request a Review &rarr;
        </Link>
      </section>
    </main>
  );
}
