import { SectionShell } from "@/components/shared/section-shell";

interface BoundaryItem {
  title: string;
  body: string;
}

interface BoundarySectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  lede: string;
  items: BoundaryItem[];
  closing: string;
}

export function BoundarySection({ id, title, lede, items, closing }: BoundarySectionProps) {
  return (
    <div className="border-t border-surface-border border-b">
      <SectionShell id={id} spacing="compact" className="bg-surface-bg-alt">
        <p className="kb-section-tag mb-4">WHERE TRUST ASSUMPTIONS REMAIN</p>
        <h2 className="mb-4 max-w-[36ch] text-2xl font-semibold leading-[1.2] tracking-[-0.005em] text-text-primary md:text-3xl">
          {title}
        </h2>
        <p className="mb-5 max-w-[56ch] text-lg leading-7 text-text-secondary">{lede}</p>

        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <li
              key={item.title}
              className="group kb-hover-row kb-hover-row--rail-top kb-hover-card border border-surface-border bg-surface-card"
            >
              <header className="border-b border-surface-border px-4 py-3 sm:px-5 transition-colors duration-200 group-hover:border-surface-border-hover">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-trust transition-colors duration-200 group-hover:text-brand-accent">
                  ASSUMPTION
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {item.title}
                </p>
              </header>
              <p className="px-4 py-3 text-[13px] leading-[1.6] text-text-secondary sm:px-5 sm:py-4">
                {item.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-5 border-t border-surface-border pt-4">
          <p className="max-w-[55ch] text-base leading-[1.6] text-text-primary">{closing}</p>
        </div>
        {/* No CTA by design — §4 boundary section must not be interrupted by a sell */}
      </SectionShell>
    </div>
  );
}
