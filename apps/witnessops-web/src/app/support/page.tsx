import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCanonicalAlternates } from "@witnessops/config";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { loadSupportIndex, loadSupportPage } from "@/lib/content";
import { SupportIntake } from "@/components/support/support-intake";
import { getMailboxConfig } from "@/lib/mailboxes";

export function generateMetadata(): Metadata {
  const doc = loadSupportPage("support-policy");

  return {
    title: doc?.title ?? "Support",
    description:
      doc?.description ?? "WITNESSOPS support resources and service policies.",
    alternates: getCanonicalAlternates("witnessops", "/support"),
  };
}

interface SupportPageProps {
  searchParams?: Promise<{ verified?: string; threadId?: string }>;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const mailboxes = getMailboxConfig();
  const supportDocs = loadSupportIndex();
  const primaryDoc = loadSupportPage("support-policy") ?? supportDocs[0];
  const resolvedSearchParams = (await searchParams) ?? {};

  if (!primaryDoc) {
    notFound();
  }

  const relatedDocs = supportDocs.filter((doc) => doc.slug !== primaryDoc.slug);

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[960px] px-6 py-24">
      {/* Header */}
      <header className="mb-10 border-b border-surface-border pb-6">
        <div className="kb-section-tag">Support</div>
        <h1
          className="mb-3 text-text-primary"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.06 }}
        >
          {primaryDoc.title}
        </h1>
        {primaryDoc.description && (
          <p className="text-sm leading-relaxed text-text-muted max-w-[600px]">{primaryDoc.description}</p>
        )}
        {resolvedSearchParams.verified === "1" && (
          <div className="mt-5 border border-signal-green/30 bg-signal-green/5 px-4 py-3 text-sm text-signal-green">
            Mailbox verified. Your support thread is now admitted{resolvedSearchParams.threadId ? ` as ${resolvedSearchParams.threadId}` : ""}.
          </div>
        )}
      </header>

      {/* Split layout: policy + intake */}
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Left: policy content + related docs */}
        <div>
          <MarkdownContent source={primaryDoc.body} />

          {/* Related docs */}
          {relatedDocs.length > 0 && (
            <section className="mt-12">
              <h2
                className="mb-4 flex items-center gap-3"
                style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}
              >
                Related
                <span className="flex-1 h-px bg-surface-border" />
              </h2>
              <div className="space-y-0">
                {relatedDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/support/${doc.slug}`}
                    className="flex items-center justify-between border-b border-surface-border py-3 transition-colors hover:text-brand-accent group"
                  >
                    <span
                      className="text-text-secondary group-hover:text-brand-accent transition-colors"
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em" }}
                    >
                      {doc.navLabel}
                    </span>
                    <span
                      style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-brand-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >
                      {doc.section}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Contact fallback */}
          <div
            className="mt-10 border border-surface-border p-5"
            style={{ background: "rgba(255,255,255,0.01)" }}
          >
            <p
              className="mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
            >
              Prefer direct email?
            </p>
            <p className="text-xs text-text-muted leading-relaxed mb-3">
              You can still write to the support mailbox directly. No human workflow starts until the sender mailbox is verified.
            </p>
            <a
              href={`mailto:${mailboxes.support}`}
              className="inline-flex items-center px-4 py-2 border border-surface-border text-text-muted transition-all hover:border-brand-accent/40 hover:text-text-primary"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em" }}
            >
              {mailboxes.support}
            </a>
          </div>
        </div>

        {/* Right: intake form */}
        <div>
          <SupportIntake supportEmail={mailboxes.support} />
        </div>
      </div>
    </main>
  );
}
