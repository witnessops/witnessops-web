import {
  SHARED_VERIFIER_FLOW_COPY_BLOCKS,
  SHARED_VERIFIER_FLOW_COPY_ORDER,
  SHARED_VERIFIER_FLOW_STEPS,
} from "@/lib/verify-first-verifier-flow";

export function VerifyFirstVerifierFlow() {
  return (
    <section className="mt-10 border border-surface-border bg-surface-bg-alt p-6">
      <h2 className="text-2xl font-semibold text-text-primary">
        Canonical verifier flow
      </h2>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        This sequence is rendered from the shared verifier-flow contract used
        across verify-first surfaces.
      </p>

      <ol className="mt-6 space-y-4">
        {SHARED_VERIFIER_FLOW_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="border border-surface-border/70 bg-surface-card px-4 py-3"
          >
            <h3 className="text-base font-semibold text-text-primary">
              {index + 1}. {step.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>

      {SHARED_VERIFIER_FLOW_COPY_ORDER.map((copyKey) => {
        const block = SHARED_VERIFIER_FLOW_COPY_BLOCKS[copyKey];

        return (
          <section key={copyKey} className="mt-8">
            <h3 className="text-xl font-semibold text-text-primary">
              {block.heading}
            </h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-text-secondary">
              {block.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
