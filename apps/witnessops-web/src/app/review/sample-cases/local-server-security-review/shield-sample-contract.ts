import fs from "node:fs";
import path from "node:path";

export const shieldSampleId = "offsec-shield-local-server-audit";
export const shieldSampleBasePath = `/samples/${shieldSampleId}`;

export type ShieldSampleManifest = {
  schema: string;
  sample_id: string;
  run_id?: string;
  receipt_id?: string;
  module?: string;
  entries: Array<{ file: string; sha256: string }>;
};

function resolveSampleRoot(): string {
  const candidates = [
    path.resolve(process.cwd(), "public/samples", shieldSampleId),
    path.resolve(process.cwd(), "apps/witnessops-web/public/samples", shieldSampleId),
  ];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "SAMPLE-MANIFEST.json"))) return root;
  }
  return candidates[0];
}

export function loadShieldSampleManifest(): ShieldSampleManifest | null {
  const root = resolveSampleRoot();
  const file = path.join(root, "SAMPLE-MANIFEST.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as ShieldSampleManifest;
}

export function shieldSampleHref(relativePath: string): string {
  return `${shieldSampleBasePath}/${relativePath}`;
}

export const shieldDisplayedArtifacts = [
  "RECEIPT.json",
  "evidence_manifest.json",
  "MANIFEST.sha256",
  "evidence/posture.json",
  "evidence/findings.json",
  "evidence/authority.json",
  "evidence/scope.json",
  "VERIFY_NOTE.json",
  "README.md",
] as const;

export function shieldArtifactDigest(
  manifest: ShieldSampleManifest,
  file: string,
): string | null {
  const entry = manifest.entries.find((e) => e.file === file);
  return entry?.sha256 ?? null;
}