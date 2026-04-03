import { SectionShell } from "@/components/shared/section-shell";

interface ArtifactSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  tree: {
    root: string;
    entries: string[];
  };
  bullets: string[];
  closing: string;
}

export function ArtifactSection({ id, title, body, tree, bullets, closing }: ArtifactSectionProps) {
  return (
    <SectionShell id={id}>
      <div>
        <h2 className="mb-6 text-3xl font-bold text-text-primary">
          {title}
        </h2>
        <p className="mb-10 text-lg text-text-secondary">
          {body}
        </p>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card p-6">
            <p className="mb-3 font-mono text-sm font-semibold text-brand-accent">{tree.root}</p>
            <div className="space-y-1">
              {tree.entries.map((entry) => (
                <p key={entry} className="font-mono text-sm text-text-secondary">
                  {entry}
                </p>
              ))}
            </div>
          </div>

          <div>
            <ul className="space-y-4">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-text-secondary">
                  <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-brand-accent" />
                  {bullet}
                </li>
              ))}
            </ul>
            {closing && <p className="mt-8 text-text-muted">{closing}</p>}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
