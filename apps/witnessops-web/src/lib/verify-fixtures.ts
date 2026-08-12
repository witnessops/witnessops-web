import fs from "node:fs";
import path from "node:path";
import type { VerifyFixtureDefinition } from "@/lib/verify-contract";

const FILE_FIXTURES = [
  {
    id: "pv-valid",
    label: "Valid PV receipt",
    description:
      "Canonical receipt-only validation using the proof-owned PV fixture; the verdict remains indeterminate because artifact bytes are not revalidated.",
    fileName: "pv-valid.json",
    provenance: "proof",
    expected: { kind: "verification", verdict: "indeterminate" },
  },
  {
    id: "qv-bad-imprint",
    label: "Invalid QV receipt",
    description:
      "Canonical failing receipt where the RFC-3161 imprint does not match the declared digest.",
    fileName: "qv-bad-imprint.json",
    provenance: "proof",
    expected: { kind: "verification", verdict: "invalid" },
  },
  {
    id: "local-server-audit-valid",
    label: "Local server audit receipt (structural)",
    description:
      "Primary witnessops.local_server_audit.receipt.v1 JSON fixture for /api/verify structural checks; does not revalidate artifact bytes.",
    fileName: "local-server-audit-valid.json",
    provenance: "app",
    expected: { kind: "verification", verdict: "valid" },
  },
  {
    id: "local-server-audit-bad-binding",
    label: "Local server audit receipt (bad authority binding)",
    description:
      "Local server audit receipt where authority_hash disagrees with artifacts[].",
    fileName: "local-server-audit-bad-binding.json",
    provenance: "app",
    expected: { kind: "verification", verdict: "invalid" },
  },
  {
    id: "offsec-shield-valid",
    label: "Legacy local server audit receipt (dual-read)",
    description:
      "Legacy offsecshield.receipt.v1 fixture still accepted by dual-read structural verify; not a buyer-facing product title.",
    fileName: "offsec-shield-valid.json",
    provenance: "app",
    expected: { kind: "verification", verdict: "valid" },
  },
  {
    id: "offsec-shield-bad-binding",
    label: "Legacy local server audit receipt (bad binding)",
    description:
      "Legacy dual-read fixture where authority_hash disagrees with artifacts[].",
    fileName: "offsec-shield-bad-binding.json",
    provenance: "app",
    expected: { kind: "verification", verdict: "invalid" },
  },
  {
    id: "swarm-mesh-export-round3",
    label: "Swarm mesh export (round 3 trust+revoke)",
    description:
      "offsec.swarm.mesh_export.v1 DEV export; R3 structural adapter (not PV/QV/WV).",
    fileName: "swarm-mesh-export-round3.json",
    provenance: "app",
    expected: { kind: "verification", verdict: "valid" },
  },
  {
    id: "unsupported-stage",
    label: "Unsupported receipt stage",
    description:
      "Valid JSON shaped like a receipt but outside the supported PV/QV/WV v1 scope.",
    fileName: "unsupported-stage.json",
    provenance: "app",
    expected: {
      kind: "failure",
      failureClass: "FAILURE_INPUT_UNSUPPORTED",
    },
  },
] as const satisfies ReadonlyArray<
  Omit<VerifyFixtureDefinition, "receiptInput"> & { fileName: string }
>;

const INLINE_FIXTURES = [
  {
    id: "malformed-json",
    label: "Malformed JSON",
    description:
      "Deliberately broken JSON to confirm malformed requests fail closed.",
    receiptInput: '{"proof_stage":"PV",',
    provenance: "app",
    expected: {
      kind: "failure",
      failureClass: "FAILURE_INPUT_MALFORMED",
    },
  },
] as const satisfies ReadonlyArray<VerifyFixtureDefinition>;

function resolveFixtureRoot(): string {
  const localRoot = path.resolve(process.cwd(), "fixtures/verify");
  if (fs.existsSync(localRoot)) {
    return localRoot;
  }

  return path.resolve(process.cwd(), "apps/witnessops-web/fixtures/verify");
}

function readFixtureText(fileName: string): string {
  return fs.readFileSync(path.join(resolveFixtureRoot(), fileName), "utf8");
}

export function listVerifyFixtures(): VerifyFixtureDefinition[] {
  return [
    ...FILE_FIXTURES.map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      description: fixture.description,
      receiptInput: readFixtureText(fixture.fileName),
      provenance: fixture.provenance,
      expected: fixture.expected,
    })),
    ...INLINE_FIXTURES,
  ];
}

export function loadVerifyFixture(id: string): VerifyFixtureDefinition | null {
  return listVerifyFixtures().find((fixture) => fixture.id === id) ?? null;
}
