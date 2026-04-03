import { SectionShell } from "@/components/shared/section-shell";
import { CodeFrame } from "@/components/shared/code-frame";

interface ProofStripProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  terminal: { language: string; lines: string[] };
}

export function ProofStrip({ id, title, body, terminal }: ProofStripProps) {
  return (
    <SectionShell id={id} className="section-gradient-subtle">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-3xl font-bold text-text-primary md:text-4xl">{title}</h2>
          <p className="text-lg leading-relaxed text-text-secondary">{body}</p>
        </div>
        <div>
          <CodeFrame language={terminal.language} lines={terminal.lines} />
        </div>
      </div>
    </SectionShell>
  );
}
