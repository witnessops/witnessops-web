import { SectionShell } from "@/components/shared/section-shell";

interface PipelineSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  steps: { label: string; value: string }[];
}

export function PipelineSection({ id, title, steps }: PipelineSectionProps) {
  return (
    <SectionShell id={id} className="section-gradient-subtle">
      <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
        {title}
      </h2>

      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-4">
            <div className="card-hover flex flex-col items-center rounded-lg border border-surface-border bg-surface-card px-6 py-4 text-center">
              <span className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/10 text-xs font-bold text-brand-accent">
                {i + 1}
              </span>
              <span className="mb-1 text-xs font-medium tracking-wide text-brand-accent uppercase">
                {step.label}
              </span>
              <span className="text-sm text-text-secondary">{step.value}</span>
            </div>
            {i < steps.length - 1 && (
              <svg className="hidden h-4 w-8 text-brand-accent/40 md:block" fill="none" viewBox="0 0 32 16">
                <path d="M0 8h28m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
