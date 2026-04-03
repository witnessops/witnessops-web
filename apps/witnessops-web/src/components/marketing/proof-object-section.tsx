import { SectionShell } from "@/components/shared/section-shell";
import { CodeFrame } from "@/components/shared/code-frame";

interface ProofObjectSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  code: { language: string; lines: string[] };
}

export function ProofObjectSection({ id, title, body, code }: ProofObjectSectionProps) {
  return (
    <SectionShell id={id}>
      <div>
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="mb-4 text-3xl font-bold text-text-primary">{title}</h2>
          <p className="mb-10 text-lg text-text-secondary">{body}</p>
        </div>
        <div className="mx-auto max-w-2xl">
          <CodeFrame language={code.language} lines={code.lines} title="execution-receipt.json" />
        </div>
      </div>
    </SectionShell>
  );
}
