import type { ContentTrustBoundaryVariant } from "@witnessops/content";

type TrustBoundaryVariant = ContentTrustBoundaryVariant;

type TrustBoundarySnippetProps = {
  variant?: TrustBoundaryVariant;
  className?: string;
};

const COPY: Record<TrustBoundaryVariant, { title: string; body: string[] }> = {
  default: {
    title: "Trust Boundary",
    body: [
      "WitnessOps records governed actions, binds evidence, and enables independent verification.",
      "WitnessOps does not guarantee correctness of execution, completeness of findings, or trustworthiness of the issuer beyond the proof material presented.",
    ],
  },
  legal: {
    title: "Trust Boundary",
    body: [
      "WitnessOps provides integrity and lineage evidence for published artifacts.",
      "Verification confirms integrity of the artifact, not correctness of the underlying action, safety of the target system, or trustworthiness of the issuer.",
    ],
  },
  security: {
    title: "Trust Boundary",
    body: [
      "WitnessOps improves auditability through governed execution, signed receipts, and tamper-evident evidence bindings.",
      "These controls do not eliminate external trust assumptions such as host integrity, tool correctness, or key custody.",
    ],
  },
  verification: {
    title: "Trust Boundary",
    body: [
      "Verification proves integrity of the artifact and consistency of the declared proof material.",
      "It does not, by itself, prove correctness of execution or integrity of the issuer.",
    ],
  },
};

export function TrustBoundarySnippet({
  variant = "default",
  className = "",
}: TrustBoundarySnippetProps) {
  const copy = COPY[variant];

  return (
    <aside className={`callout callout-trust ${className}`.trim()} aria-label="Trust boundary">
      <div className="callout-title">{copy.title}</div>
      {copy.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </aside>
  );
}

export default TrustBoundarySnippet;
