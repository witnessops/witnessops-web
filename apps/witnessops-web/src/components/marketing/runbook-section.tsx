import { SectionShell } from "@/components/shared/section-shell";
import { CodeFrame } from "@/components/shared/code-frame";

interface RunbookSectionProps {
  id?: string;
  title?: string;
  body?: string;
}

export function RunbookSection({
  id = "runbooks",
  title = "Runbook Lifecycle",
  body = "From definition to execution to receipt, every runbook follows an explicit governed path.",
}: RunbookSectionProps) {
  const phases = [
    {
      name: "Define",
      description: "Declare steps, inputs, constraints, and expected outputs in a versioned runbook.",
    },
    {
      name: "Gate",
      description: "Policy gates evaluate constraints before any step executes.",
    },
    {
      name: "Execute",
      description: "Steps run in sequence with declared inputs. Side effects are captured.",
    },
    {
      name: "Receipt",
      description: "A signed receipt records runbook, operator, policy gate, continuity link, and execution binding.",
    },
  ];

  const exampleLines = [
    '{',
    '  "runbook_id": "rb-incident-triage-v3",',
    '  "version": "3.1.0",',
    '  "steps": [',
    '    { "name": "isolate_host", "gate": "policy:containment" },',
    '    { "name": "capture_forensics", "gate": "policy:evidence" },',
    '    { "name": "notify_team", "gate": "policy:comms" }',
    '  ],',
    '  "constraints": {',
    '    "max_duration_seconds": 3600,',
    '    "requires_approval": true',
    '  }',
    '}',
  ];

  return (
    <SectionShell id={id}>
      <h2 className="mb-4 text-3xl font-bold text-text-primary">{title}</h2>
      <p className="mb-12 text-lg text-text-secondary">{body}</p>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="space-y-6">
          {phases.map((phase, i) => (
            <div key={phase.name} className="flex items-start gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-brand-accent/30 text-sm font-bold text-brand-accent">
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 font-semibold text-text-primary">{phase.name}</h3>
                <p className="text-sm text-text-secondary">{phase.description}</p>
              </div>
            </div>
          ))}
        </div>

        <CodeFrame
          language="json"
          lines={exampleLines}
          title="runbook.json"
        />
      </div>
    </SectionShell>
  );
}
