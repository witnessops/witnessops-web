import type { WitnessedCrmSpecimen } from "./specimen";

export type DemoReceipt = ReturnType<typeof createDemoReceipt>;

export function createDemoReceipt(
  specimen: WitnessedCrmSpecimen,
  specimenSha256: string,
  replayConsentAt: string,
) {
  return {
    schema: "witnessops.demo-receipt.v1",
    format: "application/json; charset=utf-8",
    signed: false,
    noNewExecution: true,
    result: specimen.verification.result,
    specimen: {
      id: specimen.specimenId,
      sha256: specimenSha256,
      recordedAt: specimen.recordedAt,
    },
    replayConsent: {
      grantedAt: replayConsentAt,
      scope: "playback-of-recorded-events-only",
      authorizesExecution: false,
      authorizesMutation: false,
    },
    workflow: specimen.workflow,
    engine: specimen.engine,
    task: {
      permittedRecord: specimen.boundary.permittedRecord,
      permittedTransition: specimen.boundary.permittedTransition,
    },
    observed: {
      beforeState: specimen.beforeState,
      events: specimen.events,
      afterState: specimen.afterState,
    },
    verification: specimen.verification,
    limitations: specimen.limitations,
  };
}

export function serializeDemoReceipt(receipt: DemoReceipt): string {
  return `${JSON.stringify(receipt, null, 2)}\n`;
}

export function receiptFilename(replayConsentAt: string, digest: string): string {
  const stamp = replayConsentAt.replaceAll(":", "-").replaceAll(".", "-");
  return `witnessops-demo-receipt-${stamp}_${digest.slice(0, 8)}.json`;
}

export async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
