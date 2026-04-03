import fs from "node:fs";
import path from "node:path";
import type { VerifyFixtureDefinition } from "@/lib/verify-contract";

const FILE_FIXTURES = [
  {
    id: "pv-valid",
    label: "Valid PV receipt",
    description:
      "Canonical pass in receipt-only mode using the proof-owned PV fixture.",
    fileName: "pv-valid.json",
    provenance: "proof",
    expected: { kind: "verification", verdict: "valid" },
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
