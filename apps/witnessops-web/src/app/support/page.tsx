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
  const title = doc?.title ?? "Support";
  const description =
    doc?.description ?? "Support policy, disclosure guidance, and email follow-up through the support mailbox.";

  return {
    title,
    description,
    alternates: getCanonicalAlternates("witnessops", "/support"),
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
      <header className="mb-10 border-b border-surface-border pb-6">
        <div className="kb-section-tag">Support</div>
        <h1
          className="mb-3 text-text-primary"
          style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1.06 }}
        >
          {primaryDoc.title}
        </h1>
        {primaryDoc.description && (
          <p className="max-w-[600px] text-sm leading-relaxed text-text-muted">{primaryDoc.description}</p>
        )}
        {resolvedSearchParams.verified === "1" && (
          <div className="mt-5 border border-signal-green/30 bg-signal-green/5 px-4 py-3 text-sm text-signal-green">
            Mailbox verified for support email follow-up{resolvedSearchParams.threadId ? ` as ${resolvedSearchParams.threadId}` : ""}.
          </div>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <MarkdownContent source={primaryDoc.body} />

          <div className="mt-8 border border-surface-border bg-surface-bg p-5">
            <p
              className="mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
            >
              Need a workflow review instead?
            </p>
            <p className="text-sm leading-relaxed text-text-muted">
              Support is for product help, access issues, and verifier questions.
              If you want WitnessOps to inspect one real workflow, automation boundary,
              or operator decision path, use{" "}
              <Link href="/review/request" className="text-brand-accent underline-offset-4 hover:underline">
                Review intake
              </Link>
              .
            </p>
          </div>

          {relatedDocs.length > 0 && (
            <section className="mt-12">
              <h2
                className="mb-4 flex items-center gap-3"
                style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}
              >
                Related
                <span className="h-px flex-1 bg-surface-border" />
              </h2>
              <div className="space-y-0">
                {relatedDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/support/${doc.slug}`}
                    className="group flex items-center justify-between border-b border-surface-border py-3 transition-colors hover:text-brand-accent"
                  >
                    <span
                      className="text-text-secondary transition-colors group-hover:text-brand-accent"
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
            <p className="mb-3 text-xs leading-relaxed text-text-muted">
              You can email the support mailbox directly. The form on this page
              also routes to email rather than the admin queue.
            </p>
            <a
              href={`mailto:${mailboxes.support}`}
              className="inline-flex items-center border border-surface-border px-4 py-2 text-text-muted transition-all hover:border-brand-accent/40 hover:text-text-primary"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em" }}
            >
              {mailboxes.support}
            </a>
          </div>
        </div>

        <div>
          <SupportIntake supportEmail={mailboxes.support} />
        </div>
      </div>
    </main>
  );
}
