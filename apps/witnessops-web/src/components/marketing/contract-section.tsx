import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";

interface ContractSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  lede: string;
  steps: { label: string; body: string }[];
  closing: string;
  cta?: { label: string; href: string; variant: string };
}

export function ContractSection({ id, title, lede, steps, closing, cta }: ContractSectionProps) {
  return (
    <SectionShell id={id} spacing="compact">
      <p className="kb-section-tag mb-4">How a proof-backed run works</p>
      <h2 className="mb-4 max-w-[36ch] text-2xl font-semibold leading-[1.2] tracking-[-0.005em] text-text-primary md:text-3xl">
        {title}
      </h2>
      <p className="mb-5 max-w-[60ch] text-lg leading-7 text-text-secondary">{lede}</p>

      <ol className="flex flex-col md:flex-row border border-surface-border divide-y divide-surface-border md:divide-y-0 md:divide-x">
        {steps.map((step, i) => (
          <li
            key={step.label}
            className="group kb-hover-row kb-hover-row--rail-top relative flex-1 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center border border-surface-border bg-surface-bg text-[11px] font-mono text-text-muted transition-colors duration-200 group-hover:border-brand-accent group-hover:text-brand-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="pt-0.5 text-sm font-semibold text-text-primary transition-colors duration-200 group-hover:text-brand-accent">
                {step.label}
              </h3>
            </div>
            <p className="text-[13px] leading-[1.55] text-text-secondary">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-surface-border pt-4">
        <p className="max-w-[65ch] text-base leading-[1.6] text-text-secondary">{closing}</p>
      </div>

      {cta && (
        <div className="mt-7">
          <Link
            href={cta.href}
            className="text-sm font-mono text-text-muted hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          >
            → {cta.label}
          </Link>
        </div>
      )}
    </SectionShell>
  );
}
