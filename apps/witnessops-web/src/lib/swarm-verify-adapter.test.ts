import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  isSwarmMeshExport,
  verifySwarmMeshExport,
  SWARM_ADAPTER_ID,
} from "./swarm-verify-adapter";

function loadFixture(name: string): Record<string, unknown> {
  const paths = [
    resolve(__dirname, "../../fixtures/verify", name),
    resolve(process.cwd(), "fixtures/verify", name),
  ];
  for (const p of paths) {
    try {
      return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
    } catch {
      /* try next */
    }
  }
  throw new Error(`fixture not found: ${name}`);
}

test("isSwarmMeshExport detects schema tag", () => {
  assert.equal(
    isSwarmMeshExport({ schema: "offsec.swarm.mesh_export.v1", governed: { events: [] } }),
    true,
  );
});

test("verifySwarmMeshExport passes round3 fixture", () => {
  const doc = loadFixture("swarm-mesh-export-round3.json");
  assert.equal(isSwarmMeshExport(doc), true);
  const result = verifySwarmMeshExport(doc);
  assert.equal(result.ok, true);
  assert.equal(result.verdict, "valid");
  assert.equal(result.adapter, SWARM_ADAPTER_ID);
});