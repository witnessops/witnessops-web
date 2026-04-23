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
    title: "Inspect sample proof artifacts",
    description:
      "See what a governed run leaves behind before you submit a real workflow.",
    href: "/library",
    primary: true,
  },
  {
    title: "Review the lane",
    description:
      "See the bounded workflow review surface and what a review covers.",
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
    title: "Request a workflow review",
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

export const metadata: Metadata = {
  title: {
    absolute: "WitnessOps Library — Docs, review, and verification entry points",
  },
  description:
    "The WitnessOps library entry point for product docs, workflow review, sample report inspection, and verification.",
  alternates: {
    canonical: "/library",
  },
  openGraph: {
    title: "WitnessOps Library — Docs, review, and verification entry points",
    description:
      "Inspect sample proof artifacts, request a workflow review, and use docs for model and trust-boundary context.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WitnessOps Library — Docs, review, and verification entry points",
    description:
      "Entry points for proof artifacts, review, sample report inspection, and docs.",
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
          Public entry points for proof, review, docs, and verification.
        </h1>
        <p className="mt-5 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          Use this page to start in the right place: inspect sample proof
          artifacts, review one real workflow, read the sample report shape, and
          use docs for the model and trust boundaries.
        </p>
        <p className="mt-3 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          It keeps the path bounded and explicit, without implying coverage that
          is not currently published.
        </p>
        <div className="mt-8">
          <CtaButton href="/review/request" variant="primary" label="Request workflow review" />
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
            WitnessOps is both a platform for governed operations and a public
            reading library on trust boundaries, verification, and system
            behavior under scrutiny.
          </p>
          <p>
            Docs cover the product contract. Review and verify cover the
            operational surfaces that are currently live.
          </p>
        </div>
      </section>

      <section id="what-i-write-about" className="mb-16 border-b border-surface-border pb-10">
        <h2
          className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What I write about
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
          Start by inspecting sample proof artifacts, then request a bounded
          review for one real workflow and use docs for deeper model context.
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
          <div className="grid gap-4 md:grid-cols-3">
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
          href="/review"
          className="mt-4 inline-block text-xs text-text-muted transition-colors hover:text-text-primary"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
        >
          Request a workflow review &rarr;
        </Link>
      </section>
    </main>
  );
}
