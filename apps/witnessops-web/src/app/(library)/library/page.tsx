import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";

const writingTopics = [
  {
    title: "Governed AI",
    body: "How systems act within policy, approval, and scope instead of relying on vague autonomy claims.",
  },
  {
    title: "Trust boundaries",
    body: "Where control actually sits, what is delegated, what is assumed, and where misunderstanding begins.",
  },
  {
    title: "Verification",
    body: "How outputs, signatures, receipts, and evidence can be checked independently.",
  },
  {
    title: "Failure modes",
    body: "What breaks under pressure, what degrades, and what recovery looks like when the clean path no longer applies.",
  },
  {
    title: "Architecture under scrutiny",
    body: "How system claims read when customers, auditors, operators, or counterparties examine them closely.",
  },
];

const startHerePaths = [
  {
    title: "Verify receipts and bundles",
    description:
      "Use the public verifier to inspect sample receipts and any published first-party proof bundles listed on /verify.",
    href: "/verify",
    primary: true,
  },
  {
    title: "Browse named sample cases",
    description:
      "Inspect published sample cases for specific workflow classes with stable routes.",
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
      "Inspect the sample report shape before submitting one real workflow.",
    href: "/review/sample-report",
    primary: false,
  },
  {
    title: "Request a Proof Run",
    description:
      "Submit one real workflow, boundary, or operator decision path.",
    href: "/review/request",
    primary: false,
  },
];

const trustCriteria = [
  "what it controls",
  "what it delegates",
  "what it assumes",
  "what can be checked independently",
  "what happens when normal operation breaks down",
];

const artifactClasses = [
  {
    title: "Verifier fixtures",
    status: "sample fixture",
    mechanism:
      "Receipt JSON examples loaded into the receipt-first verifier to show clean pass, named failure, malformed input, and fail-closed behavior.",
    boundary:
      "Fixtures are not live customer artifacts and do not prove a production workflow or bundle completeness.",
    href: "/verify",
    label: "Open verifier",
  },
  {
    title: "Published first-party proof bundles",
    status: "published first-party bundle",
    mechanism:
      "Downloadable ZIP bundles on /verify with receipt, manifest hash, source artifacts, and verifier-facing instructions for bounded WitnessOps-owned statements.",
    boundary:
      "These are first-party WitnessOps proof bundles, not live customer proof artifacts or customer assurance claims unless explicitly labeled otherwise.",
    href: "/verify",
    label: "Open published bundles",
  },
  {
    title: "AI-agent sample proof run",
    status: "public sample bundle",
    mechanism:
      "A stable public sample with action boundary, authority map, evidence manifest, receipt, verifier result, challenge path, and MANIFEST.sha256.",
    boundary:
      "The sample demonstrates receipt shape and verifier path only. It is not production deployment, legal compliance, or complete AI governance coverage.",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    label: "Open AI-agent sample",
  },
  {
    title: "Explanatory sample cases",
    status: "explanatory workflow class",
    mechanism:
      "Named workflow-class pages with stable routes, authority maps, evidence expectations, and trust-dependent gaps.",
    boundary:
      "Sample cases explain shape and reasoning. They do not claim live customer evidence or production proof.",
    href: "/review/sample-cases",
    label: "Browse sample cases",
  },
  {
    title: "Illustrative sample report",
    status: "illustrative dossier",
    mechanism:
      "A generic dossier that shows review structure and judgment style.",
    boundary:
      "It is not a live customer report, verifier-of-record result, legal audit opinion, or compliance certification.",
    href: "/review/sample-report",
    label: "Open sample report",
  },
  {
    title: "Live review request lane",
    status: "intake surface",
    mechanism:
      "Mailbox verification plus scoped follow-up for one real workflow, automation boundary, or operator decision path.",
    boundary:
      "Submitting the form does not start a proof run and does not accept customer evidence until scope and handling are agreed.",
    href: "/review/request",
    label: "Request Proof Run",
  },
];

export const metadata: Metadata = {
  title: {
    absolute: "WitnessOps Library — Docs, review, verification, and artifact classes",
  },
  description:
    "The WitnessOps library entry point for product docs, review, verifier fixtures, published first-party proof bundles, explanatory sample cases, the illustrative sample report, and receipt verification.",
  alternates: {
    canonical: "/library",
  },
  openGraph: {
    title: "WitnessOps Library — Docs, review, verification, and artifact classes",
    description:
      "Inspect verifier fixtures, published first-party proof bundles, explanatory sample cases, the illustrative sample report, request a proof run, and use docs for model and trust-boundary context.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WitnessOps Library — Docs, review, verification, and artifact classes",
    description:
      "Entry points for verifier fixtures, first-party proof bundles, explanatory sample cases, the illustrative sample report, Review, and docs.",
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
          Public entry points for review, verification, docs, and current artifact classes.
        </h1>
        <p className="mt-5 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          Use this page to start in the right place: inspect verifier fixtures,
          published first-party proof bundles, explanatory sample cases, the
          illustrative sample report, request a proof run for one real workflow,
          and use docs for the model and trust boundaries.
        </p>
        <p className="mt-3 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          No live customer proof artifact is linked from this index. Published
          bundles on /verify are first-party WitnessOps proof bundles unless a
          page explicitly labels them otherwise. Each artifact class below names
          its status, mechanism, and boundary.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/verify" variant="primary" label="Verify receipts and bundles" />
          <CtaButton href="/review/sample-cases" variant="secondary" label="Browse named sample cases" />
          <CtaButton href="/review/request" variant="secondary" label="Request Proof Run" />
        </div>
      </header>

      <section id="what-this-site-is" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What you can inspect here
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="max-w-[680px] space-y-4 text-sm leading-relaxed text-text-muted">
          <p>
            WitnessOps public surfaces include product docs, verifier fixtures,
            published first-party proof bundles, explanatory sample cases, one
            illustrative sample report, the live review request lane, and receipt
            verification.
          </p>
          <p>
            Docs cover the product contract. Review and verify cover the
            operational surfaces that are currently live. Sample surfaces stay
            explicitly non-live, while published first-party bundles are bounded
            WitnessOps-owned proof artifacts with their own declared limits.
          </p>
        </div>
      </section>

      <section id="artifact-classes" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Artifact state matrix
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <p className="mb-5 max-w-[680px] text-sm leading-relaxed text-text-muted">
          These are the public classes currently exposed here. Each one has a
          different authority, status, mechanism, and claim boundary.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {artifactClasses.map((item) => (
            <Link
              key={`${item.title}:${item.href}`}
              href={item.href}
              className="kb-hover-card kb-hover-row kb-hover-row--rail-top relative border border-surface-border bg-surface-bg p-5"
            >
              <h3
                className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {item.title}
              </h3>
              <dl className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                    Status
                  </dt>
                  <dd className="mt-1">{item.status}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                    Mechanism
                  </dt>
                  <dd className="mt-1">{item.mechanism}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                    Boundary
                  </dt>
                  <dd className="mt-1">{item.boundary}</dd>
                </div>
              </dl>
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

      <section id="published-themes" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Published themes
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="space-y-0 border border-surface-border">
          {writingTopics.map((topic, i) => (
            <article
              key={topic.title}
              className={`kb-hover-row kb-hover-row--rail-left flex flex-col gap-2 p-5 sm:flex-row sm:items-baseline sm:gap-6${
                i < writingTopics.length - 1 ? " border-b border-surface-border" : ""
              }`}
            >
              <h3
                className="shrink-0 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary sm:w-[200px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {topic.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">{topic.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-this-matters" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Why this matters
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="max-w-[680px] space-y-5">
          <p className="text-sm leading-relaxed text-text-muted">
            Systems are easy to overclaim when the boundary is vague, the
            failure path is hand-waved, or the proof only makes sense inside
            the system that produced it.
          </p>
          <p className="text-sm leading-relaxed text-text-muted">
            A system becomes easier to trust when it can state:
          </p>
          <ul className="space-y-2 pl-1">
            {trustCriteria.map((item) => (
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
            That is the level this site is concerned with. Not whether something
            looks advanced. Whether it remains legible under scrutiny.
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
        <p className="mb-5 max-w-[680px] text-sm leading-relaxed text-text-muted">
          Start by verifying receipts and bundles, then browse explanatory
          sample cases, request a bounded proof run for one real workflow, and
          use docs for deeper model context.
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
          If this looks close to what you are building, move from reading to a
          boundary check.
        </p>
        <Link
          href="/review/request"
          className="mt-4 inline-block text-xs text-text-muted transition-colors hover:text-text-primary"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
        >
          Request Proof Run &rarr;
        </Link>
      </section>
    </main>
  );
}
