export type KBSection = "index" | "qin" | "core" | "offsec";

export type KBPageMeta = {
  slug: string;
  system: string;
  section: string;
  sectionId: KBSection;
  title: string;
  subtitle: string;
  breadcrumb: [string, string];
  relatedPages: string[];
};

export const kbPages: KBPageMeta[] = [
  {
    slug: "systems-index",
    system: "VAULTMESH",
    section: "Systems Index",
    sectionId: "index",
    title: "Systems Index",
    subtitle:
      "Unified index of all VaultMesh subsystems — QIN, VaultMesh Core, and OFFSEC — including their purpose, boundaries, and primary documents.",
    breadcrumb: ["VAULTMESH", "Systems Index"],
    relatedPages: ["qin-overview", "core-overview", "offsec-toc", "runner-loop"],
  },
  {
    slug: "offsec-toc",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "index",
    title: "OFFSEC Index",
    subtitle:
      "Local table of contents for the OFFSEC subsystem — all pages, their purpose, and reading order.",
    breadcrumb: ["OFFSEC", "Index"],
    relatedPages: ["offsec-overview", "runner-loop", "systems-index"],
  },
  {
    slug: "qin-overview",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "QIN Overview",
    subtitle:
      "Qin is the live operator spine — the primary AI inference node deployed on Azure West Europe. It functions as the verification orchestrator for all proof generation workloads.",
    breadcrumb: ["QIN", "Overview"],
    relatedPages: ["qin-trust-ladder", "qin-operator-oath", "qin-layers"],
  },
  {
    slug: "qin-trust-ladder",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "Trust Promotion Ladder",
    subtitle:
      "The five-layer trust architecture that governs how proof claims are promoted from raw operator input to public-grade verified output.",
    breadcrumb: ["QIN", "Trust Promotion Ladder"],
    relatedPages: ["qin-overview", "core-proof-bundle", "offsec-evidence"],
  },
  {
    slug: "qin-operator-oath",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "Operator Oath",
    subtitle:
      "The binding declaration that every operator accepts before issuing instructions through Qin. Not symbolic — operationally enforced.",
    breadcrumb: ["QIN", "Operator Oath"],
    relatedPages: ["qin-trust-ladder", "offsec-governance"],
  },
  {
    slug: "qin-layers",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "Layer Reference",
    subtitle: "Technical reference for each layer in the QIN operator stack.",
    breadcrumb: ["QIN", "Layer Reference"],
    relatedPages: ["qin-trust-ladder", "core-proof-bundle"],
  },
  {
    slug: "qin-deployment",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "Deployment",
    subtitle:
      "Infrastructure and runtime configuration for the Qin operator spine.",
    breadcrumb: ["QIN", "Deployment"],
    relatedPages: ["offsec-receipt-spec", "core-lawchain"],
  },
  {
    slug: "qin-architecture",
    system: "QIN",
    section: "QIN / Operator Layers",
    sectionId: "qin",
    title: "Architecture Diagram",
    subtitle:
      "Full operator flow from human intent to verified state change. QIN as admission controller and proof router — not executor.",
    breadcrumb: ["QIN", "Architecture Diagram"],
    relatedPages: [
      "qin-overview",
      "qin-trust-ladder",
      "qin-layers",
      "runner-loop",
    ],
  },
  {
    slug: "core-overview",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "Architecture",
    subtitle:
      "VaultMesh is proof-first governance infrastructure — not software, not a platform. A self-verifying continuum of law, economy, memory, and machine reason.",
    breadcrumb: ["CORE", "Architecture"],
    relatedPages: ["core-proof-bundle", "core-organs", "core-invariants"],
  },
  {
    slug: "core-proof-bundle",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "Proof Bundle (VPB)",
    subtitle:
      "The VaultMesh Proof Bundle is the atomic unit of verified output. Everything that exits the system is a VPB or nothing.",
    breadcrumb: ["CORE", "Proof Bundle"],
    relatedPages: ["core-lawchain", "qin-trust-ladder", "offsec-receipt-spec"],
  },
  {
    slug: "core-lawchain",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "LAWCHAIN Protocol",
    subtitle:
      "The cryptographic anchoring layer. LAWCHAIN makes proof immutable — not by preventing modification, but by making modification structurally visible.",
    breadcrumb: ["CORE", "LAWCHAIN Protocol"],
    relatedPages: ["core-proof-bundle", "offsec-receipt-spec", "core-regulatory"],
  },
  {
    slug: "core-organs",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "Six Organs",
    subtitle:
      "The six functional systems that constitute VaultMesh as a living infrastructure organism.",
    breadcrumb: ["CORE", "Six Organs"],
    relatedPages: ["core-overview", "core-invariants"],
  },
  {
    slug: "core-invariants",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "Engineer Invariants",
    subtitle:
      "The non-negotiable behavioral constraints that govern every VaultMesh engineer and operator. These are executable, not aspirational.",
    breadcrumb: ["CORE", "Engineer Invariants"],
    relatedPages: ["qin-operator-oath", "core-overview"],
  },
  {
    slug: "core-regulatory",
    system: "CORE",
    section: "VaultMesh Core",
    sectionId: "core",
    title: "Regulatory Layer",
    subtitle:
      "How VaultMesh maps to EU regulatory forcing functions. The regulations are not constraints — they are the commercial engine.",
    breadcrumb: ["CORE", "Regulatory Layer"],
    relatedPages: ["core-lawchain", "core-proof-bundle"],
  },
  {
    slug: "offsec-overview",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Platform Overview",
    subtitle:
      "OFFSEC is a runbook-driven offensive security operations framework. Its primary output is cryptographic receipts — proof that security work was performed, scoped, and evidenced correctly.",
    breadcrumb: ["OFFSEC", "Platform Overview"],
    relatedPages: ["offsec-operations", "offsec-evidence", "offsec-governance"],
  },
  {
    slug: "offsec-operations",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Operations",
    subtitle:
      "How security work is structured, executed, and closed in OFFSEC. Every operation follows the same spine.",
    breadcrumb: ["OFFSEC", "Operations"],
    relatedPages: ["offsec-evidence", "offsec-governance", "offsec-runbooks"],
  },
  {
    slug: "offsec-evidence",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Evidence",
    subtitle:
      "Receipt and execution evidence produced by OFFSEC operations. Evidence is what allows another person to verify your work without your presence.",
    breadcrumb: ["OFFSEC", "Evidence"],
    relatedPages: ["offsec-receipt-spec", "offsec-governance"],
  },
  {
    slug: "offsec-governance",
    system: "OFFSEC",
    section: "OFFSEC / Governance",
    sectionId: "offsec",
    title: "Governance",
    subtitle:
      "Governance defines the authorization, escalation, scope enforcement, and regulatory alignment rules that govern all OFFSEC operations. This layer ensures operational actions map to promotable, regulation-aligned proof.",
    breadcrumb: ["OFFSEC", "Governance"],
    relatedPages: [
      "offsec-evidence",
      "offsec-runbooks",
      "core-regulatory",
      "core-proof-bundle",
    ],
  },
  {
    slug: "offsec-runbooks",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Runbooks",
    subtitle:
      "Structured execution paths for common OFFSEC operation types. Use a runbook before inventing a process.",
    breadcrumb: ["OFFSEC", "Runbooks"],
    relatedPages: ["offsec-operations", "offsec-evidence", "offsec-receipt-spec"],
  },
  {
    slug: "offsec-receipt-spec",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Receipt Spec",
    subtitle:
      "The technical specification for OFFSEC operation receipts. All receipts must conform to this spec to be valid for promotion.",
    breadcrumb: ["OFFSEC", "Receipt Spec"],
    relatedPages: ["core-lawchain", "offsec-evidence", "qin-trust-ladder"],
  },
  {
    slug: "runner-loop",
    system: "OFFSEC",
    section: "OFFSEC",
    sectionId: "offsec",
    title: "Full Runner Loop",
    subtitle:
      "The complete lifecycle of an operator instruction — from raw intent to anchored, promotable proof. QIN \u2192 PV \u2192 WV \u2192 QV \u2192 PUB \u2192 Return.",
    breadcrumb: ["OFFSEC", "Full Runner Loop"],
    relatedPages: [
      "qin-trust-ladder",
      "core-proof-bundle",
      "offsec-receipt-spec",
      "core-lawchain",
    ],
  },
  {
    slug: "evidence-guardrails",
    system: "OFFSEC",
    section: "OFFSEC / Evidence",
    sectionId: "offsec",
    title: "Evidence Mapping Guardrails",
    subtitle:
      "Reusable trust boundary declaration for all evidence-mapping pages. This is a template — not a compliance claim.",
    breadcrumb: ["OFFSEC", "Evidence Mapping Guardrails"],
    relatedPages: [
      "offsec-evidence",
      "offsec-governance",
      "core-regulatory",
      "offsec-receipt-spec",
    ],
  },
];

export function getKBPage(slug: string): KBPageMeta | undefined {
  return kbPages.find((p) => p.slug === slug);
}

export function getKBPagesBySection(sectionId: KBSection): KBPageMeta[] {
  return kbPages.filter((p) => p.sectionId === sectionId);
}
