import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { GET, POST } from "./route";
import {
  computeMeshReceiptContentSha256,
  MESH_RECEIPT_PUBLIC_SCHEMA,
} from "@/lib/mesh-gate";
import { JSON_AMBIGUITY_MAX_DEPTH } from "@/lib/json-ambiguity";

afterEach(() => {
  _resetAllStores();
});

function fixtureSample(): string {
  const root = path.resolve(process.cwd(), "fixtures/mesh-gate");
  const alt = path.resolve(process.cwd(), "apps/witnessops-web/fixtures/mesh-gate");
  const dir = fs.existsSync(root) ? root : alt;
  return fs.readFileSync(
    path.join(dir, "mesh-receipt-public-sample.json"),
    "utf8",
  );
}

function rehash(doc: Record<string, unknown>): Record<string, unknown> {
  doc.content_sha256 = computeMeshReceiptContentSha256(doc);
  return doc;
}

async function postDocument(doc: unknown): Promise<Response> {
  return POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    }),
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

test("mesh-gate POST rejects a self-hashed but structurally empty receipt", async () => {
  const doc = rehash({ schema: MESH_RECEIPT_PUBLIC_SCHEMA });
  const response = await postDocument(doc);
  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    ok: boolean;
    verdict: string;
    errors: string[];
  };
  assert.equal(body.ok, false);
  assert.equal(body.verdict, "mesh_gate_invalid");
  assert.ok(body.errors.includes("nodes must be an object"));
  assert.ok(body.errors.includes("child_receipts must be a non-empty array"));
  assert.ok(
    body.errors.includes(
      "source_receipt_sha256 must be a non-empty string",
    ),
  );
});

test("mesh-gate POST requires complete receipt identity and hierarchy", async (t) => {
  const cases: Array<{
    name: string;
    mutate: (doc: Record<string, unknown>) => void;
    error: string;
  }> = [
    {
      name: "engagement identity",
      mutate: (doc) => delete doc.engagement_id,
      error: "engagement_id must be a non-empty string",
    },
    {
      name: "overall gate",
      mutate: (doc) => delete doc.overall_mesh_gate,
      error: "overall_mesh_gate must be a non-empty string",
    },
    {
      name: "nodes",
      mutate: (doc) => delete doc.nodes,
      error: "nodes must be an object",
    },
    {
      name: "child receipts",
      mutate: (doc) => {
        doc.child_receipts = [];
      },
      error: "child_receipts must be a non-empty array",
    },
    {
      name: "source receipt digest",
      mutate: (doc) => delete doc.source_receipt_sha256,
      error: "source_receipt_sha256 must be a non-empty string",
    },
    {
      name: "claim boundary",
      mutate: (doc) => delete doc.boundary,
      error: "boundary must be a non-empty string",
    },
  ];

  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const doc = JSON.parse(fixtureSample()) as Record<string, unknown>;
      entry.mutate(doc);
      rehash(doc);
      const response = await postDocument(doc);
      assert.equal(response.status, 422);
      const body = (await response.json()) as { errors: string[] };
      assert.ok(body.errors.includes(entry.error));
    });
  }
});

test("mesh-gate POST rejects unsupported gate states and claim expansion", async () => {
  const doc = JSON.parse(fixtureSample()) as Record<string, unknown>;
  doc.overall_mesh_gate = "UNVERIFIED";
  doc.public_claim = "customer_security_verified";
  rehash(doc);

  const response = await postDocument(doc);
  assert.equal(response.status, 422);
  const body = (await response.json()) as { errors: string[] };
  assert.ok(body.errors.includes("overall_mesh_gate must be PASS or FAIL"));
  assert.ok(
    body.errors.includes(
      "public_claim must be operator_mesh_hygiene_structure_only",
    ),
  );
});

test("mesh-gate POST validates node and child receipt structure", async () => {
  const doc = JSON.parse(fixtureSample()) as Record<string, unknown>;
  const nodes = doc.nodes as Record<string, Record<string, unknown>>;
  delete nodes.fleet_vm.host;
  const children = doc.child_receipts as Array<Record<string, unknown>>;
  children[0].sha256 = "not-a-digest";
  children[0].path_redacted = "/home/operator/private.json";
  rehash(doc);

  const response = await postDocument(doc);
  assert.equal(response.status, 422);
  const body = (await response.json()) as { errors: string[] };
  assert.ok(body.errors.includes("nodes.fleet_vm.host must be a non-empty string"));
  assert.ok(
    body.errors.includes(
      "child_receipts[0].sha256 must be a lowercase SHA-256 digest",
    ),
  );
  assert.ok(
    body.errors.includes(
      "child_receipts[0].path_redacted must not be an absolute path",
    ),
  );
});

test("mesh-gate POST rejects an internally contradictory PASS receipt", async () => {
  const doc = JSON.parse(fixtureSample()) as Record<string, unknown>;
  const children = doc.child_receipts as Array<Record<string, unknown>>;
  children[0].pass = false;
  rehash(doc);

  const response = await postDocument(doc);
  assert.equal(response.status, 422);
  const body = (await response.json()) as { errors: string[] };
  assert.ok(
    body.errors.includes(
      "overall_mesh_gate PASS requires every child receipt to pass",
    ),
  );
});

test("mesh-gate POST rejects non-object JSON without a server error", async () => {
  const response = await postDocument(null);
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    ok: false,
    verdict: "mesh_gate_invalid",
    schema: "witnessops.mesh_gate_verify.v1",
    scope: "operator-mesh-hygiene-only",
    errors: ["receipt must be a JSON object"],
    warnings: [
      "mesh_gate_valid means redacted receipt structure only; not bastion hunt verify or customer assurance",
    ],
  });
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

test("mesh-gate POST rejects valid but excessively nested JSON as a controlled client error", async () => {
  const depth = JSON_AMBIGUITY_MAX_DEPTH + 1;
  const body = `${'{"nested":'.repeat(depth)}{"value":1,"value":2}${"}".repeat(depth)}`;
  assert.doesNotThrow(() => JSON.parse(body));

  const response = await POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    verdict: "mesh_gate_invalid",
    errors: ["JSON exceeds supported parser limits"],
  });
});

test("mesh-gate POST keeps malformed JSON distinct from the scanner depth limit", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/mesh-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"unterminated":',
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    verdict: "mesh_gate_invalid",
    errors: ["malformed JSON"],
  });
});
