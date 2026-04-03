import { SectionShell } from "@/components/shared/section-shell";

interface OperatorSectionProps {
  id?: string;
  title?: string;
  body?: string;
}

export function OperatorSection({
  id = "operators",
  title = "Operator Surfaces",
  body = "Current operator entry points are small, script-based, and aligned to the governed run lifecycle.",
}: OperatorSectionProps) {
  const surfaces = [
    {
      name: "Engagement Setup",
      description: "Create a governed workspace before any run starts. Scope enforcement depends on the declared engagement files.",
      commands: ["bash automation/helpers/new-engagement.sh <engagement-name>"],
    },
    {
      name: "Governed Run",
      description: "Execute a runbook against a target, then inspect state while the run progresses through scope and approval gates.",
      commands: [
        "bash automation/helpers/runbook-exec.sh <runbook-id> --target <target> --engagement <engagement-name>",
        "bash automation/helpers/runbook-state.sh <engagement-name> <run-id>",
      ],
    },
    {
      name: "Approval & Resume",
      description: "Record approval for a gated step, then resume the paused run from the next incomplete stage.",
      commands: [
        "bash automation/helpers/runbook-approve.sh <engagement-name> <run-id> --approve",
        "bash automation/helpers/runbook-resume.sh <engagement-name> <run-id>",
      ],
    },
  ];

  return (
    <SectionShell id={id}>
      <div className="mx-auto mb-12 max-w-[720px] text-center">
        <h2 className="mb-4 text-3xl font-bold text-text-primary">{title}</h2>
        <p className="text-lg text-text-secondary">{body}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {surfaces.map((surface) => (
          <div
            key={surface.name}
            className="card-hover rounded-lg border border-surface-border bg-surface-card p-6"
          >
            <h3 className="mb-2 text-lg font-semibold text-text-primary">{surface.name}</h3>
            <p className="mb-4 text-sm text-text-secondary">{surface.description}</p>
            <div className="space-y-1 rounded bg-surface-bg p-3">
              {surface.commands.map((cmd) => (
                <p key={cmd} className="font-mono text-xs text-text-muted">
                  {cmd}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
