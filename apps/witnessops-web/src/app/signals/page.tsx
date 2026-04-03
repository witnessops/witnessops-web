import type { Metadata } from "next";
import Link from "next/link";
import { getSignalsCanonicalUrl, listSignals, type SignalType } from "@witnessops/content/signals";

const signalTypeLabels: Record<SignalType, string> = {
  availability: "Availability",
  verification: "Verification",
  receipts: "Receipts",
  bundles: "Bundles",
  docs: "Docs",
  policy: "Policy",
  security: "Security",
  legal: "Legal",
  incident: "Incident",
  deprecation: "Deprecation",
};

export const metadata: Metadata = {
  title: "Signals",
  description:
    "Public notices for material WitnessOps changes affecting use, verification, trust, policy, and availability.",
  alternates: { canonical: getSignalsCanonicalUrl() },
};

function formatSignalMonth(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function SignalsPage() {
  const signals = await listSignals();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[960px] px-6 py-20">
      <header className="border-b border-surface-border pb-10">
        <div className="kb-section-tag">Signals</div>
        <h1
          className="mt-2 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Signals
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Public notices. Material changes only.
        </p>
        <div className="mt-6 space-y-2 text-sm leading-relaxed text-text-muted">
          <p>Signals publishes operational announcements affecting verification, receipts and bundles, execution behavior, policy and legal posture, and availability.</p>
          <p>Not a blog. Not commentary.</p>
          <p>If it changes how the system is used, verified, or trusted, it appears here.</p>
        </div>
      </header>

      <section className="mt-10">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Latest
          <span className="flex-1 h-px bg-surface-border" />
        </h2>

        <div className="space-y-6">
          {signals.map((signal) => {
            const links = signal.links;

            return (
            <article key={signal.slug} className="border border-surface-border bg-surface-bg p-6">
              <h3
                className="text-2xl font-semibold tracking-tight text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {signal.title}
              </h3>

              <p
                className="mt-2 text-xs uppercase tracking-[0.16em] text-text-muted"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <time dateTime={signal.date}>{formatSignalMonth(signal.date)}</time>
                <span className="px-2">·</span>
                {signalTypeLabels[signal.type]}
              </p>

              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                {signal.summary}
              </p>

              <dl className="mt-6 space-y-4 border-t border-surface-border pt-5">
                <div className="grid gap-1 md:grid-cols-[110px_1fr] md:gap-4">
                  <dt
                    className="text-[10px] uppercase tracking-[0.16em] text-brand-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Impact
                  </dt>
                  <dd className="text-sm leading-relaxed text-text-secondary">{signal.impact}</dd>
                </div>
                <div className="grid gap-1 md:grid-cols-[110px_1fr] md:gap-4">
                  <dt
                    className="text-[10px] uppercase tracking-[0.16em] text-brand-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Invariant
                  </dt>
                  <dd className="text-sm leading-relaxed text-text-secondary">{signal.invariant}</dd>
                </div>
                <div className="grid gap-1 md:grid-cols-[110px_1fr] md:gap-4">
                  <dt
                    className="text-[10px] uppercase tracking-[0.16em] text-brand-muted"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    Action
                  </dt>
                  <dd className="text-sm leading-relaxed text-text-secondary">{signal.action ?? "None."}</dd>
                </div>
              </dl>

              {links?.length ? (
                <nav
                  aria-label={`${signal.title} related links`}
                  className="mt-6 flex flex-wrap items-center gap-2 text-sm text-brand-accent"
                >
                  {links.map((link, index) => (
                    <span key={`${signal.slug}:${link.href}`} className="flex items-center gap-2">
                      <Link href={link.href} className="transition-colors hover:text-text-primary">
                        {link.label}
                      </Link>
                      {index < links.length - 1 ? (
                        <span className="text-text-muted">·</span>
                      ) : null}
                    </span>
                  ))}
                </nav>
              ) : null}
            </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
