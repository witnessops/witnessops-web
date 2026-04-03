import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getDocsUrl, getSurfaceUrl } from "@witnessops/config";
import {
  getCanonicalDocSlug,
  getDocCanonicalUrl,
  getDocHref,
  getDocPage,
  getDocSectionTitle,
  getLegacyDocRedirectSlug,
  listDocPages,
} from "@witnessops/content/docs";
import { getDocsLayerForSlug } from "@witnessops/content/sidebar";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { QuickActionFrame } from "@/components/docs/quick-action-frame";
import { EvidenceMappingGuardrails } from "@/components/docs/evidence-mapping-guardrails";
import { PageAnswer } from "@/components/docs/page-answer";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";

/** Quick action frame data for pages that need it */
const QUICK_ACTION_FRAMES: Record<string, {
  whenToStop: string;
  escalationTrigger: string;
  evidenceRequired: string;
  nextPath: { label: string; href: string };
}> = {
  "decisions/scope-check": {
    whenToStop: "Stop when the target, environment, or objective is ambiguous.",
    escalationTrigger: "Escalate when the next step affects privileged accounts, production systems, sensitive data, or broad tenant scope.",
    evidenceRequired: "Record the target, objective, planned action, and why you believe it is authorized.",
    nextPath: { label: "Do I Need to Escalate?", href: "/docs/decisions/escalation" },
  },
  "decisions/escalation": {
    whenToStop: "Stop when the next action is intrusive, hard to reverse, or broader than the original task.",
    escalationTrigger: "Escalate when scope, impact, authority, or evidence quality becomes uncertain.",
    evidenceRequired: "Provide the objective, target, observations, actions already taken, current risks, and recommended next step.",
    nextPath: { label: "What Evidence Is Required?", href: "/docs/decisions/evidence-required" },
  },
  "decisions/evidence-required": {
    whenToStop: "Stop before closing when the artifact, method, rationale, or timeline cannot be reconstructed from the record.",
    escalationTrigger: "Escalate when the available evidence suggests broader impact but does not yet support a safe conclusion.",
    evidenceRequired: "Capture the target, time, method, observation, conclusion, and any uncertainty or follow-up action.",
    nextPath: { label: "Do I Need to Escalate?", href: "/docs/decisions/escalation" },
  },
  "scenarios/phishing-investigation": {
    whenToStop: "Stop when the next step would move from message validation into broader account, mailbox, or tenant response without approval.",
    escalationTrigger: "Escalate immediately if credentials were entered, MFA may have been approved, code was executed, or privileged accounts are involved.",
    evidenceRequired: "Preserve the message or identifier, sender and recipient details, indicators, user interaction status, and your classification rationale.",
    nextPath: { label: "Do I Need to Escalate?", href: "/docs/decisions/escalation" },
  },
};

interface Props {
  params: Promise<{ slug: string[] }>;
}

function formatNamespaceLabel(value: string) {
  return value.replace(/-/g, " ").toUpperCase();
}

export async function generateStaticParams() {
  const docs = await listDocPages("witnessops");
  return docs.filter((doc) => doc.slug.length > 0).map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = getCanonicalDocSlug("witnessops", slug);
  const doc = await getDocPage("witnessops", canonicalSlug);

  if (!doc) {
    return { title: "Document Not Found" };
  }

  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: getDocCanonicalUrl("witnessops", doc.slug),
    },
  };
}

async function getAdjacentDocs(currentSlug: string[]) {
  const docs = await listDocPages("witnessops");
  const slugKey = currentSlug.join("/");
  const idx = docs.findIndex((d) => d.slug.join("/") === slugKey);

  return {
    prev: idx > 0 ? docs[idx - 1] : null,
    next: idx < docs.length - 1 ? docs[idx + 1] : null,
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const redirectSlug = getLegacyDocRedirectSlug("witnessops", slug);

  if (redirectSlug) {
    permanentRedirect(getDocHref(redirectSlug));
  }

  const doc = await getDocPage("witnessops", slug);

  if (!doc) {
    notFound();
  }

  const sectionTitle = getDocSectionTitle(doc.section);
  const layer = getDocsLayerForSlug("witnessops", doc.slug);
  const { prev, next } = await getAdjacentDocs(doc.slug);
  const pageAnswer = doc.pageAnswer;

  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter mx-auto max-w-3xl">
      {/* KB-grade Breadcrumb */}
      <nav className="kb-breadcrumb" aria-label="Breadcrumb">
        <a href={getDocsUrl("witnessops")}>DOCS</a>
        {layer ? (
          <>
            <span className="kb-bc-sep" aria-hidden="true">/</span>
            <span>{layer.title.toUpperCase()}</span>
          </>
        ) : null}
        <span className="kb-bc-sep" aria-hidden="true">/</span>
        <span className="kb-bc-current" aria-current="page">
          {(doc.navLabel ?? doc.title).toUpperCase()}
        </span>
      </nav>

      {/* Page Header */}
      <header className="mb-10 border-b border-surface-border pb-6">
        <div className="kb-section-tag">
          {formatNamespaceLabel(layer?.title ?? sectionTitle)}
        </div>
        {layer && layer.title !== sectionTitle ? (
          <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-text-muted">
            {sectionTitle}
          </div>
        ) : null}
        <h1 className="mb-3 font-[var(--font-display)] text-4xl font-semibold uppercase tracking-[0.06em] leading-none text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
          {doc.title}
        </h1>
        {doc.description ? (
          <p className="mt-3 text-sm leading-relaxed text-text-muted max-w-[600px] tracking-wide">{doc.description}</p>
        ) : null}
        {pageAnswer ? <PageAnswer question={pageAnswer.question} links={pageAnswer.links} /> : null}
      </header>

      {doc.trustBoundaryVariant ? (
        <TrustBoundarySnippet variant={doc.trustBoundaryVariant} className="mt-0 mb-8" />
      ) : null}

      {doc.section === "evidence-mapping" ? <EvidenceMappingGuardrails /> : null}

      {/* Body */}
      <MarkdownContent source={doc.body} siteBaseUrl={getSurfaceUrl("witnessops")} />

      {/* Quick Action Frame (auto-injected for decision/scenario pages) */}
      {QUICK_ACTION_FRAMES[doc.slug.join("/")] && (
        <QuickActionFrame {...QUICK_ACTION_FRAMES[doc.slug.join("/")]} />
      )}

      {/* KB-grade Prev / Next */}
      <nav className="kb-related mt-16" aria-label="Pagination">
        {prev ? (
          <Link
            href={prev.slug.length === 0 ? "/docs" : `/docs/${prev.slug.join("/")}`}
            className="kb-related-link"
          >
            &larr; {prev.navLabel ?? prev.title}
          </Link>
        ) : null}
        {next ? (
          <Link
            href={`/docs/${next.slug.join("/")}`}
            className="kb-related-link"
          >
            {next.navLabel ?? next.title} &rarr;
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
