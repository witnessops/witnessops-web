import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ComponentType } from "react";
import { getDocsUrl, getSurfaceUrl } from "@witnessops/config";
import {
  getCanonicalDocSlug,
  getDocCanonicalUrl,
  getDocHref,
  getDocPage,
  getDocSectionTitle,
  getLegacyDocRedirectSlug,
  listDocPages,
  type DocPage,
} from "@witnessops/content/docs";
import { getDocsLayerForSlug, getDocsSidebar } from "@witnessops/content/sidebar";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { QuickActionFrame } from "@/components/docs/quick-action-frame";
import { EvidenceMappingGuardrails } from "@/components/docs/evidence-mapping-guardrails";
import { VerifyFirstVerifierFlow } from "@/components/docs/verify-first-verifier-flow";
import { PageAnswer } from "@/components/docs/page-answer";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

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

const DOC_COMPONENT_INJECTIONS: Record<string, ComponentType> = {
  "quickstart/verify-first": VerifyFirstVerifierFlow,
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

  const description =
    doc.description ?? "WitnessOps documentation and verification guidance.";

  return {
    title: doc.title,
    description,
    alternates: {
      canonical: getDocCanonicalUrl("witnessops", doc.slug),
    },
    openGraph: {
      title: `${doc.title} | WitnessOps`,
      description,
      siteName: "WitnessOps",
      type: "article",
      images: DEFAULT_OPEN_GRAPH_IMAGES,
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.title} | WitnessOps`,
      description,
      images: DEFAULT_TWITTER_IMAGES,
    },
  };
}

async function getAdjacentDocs(currentSlug: string[]) {
  const [docs, sidebar] = await Promise.all([
    listDocPages("witnessops"),
    getDocsSidebar("witnessops"),
  ]);
  const docsByHref = new Map(docs.map((doc) => [getDocHref(doc.slug), doc]));
  const seenHrefs = new Set<string>();
  const orderedDocs: DocPage[] = [];

  for (const section of sidebar) {
    for (const item of section.items) {
      const doc = docsByHref.get(item.href);
      if (!doc || seenHrefs.has(item.href)) {
        continue;
      }

      seenHrefs.add(item.href);
      orderedDocs.push(doc);
    }
  }

  for (const doc of docs) {
    const href = getDocHref(doc.slug);
    if (seenHrefs.has(href)) {
      continue;
    }

    seenHrefs.add(href);
    orderedDocs.push(doc);
  }

  const slugKey = currentSlug.join("/");
  const idx = orderedDocs.findIndex((doc) => doc.slug.join("/") === slugKey);

  return {
    prev: idx > 0 ? orderedDocs[idx - 1] : null,
    next: idx >= 0 && idx < orderedDocs.length - 1 ? orderedDocs[idx + 1] : null,
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
  const InjectedDocComponent = DOC_COMPONENT_INJECTIONS[doc.slug.join("/")];

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl"
      data-docs-nav-surface="docs-content"
      data-docs-layer-context={layer?.id ?? doc.section}
    >
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
      {InjectedDocComponent ? <InjectedDocComponent /> : null}

      {/* Quick Action Frame (auto-injected for decision/scenario pages) */}
      {QUICK_ACTION_FRAMES[doc.slug.join("/")] && (
        <QuickActionFrame {...QUICK_ACTION_FRAMES[doc.slug.join("/")]} />
      )}

      {/* KB-grade Prev / Next */}
      <nav
        className="kb-related mt-16"
        aria-label="Pagination"
        data-docs-nav-surface="pagination"
      >
        {prev ? (
          <Link
            href={prev.slug.length === 0 ? "/docs" : `/docs/${prev.slug.join("/")}`}
            className="kb-related-link"
            data-docs-event-type="previous_click"
          >
            &larr; {prev.navLabel ?? prev.title}
          </Link>
        ) : null}
        {next ? (
          <Link
            href={`/docs/${next.slug.join("/")}`}
            className="kb-related-link"
            data-docs-event-type="next_click"
          >
            {next.navLabel ?? next.title} &rarr;
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
