import "server-only";

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type SkillCategory =
  | "verifier"
  | "receipts"
  | "evidence"
  | "governance"
  | "recon"
  | "handover"
  | "hygiene";

export type SkillVersion = "1.0.0" | "1.0.1";

type SkillConformanceLinks = {
  contractHref: string;
  receiptHref: string;
  verifierHref: string;
};

type SkillDefinition = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: SkillCategory;
  version?: SkillVersion;
  publishedAt?: "2026-08-27" | "2026-08-28";
  reviewedAt?: "2026-08-27" | "2026-08-28";
  featured?: boolean;
  conformance?: SkillConformanceLinks;
  related: string[];
};

export type PublicSkill = SkillDefinition & {
  name: string;
  version: SkillVersion;
  lifecycle: "maintained" | "reference";
  license: "Apache-2.0";
  sourceRepository: "witnessops/witnessops-web";
  sourcePath: string;
  publishedAt: "2026-08-27" | "2026-08-28";
  reviewedAt: "2026-08-27" | "2026-08-28";
  sha256: string;
  byteLength: number;
};

type SkillReleaseDefinition = {
  version: SkillVersion;
  publishedAt: "2026-08-27" | "2026-08-28";
  reviewedAt: "2026-08-27" | "2026-08-28";
  sourcePath: string;
};

const DEFINITIONS: readonly SkillDefinition[] = [
  {
    slug: "governed-agent-verifier",
    title: "Governed agent verifier",
    tagline: "Check a SKILL.md before an agent loads it.",
    description: "Local, deterministic policy scan for agent skills. A pass is not a safety proof.",
    category: "verifier",
    version: "1.0.1",
    publishedAt: "2026-08-28",
    reviewedAt: "2026-08-28",
    featured: true,
    conformance: {
      contractHref:
        "/samples/governed-agent-verifier-conformance/v1/CONTRACT.json",
      receiptHref:
        "/samples/governed-agent-verifier-conformance/v1/RECEIPT.json",
      verifierHref:
        "/samples/governed-agent-verifier-conformance/v1/verify.mjs",
    },
    related: ["claim-boundary-copy", "mcp-tool-hygiene", "receipt-first-verifier"],
  },
  {
    slug: "receipt-first-verifier",
    title: "Receipt-first verifier",
    tagline: "Verify a WitnessOps receipt without inventing evidence.",
    description: "Receipt-scoped checks only. Incomplete when evidence or trust inputs were not independently checked.",
    category: "receipts",
    related: ["governed-agent-verifier", "claim-boundary-copy", "proof-run-handover"],
  },
  {
    slug: "claim-boundary-copy",
    title: "Claim boundary copy",
    tagline: "Write what a result does — and does not — establish.",
    description: "Keeps public copy inside WitnessOps doctrine: no pentest, certification, or security-proof claims.",
    category: "governance",
    related: ["governed-agent-verifier", "receipt-first-verifier", "sample-case-authoring"],
  },
  {
    slug: "governed-recon",
    title: "Governed recon",
    tagline: "Passive-only exposure assessment. No exploitation.",
    description: "Public-facing recon with a hard passive-only contract. Stops when the next step would touch the target.",
    category: "recon",
    related: ["evidence-capture-and-chain", "claim-boundary-copy", "proof-run-handover"],
  },
  {
    slug: "evidence-capture-and-chain",
    title: "Evidence capture and chain",
    tagline: "Keep findings tied to paths, hashes, and notes.",
    description: "Normalize artifacts, notes, and manifests so a handover stays reviewable.",
    category: "evidence",
    related: ["proof-run-handover", "offboarding-evidence", "sample-case-authoring"],
  },
  {
    slug: "proof-run-handover",
    title: "Proof-run handover",
    tagline: "Package what ran, what did not, and what the buyer can check.",
    description: "Turns a bounded run into a reviewable package: scope, evidence references, and limits.",
    category: "handover",
    related: ["receipt-first-verifier", "evidence-capture-and-chain", "claim-boundary-copy"],
  },
  {
    slug: "key-custody-hygiene",
    title: "Key custody hygiene",
    tagline: "Talk about keys without moving them.",
    description: "Rotation records, verifier keys, and custody metadata — never secret material.",
    category: "hygiene",
    related: ["receipt-first-verifier", "claim-boundary-copy"],
  },
  {
    slug: "decision-fabric-validator",
    title: "Decision fabric validator",
    tagline: "Schema-first checks on workflow classes and decision runs.",
    description: "Validate decision runs against the declared workflow class. Negative fixtures stay negative.",
    category: "governance",
    related: ["governed-agent-verifier", "claim-boundary-copy"],
  },
  {
    slug: "mcp-tool-hygiene",
    title: "MCP tool hygiene",
    tagline: "Bound MCP tools the way you bound skills.",
    description: "Allowlists, no chain-loading of remote tools, and no silent expansion of scope.",
    category: "hygiene",
    related: ["governed-agent-verifier", "governed-recon"],
  },
  {
    slug: "offboarding-evidence",
    title: "Offboarding evidence",
    tagline: "Access-removed proof as a specimen, not a story.",
    description: "Deterministic evaluation of offboarding evidence: raw inputs, hashes, and a human-readable report.",
    category: "evidence",
    related: ["evidence-capture-and-chain", "proof-run-handover", "key-custody-hygiene"],
  },
  {
    slug: "sample-case-authoring",
    title: "Sample case authoring",
    tagline: "Labelled samples with inspectable limits.",
    description: "Public sample cases stay synthetic, bounded, and honest about what they are not.",
    category: "handover",
    related: ["claim-boundary-copy", "proof-run-handover", "receipt-first-verifier"],
  },
] as const;

const HISTORICAL_RELEASES: Partial<
  Record<string, readonly SkillReleaseDefinition[]>
> = {
  "governed-agent-verifier": [
    {
      version: "1.0.0",
      publishedAt: "2026-08-27",
      reviewedAt: "2026-08-27",
      sourcePath:
        "apps/witnessops-web/public/samples/governed-agent-verifier-conformance/v1/governed-agent-verifier-v1.0.0-SKILL.md",
    },
  ],
};

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  verifier: "Verifier",
  receipts: "Receipts",
  evidence: "Evidence",
  governance: "Governance",
  recon: "Recon",
  handover: "Handover",
  hygiene: "Hygiene",
};

function repositoryRoot(): string {
  const candidates = [
    resolve(process.cwd(), "../.."),
    process.cwd(),
  ];
  const root = candidates.find((candidate) =>
    existsSync(resolve(candidate, "content/witnessops/skills")),
  );
  if (!root) throw new Error("WitnessOps repository root is unavailable.");
  return root;
}

function definition(slug: string): SkillDefinition | undefined {
  return DEFINITIONS.find((candidate) => candidate.slug === slug);
}

function currentRelease(item: SkillDefinition): SkillReleaseDefinition {
  return {
    version: item.version ?? "1.0.0",
    publishedAt: item.publishedAt ?? "2026-08-27",
    reviewedAt: item.reviewedAt ?? "2026-08-27",
    sourcePath: `content/witnessops/skills/${item.slug}/SKILL.md`,
  };
}

function releaseFor(
  item: SkillDefinition,
  version?: string,
): SkillReleaseDefinition | undefined {
  const current = currentRelease(item);
  if (!version || version === current.version) return current;
  return HISTORICAL_RELEASES[item.slug]?.find(
    (candidate) => candidate.version === version,
  );
}

export function readSkillBytes(slug: string, version?: string): Buffer {
  const item = definition(slug);
  if (!item) throw new Error(`Unknown public skill: ${slug}`);
  const release = releaseFor(item, version);
  if (!release) throw new Error(`Unknown public skill version: ${slug}@${version}`);
  return readFileSync(resolve(repositoryRoot(), release.sourcePath));
}

export function readSkillMarkdown(slug: string, version?: string): string {
  return readSkillBytes(slug, version).toString("utf8");
}

function materialize(
  item: SkillDefinition,
  release = currentRelease(item),
): PublicSkill {
  const bytes = readSkillBytes(item.slug, release.version);
  return {
    ...item,
    name: item.slug,
    version: release.version,
    lifecycle: item.featured ? "maintained" : "reference",
    license: "Apache-2.0",
    sourceRepository: "witnessops/witnessops-web",
    sourcePath: release.sourcePath,
    publishedAt: release.publishedAt,
    reviewedAt: release.reviewedAt,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.byteLength,
  };
}

export function listSkills(): PublicSkill[] {
  return DEFINITIONS.map((item) => materialize(item));
}

export function getSkill(slug: string): PublicSkill | undefined {
  const item = definition(slug);
  return item ? materialize(item) : undefined;
}

export function getSkillVersion(
  slug: string,
  version: string,
): PublicSkill | undefined {
  const item = definition(slug);
  if (!item) return undefined;
  const release = releaseFor(item, version);
  return release ? materialize(item, release) : undefined;
}

export function listSkillVersions(slug: string): PublicSkill[] {
  const item = definition(slug);
  if (!item) return [];
  return [
    materialize(item),
    ...(HISTORICAL_RELEASES[item.slug] ?? []).map((release) =>
      materialize(item, release),
    ),
  ];
}

export function relatedSkills(skill: PublicSkill): PublicSkill[] {
  return skill.related.flatMap((slug) => {
    const item = getSkill(slug);
    return item ? [item] : [];
  });
}

export function categoryLabel(category: SkillCategory): string {
  return CATEGORY_LABELS[category];
}

export const PUBLIC_SKILL_COUNT = DEFINITIONS.length;
