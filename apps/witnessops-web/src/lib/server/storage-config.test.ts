import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import path from "node:path";

import { readDeliveryRetryRequests } from "./delivery-retry-ledger";
import { readIntakeEvents } from "./intake-event-ledger";
import { writeTokenAudit } from "./token-audit";
import { getAdmissionStoreDir } from "./token-store";

const STORAGE_ENV_KEYS = [
  "NODE_ENV",
  "WITNESSOPS_INTAKE_STORE_DIR",
  "WITNESSOPS_TOKEN_STORE_DIR",
  "WITNESSOPS_INTAKE_EVENT_DIR",
  "WITNESSOPS_TOKEN_AUDIT_DIR",
] as const;

type StorageEnvKey = (typeof STORAGE_ENV_KEYS)[number];

const mutableEnv = process.env as NodeJS.ProcessEnv & { NODE_ENV?: string };
const originalEnv = new Map<StorageEnvKey, string | undefined>(
  STORAGE_ENV_KEYS.map((key) => [key, process.env[key]]),
);

function clearStorageEnv(): void {
  for (const key of STORAGE_ENV_KEYS) {
    delete mutableEnv[key];
  }
}

afterEach(() => {
  for (const key of STORAGE_ENV_KEYS) {
    const originalValue = originalEnv.get(key);
    if (originalValue === undefined) {
      delete mutableEnv[key];
    } else {
      (mutableEnv as Record<string, string | undefined>)[key] = originalValue;
    }
  }
});

test("admission store keeps the local fallback outside production", () => {
  clearStorageEnv();
  mutableEnv.NODE_ENV = "development";

  assert.equal(
    getAdmissionStoreDir(),
    path.join(process.cwd(), ".witnessops-token-store"),
  );
});

test("admission store requires an explicit persistent directory in production", () => {
  clearStorageEnv();
  mutableEnv.NODE_ENV = "production";

  assert.throws(
    () => getAdmissionStoreDir(),
    /Intake store directory requires WITNESSOPS_INTAKE_STORE_DIR or WITNESSOPS_TOKEN_STORE_DIR in production\./,
  );
});

test("admission store accepts the production intake-store directory", () => {
  clearStorageEnv();
  mutableEnv.NODE_ENV = "production";
  mutableEnv.WITNESSOPS_INTAKE_STORE_DIR = "/persistent/witnessops/intake-store";

  assert.equal(
    getAdmissionStoreDir(),
    "/persistent/witnessops/intake-store",
  );
});

test("production ledger paths fail closed when event storage is not configured", async () => {
  clearStorageEnv();
  mutableEnv.NODE_ENV = "production";
  mutableEnv.WITNESSOPS_INTAKE_STORE_DIR = "/persistent/witnessops/intake-store";

  await assert.rejects(
    readIntakeEvents(),
    /Intake event ledger directory requires WITNESSOPS_INTAKE_EVENT_DIR or WITNESSOPS_TOKEN_AUDIT_DIR in production\./,
  );

  await assert.rejects(
    readDeliveryRetryRequests(),
    /Delivery retry ledger directory requires WITNESSOPS_INTAKE_EVENT_DIR or WITNESSOPS_TOKEN_AUDIT_DIR in production\./,
  );

  await assert.rejects(
    writeTokenAudit({
      kind: "issuance",
      issuanceId: "iss_storage_config",
      email: "ops@example.test",
      timestamp: "2026-05-29T00:00:00.000Z",
      payload: {},
    }),
    /Token audit directory requires WITNESSOPS_TOKEN_AUDIT_DIR in production\./,
  );
});
