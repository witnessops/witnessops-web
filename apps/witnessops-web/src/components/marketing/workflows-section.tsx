import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

interface WorkflowCard {
  title: string;
  body: string;
  proof_link: string;
  proof_link_label: string;
}

interface WorkflowSurface {
  title: string;
  body: string;
}

interface SectionCta {
  label: string;
  href: string;
  variant: string;
}

interface WorkflowsSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  lede: string;
  cards: WorkflowCard[];
  surfaces: WorkflowSurface[];
  internal_surfaces_disclosure: string;
  cta?: SectionCta;
  ctas?: SectionCta[];
}

export function WorkflowsSection({
  id,
  title,
  lede,
  cards,
  surfaces,
  internal_surfaces_disclosure,
  cta,
  ctas,
}: WorkflowsSectionProps) {
  const primaryAction = ctas?.length ? ctas[0] : cta;
  const supportingLink = ctas?.length
    ? (ctas.find((entry) => entry.variant === "ghost") ?? ctas[1])
    : undefined;

  return (
    <SectionShell id={id} spacing="compact">
      <p className="kb-section-tag mb-4">REPRESENTATIVE WORKFLOWS</p>
      <h2 className="mb-4 max-w-[36ch] text-2xl font-semibold leading-[1.2] tracking-[-0.005em] text-text-primary md:text-3xl">
        {title}
      </h2>
      <p className="mb-5 max-w-[60ch] text-lg leading-7 text-text-secondary">{lede}</p>

      {/* Block A — Three sample workflows as a unified register strip */}
      <ul className="grid grid-cols-1 md:grid-cols-3 border border-surface-border bg-surface-card divide-y divide-surface-border md:divide-y-0 md:divide-x">
        {cards.map((card, i) => (
          <li key={card.title}>
            <Link
              href={card.proof_link}
              target="_blank"
              rel="noreferrer"
              aria-label={`${card.proof_link_label} (opens in a new tab)`}
              className="group kb-hover-row kb-hover-row--rail-top kb-hover-card block h-full border border-transparent p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-trust focus-visible:ring-inset"
            >
              <article className="flex h-full flex-col">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted transition-colors duration-200 group-hover:text-brand-accent">
                  Workflow {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mb-2 text-sm font-semibold text-text-primary">{card.title}</h3>
                <p className="mb-3 flex-1 text-[13px] leading-[1.55] text-text-secondary">{card.body}</p>
                <span className="inline-flex items-center gap-1 text-[12px] text-text-primary transition-colors duration-200 group-hover:text-accent-trust">
                  {card.proof_link_label} (new tab)
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </article>
            </Link>
          </li>
        ))}
      </ul>

      {/* Block B — Operating surfaces */}
      <div className="mt-5 border-t border-surface-border pt-5">
        <p className="kb-section-tag mb-5">How workflows are run and inspected</p>
        <dl className="grid gap-4 md:grid-cols-2">
          {surfaces.map((surface) => (
            <div key={surface.title}>
              <dt className="mb-1 text-sm font-medium text-text-primary">{surface.title}</dt>
              <dd className="text-sm leading-[1.55] text-text-secondary">{surface.body}</dd>
            </div>
          ))}
        </dl>

        {/* Internal-only surfaces disclosure */}
        <details className="mt-5 border-t border-surface-border pt-3">
          <summary className="list-none cursor-pointer select-none text-xs font-mono text-text-muted hover:text-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg">
            <span aria-hidden="true" className="mr-2">▸</span>Internal-only surfaces
          </summary>
          <p className="mt-3 text-sm leading-[1.6] text-text-secondary max-w-[55ch]">
            {internal_surfaces_disclosure}
          </p>
        </details>
      </div>

      {primaryAction && (
        <div className="mt-7">
          <CtaButton
            label={primaryAction.label}
            href={primaryAction.href}
            variant={(primaryAction.variant as "primary" | "secondary" | "ghost") ?? "secondary"}
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
