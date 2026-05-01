import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Bounded Access-Change Proof Run | WitnessOps",
  description:
    "A fixed-scope €2,500 WitnessOps proof run that packages one sensitive access grant, revoke, role change, or admin permission update into an evidence bundle with authority, custody, receipt, verifier notes, and findings.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/access-change-proof-run",
  ),
  openGraph: {
    title: "Bounded Access-Change Proof Run",
    description:
      "One sensitive access change. Five business days. A bounded evidence bundle others can inspect.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bounded Access-Change Proof Run",
    description:
      "One sensitive access change. Five business days. A bounded evidence bundle others can inspect.",
  },
};

const requestHref = "/support";
const sampleProofRunHref = "/review/sample-cases/ai-agent-action-proof-run";

const deliverables = [
  "run manifest",
  "authority record",
  "evidence manifest",
  "custody log",
  "checksum-bound receipt",
  "verifier README",
  "findings memo",
  "caveats and failure states",
  "45-minute walkthrough",
];

const goodFitExamples = [
  "privileged access granted",
  "access revoked",
  "production role changed",
  "contractor access changed",
  "vendor access reviewed",
  "admin permission updated",
  "emergency access approved",
  "stale access removed",
];

const badFitExamples = [
  "no source evidence exists",
  "no approving authority can be named",
  "the team wants a broad compliance certification",
  "the request requires legal audit opinion",
  "the workflow cannot be bounded to one operational action",
];

const clientInputs = [
  "selected access-change action",
  "relevant source exports, screenshots, logs, tickets, or records",
  "name/title of the approving authority",
  "system or account involved",
  "rough timeline of the action",
  "applicable policy or control text, if available",
  "point of contact for evidence questions",
];

const possibleFindings = [
  "authority was clear and evidence supports the access-change claim",
  "authority existed but execution evidence is incomplete",
  "execution evidence exists but authority is missing",
  "evidence exists but custody is weak",
  "timestamps conflict",
  "source artifacts are insufficient",
  "the action cannot be proven from available evidence",
];

const boundaries = [
  "This is not a legal audit opinion.",
  "This is not a compliance certification.",
  "This is not a penetration test.",
  "This is not a verifier-of-record result.",
  "This is not a claim that the whole company is secure or compliant.",
  "This is a bounded proof run over one selected access-change action.",
];

const timeline = [
  {
    label: "Day 1",
    value: "intake, scope, authority boundary",
  },
  {
    label: "Day 2",
    value: "source evidence collection and manifest",
  },
  {
    label: "Day 3",
    value: "custody log, receipt, and verifier notes",
  },
  {
    label: "Day 4",
    value: "findings memo and caveat review",
  },
  {
    label: "Day 5",
    value: "final bundle and walkthrough",
  },
];

const ctaPrompts = [
  "the access change you want to inspect",
  "the system involved",
  "who approved it",
  "what evidence exists",
  "who needs to review the final bundle",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="kb-section-tag">{children}</div>;
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-3 text-sm leading-relaxed text-text-secondary">
      {items.map((item, index) => (
        <li
          key={item}
          className="grid grid-cols-[40px_1fr] gap-3 border-b border-surface-border pb-3"
        >
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AccessChangeProofRunPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <SectionLabel>Bounded Access-Change Proof Run</SectionLabel>
        <h1
          className="mt-2 max-w-4xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Turn one sensitive access change into an evidence bundle others can inspect.
        </h1>
        <div className="mt-6 max-w-[780px] space-y-4 text-base leading-8 text-text-secondary">
          <p>
            One sensitive access change. Five business days. A bounded evidence
            bundle others can inspect.
          </p>
          <p>
            WitnessOps packages one access grant, revoke, role change, vendor
            access review, or admin permission update into a proof-run bundle
            with authority, source evidence, custody notes, checksums, receipt,
            verifier notes, and findings.
          </p>
          <p className="text-sm leading-7 text-text-muted">
            The active public request lane is the AI Agent Action Proof Run.
            Access-change scoping is handled by email first so this offer does
            not send buyers into the AI-agent intake form.
          </p>
        </div>
        <div className="mt-6 grid gap-3 text-sm leading-relaxed text-text-primary sm:grid-cols-2">
          <div className="border border-surface-border bg-surface-card/40 p-4">
            <span className="font-semibold">Fixed fee:</span> €2,500.
          </div>
          <div className="border border-surface-border bg-surface-card/40 p-4">
            <span className="font-semibold">Payment:</span> 50% upfront, 50% on delivery.
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton
              href={requestHref}
              variant="primary"
              label="Ask about access-change scoping"
            />
            <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-text-muted">
              Start by email through Support. Do not submit secrets in the first message.
            </p>
          </div>
          <div>
            <CtaButton
              href={sampleProofRunHref}
              variant="secondary"
              label="View sample proof run"
            />
            <p className="mt-2 max-w-[320px] text-xs leading-relaxed text-text-muted">
              The public sample shows proof-run shape only, not real customer evidence.
            </p>
          </div>
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <SectionLabel>Proof question</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What this proof run answers
        </h2>
        <div className="mt-5 max-w-[760px] space-y-4 text-sm leading-7 text-text-secondary">
          <p>
            A bounded access-change proof run answers one narrow question: Can
            this specific access-change claim be supported by named authority,
            source evidence, custody notes, and a replayable inspection path?
          </p>
          <p>
            It does not try to prove the entire security program. It does not
            claim broad compliance. It does not replace audit, legal, or
            certification work.
          </p>
        </div>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <SectionLabel>Deliverables</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What you receive
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {deliverables.map((item) => (
            <div
              key={item}
              className="border border-surface-border bg-surface-card/40 p-4 text-sm leading-7 text-text-secondary"
            >
              {item}
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[820px] text-sm leading-7 text-text-muted">
          The output is designed so a founder, CTO, security lead, customer,
          auditor, or internal reviewer can inspect what was claimed, what
          evidence was used, and what remains unproven.
        </p>
      </section>

      <section className="mb-10 grid gap-8 border-b border-surface-border pb-8 lg:grid-cols-2">
        <div>
          <SectionLabel>Good fit</SectionLabel>
          <h2
            className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Access changes that fit
          </h2>
          <NumberedList items={goodFitExamples} />
        </div>
        <div>
          <SectionLabel>Bad fit</SectionLabel>
          <h2
            className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            This is not a good fit if
          </h2>
          <NumberedList items={badFitExamples} />
        </div>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <SectionLabel>Client inputs</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What the client provides
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {clientInputs.map((item) => (
            <div
              key={item}
              className="border border-surface-border bg-surface-card/40 p-4 text-sm leading-7 text-text-secondary"
            >
              {item}
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[760px] border border-surface-border bg-surface-bg p-4 text-sm leading-7 text-text-muted">
          Do not submit secrets through Support or email. Source materials are
          handled only after scope and intake are agreed.
        </p>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <SectionLabel>Possible findings</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What the proof run may conclude
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-7 text-text-muted">
          The page does not promise a happy result. It promises a bounded process.
        </p>
        <div className="mt-6">
          <NumberedList items={possibleFindings} />
        </div>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <SectionLabel>Boundary</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What is not claimed
        </h2>
        <ul className="mt-6 grid gap-3 text-sm leading-7 text-text-secondary md:grid-cols-2">
          {boundaries.map((item) => (
            <li key={item} className="border border-surface-border bg-surface-card/40 p-4">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 grid gap-8 border-b border-surface-border pb-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionLabel>Timeline</SectionLabel>
          <h2
            className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Five business days
          </h2>
          <dl className="mt-6 grid gap-3">
            {timeline.map((item) => (
              <div
                key={item.label}
                className="grid gap-2 border-b border-surface-border pb-3 sm:grid-cols-[96px_1fr]"
              >
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">
                  {item.label}
                </dt>
                <dd className="text-sm leading-7 text-text-secondary">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="border border-surface-border bg-surface-card/40 p-5">
          <SectionLabel>Fee</SectionLabel>
          <p className="mt-4 text-3xl font-semibold text-text-primary">
            €2,500 fixed fee.
          </p>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            50% upfront. 50% on delivery. Delivered in 5 business days after
            source materials are received.
          </p>
        </div>
      </section>

      <section className="border border-surface-border bg-surface-card/40 p-6">
        <SectionLabel>Request</SectionLabel>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Ask about access-change scoping
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-7 text-text-secondary">
          Send a short non-secret note through Support with:
        </p>
        <ul className="mt-5 grid gap-3 text-sm leading-7 text-text-secondary md:grid-cols-2">
          {ctaPrompts.map((item) => (
            <li key={item} className="border border-surface-border bg-surface-bg p-4">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[760px] text-sm leading-7 text-text-muted">
          Do not submit secrets in the first message. The active public request
          lane remains the AI Agent Action Proof Run.
        </p>
        <div className="mt-6">
          <CtaButton
            href={requestHref}
            variant="primary"
            label="Ask about access-change scoping"
          />
        </div>
      </section>
    </main>
  );
}
