import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

interface VerifiableItem {
  title: string;
  body: string;
  proof_link: string;
  proof_link_label: string;
}

interface SectionCta {
  label: string;
  href: string;
  variant: string;
}

interface VerifiableSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  lede: string;
  items: VerifiableItem[];
  closing: string;
  cta?: SectionCta;
  ctas?: SectionCta[];
}

export function VerifiableSection({
  id,
  title,
  lede,
  items,
  closing,
  cta,
  ctas,
}: VerifiableSectionProps) {
  const primaryAction = ctas?.length ? ctas[0] : cta;
  const supportingLink = ctas?.length
    ? (ctas.find((entry) => entry.variant === "ghost") ?? ctas[1])
    : undefined;

  return (
    <SectionShell id={id} spacing="compact" className="border-b border-surface-border">
      <p className="kb-section-tag mb-4">WHAT IS VERIFIABLE TODAY</p>
      <h2 className="mb-4 max-w-[36ch] text-2xl font-semibold leading-[1.2] tracking-[-0.005em] text-text-primary md:text-3xl">
        {title}
      </h2>
      <p className="mb-5 max-w-[60ch] text-lg leading-7 text-text-secondary">{lede}</p>

      <div className="border border-surface-border-strong bg-surface-card">
        <div className="hidden md:grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,220px)] gap-4 border-b border-surface-border px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            Artifact
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            Summary
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            Status
          </span>
        </div>

        <ol className="divide-y divide-surface-border">
          {items.map((item, i) => (
            <li key={item.title}>
              <Link
                href={item.proof_link}
                target="_blank"
                rel="noreferrer"
                aria-label={`${item.proof_link_label} (opens in a new tab)`}
                className="group kb-hover-row kb-hover-row--rail-left grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,220px)] gap-x-4 gap-y-1 px-4 py-3 sm:gap-y-2 sm:px-5 sm:py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-trust focus-visible:ring-inset"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="font-mono text-[11px] leading-6 text-text-muted select-none transition-colors duration-200 group-hover:text-brand-accent"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                </div>
                <p className="text-[13px] leading-[1.55] text-text-secondary">
                  {item.body}
                </p>
                <div className="flex items-center justify-between md:justify-start md:gap-5">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 rounded-full bg-signal-green transition-[box-shadow] duration-300 group-hover:shadow-[0_0_0_3px_rgba(107,196,152,0.22)]"
                    />
                    <span className="text-[12px] text-text-secondary">Checkable</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12px] text-text-muted transition-colors duration-200 group-hover:text-accent-trust">
                    Open bundle (new tab)
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 max-w-[720px]">
        <p className="max-w-[60ch] text-base leading-[1.6] text-text-secondary">{closing}</p>
      </div>

      {primaryAction && (
        <div className="mt-7">
          <CtaButton
            label={primaryAction.label}
            href={primaryAction.href}
            variant={(primaryAction.variant as "primary" | "secondary" | "ghost") ?? "primary"}
          />
          {supportingLink && (
            <div className="mt-2.5">
              <Link
                href={supportingLink.href}
                className="text-sm font-mono text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
              >
                → {supportingLink.label}
              </Link>
            </div>
          )}
        </div>
      )}
    </SectionShell>
  );
}
