import { SectionShell } from "@/components/shared/section-shell";

interface UseCasesProps {
  id?: string;
  title?: string;
}

export function UseCases({
  id = "use-cases",
  title = "Built for Operational Certainty",
}: UseCasesProps) {
  const cases = [
    {
      title: "Incident Response",
      description:
        "Triage, containment, and recovery runbooks with policy-gated steps and full receipt trails for post-incident review.",
      tags: ["containment", "forensics", "comms"],
    },
    {
      title: "Red Team Operations",
      description:
        "Scoped engagement runbooks with approval gates, evidence capture, and chain-of-custody receipts.",
      tags: ["scope-control", "evidence", "debrief"],
    },
    {
      title: "Infrastructure Automation",
      description:
        "Provisioning and change management runbooks with policy constraints and rollback receipts.",
      tags: ["provisioning", "change-mgmt", "rollback"],
    },
    {
      title: "Compliance Workflows",
      description:
        "Audit-ready execution chains with signed receipts recording policy adherence at each governed step.",
      tags: ["audit-trail", "policy-record", "reporting"],
    },
  ];

  return (
    <SectionShell id={id}>
      <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">{title}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {cases.map((uc) => (
          <div
            key={uc.title}
            className="group card-hover rounded-lg border border-surface-border bg-surface-card p-6"
          >
            <h3 className="mb-2 text-lg font-semibold text-text-primary group-hover:text-brand-accent">{uc.title}</h3>
            <p className="mb-4 text-sm text-text-secondary">{uc.description}</p>
            <div className="flex flex-wrap gap-2">
              {uc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-brand-accent/20 bg-brand-accent/5 px-2.5 py-0.5 font-mono text-xs text-brand-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
