import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { GET, POST } from "./route";

function fixtureSample(): string {
  const root = path.resolve(process.cwd(), "fixtures/mesh-gate");
  const alt = path.resolve(process.cwd(), "apps/witnessops-web/fixtures/mesh-gate");
  const dir = fs.existsSync(root) ? root : alt;
  return fs.readFileSync(
    path.join(dir, "mesh-receipt-public-sample.json"),
    "utf8",
  );
}

test("mesh-gate GET returns discovery", async () => {
  const response = await GET();
  assert.equal(response.status, 200);
  const body = (await response.json()) as { schema: string; scope: string };
  assert.equal(body.schema, "witnessops.mesh_gate_discovery.v1");
  assert.equal(body.scope, "operator-mesh-hygiene-only");
});

test("mesh-gate POST validates published public sample", async () => {
  const sample = fixtureSample();
  const response = await POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: sample,
    }),
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { ok: boolean; verdict: string };
  assert.equal(body.ok, true);
  assert.equal(body.verdict, "mesh_gate_valid");
});

test("mesh-gate POST rejects tampered content_sha256", async () => {
  const doc = JSON.parse(fixtureSample()) as Record<string, unknown>;
  doc.content_sha256 = "0".repeat(64);
  const response = await POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    }),
  );
  assert.equal(response.status, 422);
  const body = (await response.json()) as { ok: boolean; verdict: string };
  assert.equal(body.ok, false);
  assert.equal(body.verdict, "mesh_gate_invalid");
});

test("mesh-gate POST rejects invalid UTF-8 as a controlled client error", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: new Uint8Array([0xc3, 0x28]),
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    verdict: "mesh_gate_invalid",
    errors: ["body must be valid UTF-8"],
  });
});
