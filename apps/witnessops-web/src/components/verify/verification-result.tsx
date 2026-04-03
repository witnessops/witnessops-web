import type { VerifyResponse } from "@/lib/verify-contract";

const VERDICT_TONE: Record<
  "valid" | "invalid" | "indeterminate",
  { badge: string; panel: string; title: string }
> = {
  valid: {
    badge: "border-signal-green/30 bg-signal-green/10 text-signal-green",
    panel: "border-signal-green/20 bg-signal-green/5",
    title: "Receipt verified",
  },
  invalid: {
    badge: "border-signal-red/30 bg-signal-red/10 text-signal-red",
    panel: "border-signal-red/20 bg-signal-red/5",
    title: "Verification failed",
  },
  indeterminate: {
    badge: "border-signal-amber/30 bg-signal-amber/10 text-signal-amber",
    panel: "border-signal-amber/20 bg-signal-amber/5",
    title: "Verification incomplete",
  },
};

const CHECK_TONE: Record<
  "verified" | "unverified" | "not_applicable",
  string
> = {
  verified: "border-signal-green/20 bg-signal-green/5 text-signal-green",
  unverified: "border-signal-red/20 bg-signal-red/5 text-signal-red",
  not_applicable: "border-surface-border bg-surface-bg text-text-muted",
};

interface VerificationResultProps {
  response: VerifyResponse;
}

export function VerificationResult({ response }: VerificationResultProps) {
  if (!response.ok) {
    return (
      <section className="border border-signal-red/20 bg-signal-red/5 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-signal-red">
          Input rejected
        </div>
        <h3 className="text-xl font-semibold text-text-primary">
          {response.failureClass}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          {response.message}
        </p>
      </section>
    );
  }

  const tone = VERDICT_TONE[response.verdict];

  return (
    <section className={`border p-5 ${tone.panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div
            className={`inline-flex items-center border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone.badge}`}
          >
            {response.verdict}
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-text-primary">
            {tone.title}
          </h3>
          <p className="mt-2 max-w-[52rem] text-sm leading-relaxed text-text-secondary">
            {response.summary}
          </p>
        </div>

        <div className="grid gap-px border border-surface-border bg-surface-border text-[11px] font-mono uppercase tracking-[0.08em]">
          <div className="grid grid-cols-2 gap-px bg-surface-border">
            <span className="bg-surface-bg px-3 py-2 text-text-muted">Claimed</span>
            <span className="bg-surface-bg px-3 py-2 text-text-primary">{response.proofStageClaimed}</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-surface-border">
            <span className="bg-surface-bg px-3 py-2 text-text-muted">Verified</span>
            <span className="bg-surface-bg px-3 py-2 text-text-primary">{response.proofStageVerified}</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-surface-border">
            <span className="bg-surface-bg px-3 py-2 text-text-muted">Scope</span>
            <span className="bg-surface-bg px-3 py-2 text-text-primary">{response.scope}</span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-surface-border">
            <span className="bg-surface-bg px-3 py-2 text-text-muted">Revalidation</span>
            <span className="bg-surface-bg px-3 py-2 text-text-primary">
              {response.artifactRevalidation.replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {response.breaches.length > 0 ? (
        <div className="mt-6 border border-surface-border bg-surface-bg p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Breaches
          </div>
          <div className="space-y-3">
            {response.breaches.map((breach) => (
              <div key={`${breach.code}:${breach.checkName}`} className="border-l-2 border-signal-red pl-3">
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-signal-red">
                  {breach.code}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                  {breach.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          Checks
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {response.checks.map((check) => (
            <div key={check.name} className="border border-surface-border bg-surface-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-[0.08em] text-text-primary">
                    {check.name}
                  </h4>
                  {check.detail ? (
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {check.detail}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex shrink-0 items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${CHECK_TONE[check.status]}`}
                >
                  {check.status.replaceAll("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default VerificationResult;
