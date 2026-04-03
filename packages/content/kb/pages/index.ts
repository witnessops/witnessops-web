import type { ComponentType } from "react";

const pageComponents: Record<string, () => Promise<{ default: ComponentType }>> = {
  "systems-index": () => import("./systems-index"),
  "offsec-toc": () => import("./offsec-toc"),
  "qin-overview": () => import("./qin-overview"),
  "qin-trust-ladder": () => import("./qin-trust-ladder"),
  "qin-operator-oath": () => import("./qin-operator-oath"),
  "qin-layers": () => import("./qin-layers"),
  "qin-deployment": () => import("./qin-deployment"),
  "qin-architecture": () => import("./qin-architecture"),
  "core-overview": () => import("./core-overview"),
  "core-proof-bundle": () => import("./core-proof-bundle"),
  "core-lawchain": () => import("./core-lawchain"),
  "core-organs": () => import("./core-organs"),
  "core-invariants": () => import("./core-invariants"),
  "core-regulatory": () => import("./core-regulatory"),
  "offsec-overview": () => import("./offsec-overview"),
  "offsec-operations": () => import("./offsec-operations"),
  "offsec-evidence": () => import("./offsec-evidence"),
  "offsec-governance": () => import("./offsec-governance"),
  "offsec-runbooks": () => import("./offsec-runbooks"),
  "offsec-receipt-spec": () => import("./offsec-receipt-spec"),
  "runner-loop": () => import("./runner-loop"),
  "evidence-guardrails": () => import("./evidence-guardrails"),
};

export async function getKBPageComponent(slug: string): Promise<ComponentType | null> {
  const loader = pageComponents[slug];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

export { pageComponents };
