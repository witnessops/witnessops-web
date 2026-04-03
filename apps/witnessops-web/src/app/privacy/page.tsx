import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCanonicalAlternates } from "@witnessops/config";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { TrustBoundarySnippet } from "@/components/shared/trust-boundary-snippet";
import { loadLegalIndex, loadLegalPage } from "@/lib/content";

export function generateMetadata(): Metadata {
  const doc = loadLegalPage("privacy");

  return {
    title: doc?.title ?? "Privacy Policy",
    description: doc?.description ?? "WITNESSOPS privacy policy.",
    alternates: getCanonicalAlternates("witnessops", "/privacy"),
  };
}

export default function PrivacyPage() {
  const doc = loadLegalPage("privacy");
  const relatedDocs = loadLegalIndex().filter((entry) => entry.slug !== "privacy");

  if (!doc) {
    notFound();
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[720px] px-6 py-24">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          {doc.title}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">{doc.description}</p>
      </header>

      <MarkdownContent source={doc.body} />

      {doc.trustBoundaryVariant ? (
        <TrustBoundarySnippet variant={doc.trustBoundaryVariant} className="mt-8" />
      ) : null}

      {relatedDocs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-text-primary">
            Related Legal Documents
          </h2>
          <div className="mt-4 space-y-3">
            {relatedDocs.map((entry) => (
              <Link
                key={entry.slug}
                href={`/${entry.slug}`}
                className="block rounded-lg border border-surface-border bg-surface-card p-4 transition-colors hover:border-brand-accent/30"
              >
                <h3 className="font-medium text-text-primary">{entry.navLabel}</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {entry.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
