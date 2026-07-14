import type { Metadata } from "next";
import Link from "next/link";

type LibraryGroup = {
  title: string;
  description: string;
  links: { label: string; href: string; note: string }[];
  primary?: boolean;
};

const groups: LibraryGroup[] = [
  {
    title: "Start here",
    description: "Choose the route that matches the decision in front of you.",
    primary: true,
    links: [
      { label: "Browse services", href: "/catalog", note: "Compare bounded reviews by situation, result, price and timing." },
      { label: "Start a review", href: "/review/request", note: "Describe the situation without sending files or secrets." },
      { label: "Customer Security Review Sprint", href: "/customer-security-review", note: "Prepare one supported questionnaire response." },
    ],
  },
  {
    title: "Buyer guides",
    description: "Understand scope, handover and the limits of a supported result.",
    primary: true,
    links: [
      { label: "Why WitnessOps", href: "/why-witnessops", note: "How bounded work becomes explainable and reviewable." },
      { label: "Security workflow buyer path", href: "/docs/getting-started/proof-run-buyer-path", note: "A technical buyer's route through offer, sample and request." },
    ],
  },
  {
    title: "Example deliverables",
    description: "Inspect clearly labelled examples before deciding what to request.",
    primary: true,
    links: [
      { label: "AI-agent action sample", href: "/review/sample-cases/ai-agent-action-proof-run", note: "A public sample showing scope, evidence references and limits." },
      { label: "Illustrative sample report", href: "/review/sample-report", note: "A generic report shape, not live customer evidence." },
      { label: "Named sample cases", href: "/review/sample-cases", note: "Explanatory workflow classes with explicit boundaries." },
    ],
  },
  {
    title: "Service explanations",
    description: "Read the detail behind the main service families.",
    links: [
      { label: "Workflow reviews", href: "/catalog/workflows", note: "Bounded action and handover packages." },
      { label: "Security review services", href: "/catalog/offsec", note: "Read-only and launch-readiness review shapes." },
    ],
  },
  {
    title: "Verification",
    description: "Check published receipts, fixtures and first-party bundles.",
    links: [
      { label: "Public verifier", href: "/verify", note: "Inspect the stated result and its declared boundary." },
      { label: "Verification contract", href: "/docs/how-it-works/verification", note: "Understand what verification does and does not establish." },
    ],
  },
  {
    title: "Technical references",
    description: "Use the technical documentation for model and implementation detail.",
    links: [
      { label: "Documentation", href: "/docs", note: "Technical concepts, workflows and trust boundaries." },
    ],
  },
];

const exampleBoundary =
  "Examples are labelled samples or illustrations. Each example is not a live customer artifact.";

export const metadata: Metadata = {
  title: "WitnessOps Library",
  description: "Buyer guides, example deliverables, service explanations, verification and technical references from WitnessOps.",
  alternates: {
    canonical: "/library",
    languages: { en: "/library", pl: "/pl/library", "x-default": "/library" },
  },
};

export default function LibraryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-20">
        <header className="max-w-5xl border-b border-surface-border pb-10">
          <p className="text-sm font-semibold text-text-muted">Library</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl lg:text-6xl">
            Clear routes into services, examples and technical detail.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            Start with the decision you need to make. Move into verification or
            technical documentation only when that detail helps.
          </p>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {groups.map((group) => (
            <section
              key={group.title}
              className={group.primary ? "border-2 border-black bg-white p-5 sm:p-6" : "border border-surface-border bg-surface-bg-alt p-5 sm:p-6"}
            >
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">{group.title}</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">{group.description}</p>
              <ul className="mt-6 space-y-5">
                {group.links.map((item) => (
                  <li key={item.href} className="border-t border-surface-border pt-4">
                    <Link href={item.href} className="inline-flex min-h-11 w-full items-center font-semibold text-text-primary underline decoration-1 underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2">{item.label}</Link>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{item.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-sm leading-7 text-text-muted">
          {exampleBoundary} Published first-party proof bundles remain bounded by
          the claims and limits stated on their own pages.
        </p>
      </div>
    </main>
  );
}
