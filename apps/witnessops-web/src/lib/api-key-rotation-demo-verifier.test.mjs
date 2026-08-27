import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { verifyBundle } from "../../public/samples/api-key-rotation/v1/verify.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.resolve(
  HERE,
  "../../public/samples/api-key-rotation/v1",
);
const BUNDLE_PATH = path.join(SAMPLE_DIR, "BUNDLE.wops.json");
const LOCAL_REGISTRY_PATH = path.join(SAMPLE_DIR, "DEMO_KEY_REGISTRY.json");
const GLOBAL_REGISTRY_PATH = path.resolve(
  SAMPLE_DIR,
  "../../../.well-known/witnessops-demo-signing-keys.json",
);
const VERIFIER_PATH = path.join(SAMPLE_DIR, "verify.mjs");
const NETWORK_DENY_LOADER_PATH = path.join(
  HERE,
  "api-key-rotation-demo-network-deny-loader.mjs",
);

const BASELINE_BUNDLE_TEXT = readFileSync(BUNDLE_PATH, "utf8");
const BASELINE_REGISTRY_TEXT = readFileSync(GLOBAL_REGISTRY_PATH, "utf8");

function freshBundle() {
  return JSON.parse(BASELINE_BUNDLE_TEXT);
}

function freshRegistry() {
  return JSON.parse(BASELINE_REGISTRY_TEXT);
}

function decodeJson(base64) {
  return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function verify(
  bundle = freshBundle(),
  registry = freshRegistry(),
) {
  return verifyBundle(JSON.stringify(bundle), JSON.stringify(registry));
}

async function assertInvalid(
  bundle,
  expectedFailureCode,
  expectedFailedCheck,
  registry = freshRegistry(),
) {
  const report = await verify(bundle, registry);
  assert.equal(report.valid, false);
  assert.equal(report.verdict, "INVALID_OR_UNTRUSTED");
  assert.equal(report.failure_code, expectedFailureCode);
  assert.equal(report.proves_real_provider_action, false);
  assert.deepEqual(
    report.checks.filter((check) => check.status === "fail").map((check) => check.id),
    [expectedFailedCheck],
  );
}

test("published bundle verifies offline with the frozen synthetic boundary", async () => {
  const report = await verifyBundle(
    BASELINE_BUNDLE_TEXT,
    BASELINE_REGISTRY_TEXT,
  );

  assert.equal(report.valid, true);
  assert.equal(report.verdict, "VALID_SYNTHETIC_SPECIMEN");
  assert.equal(report.verifier_version, "witnessops.demo_verifier.v1");
  assert.equal(report.failure_code, null);
  assert.equal(report.proves_real_provider_action, false);
  assert.deepEqual(report.summary, {
    passed: 9,
    failed: 0,
    not_checked: 1,
    evidence_files: 7,
    semantic_checks: 8,
  });
});

test("embedded bundle bytes mirror the published receipt, manifest, evidence, and registry", () => {
  const bundle = freshBundle();
  const manifest = decodeJson(bundle.evidence_manifest);

  assert.equal(
    Buffer.from(bundle.receipt, "base64").toString("utf8"),
    readFileSync(path.join(SAMPLE_DIR, "RECEIPT.json"), "utf8"),
  );
  assert.equal(
    Buffer.from(bundle.evidence_manifest, "base64").toString("utf8"),
    readFileSync(path.join(SAMPLE_DIR, "EVIDENCE_MANIFEST.json"), "utf8"),
  );
  assert.equal(
    readFileSync(LOCAL_REGISTRY_PATH, "utf8"),
    BASELINE_REGISTRY_TEXT,
  );

  assert.deepEqual(
    bundle.evidence.map((item) => item.path).sort(),
    manifest.artifacts.map((artifact) => artifact.path).sort(),
  );

  for (const item of bundle.evidence) {
    const embeddedBytes = Buffer.from(item.content, "base64");
    const mirroredBytes = readFileSync(path.join(SAMPLE_DIR, item.path));
    const artifact = manifest.artifacts.find(
      (candidate) => candidate.path === item.path,
    );

    assert.equal(item.content_encoding, "base64", item.path);
    assert.equal(embeddedBytes.byteLength, item.byte_length, item.path);
    assert.deepEqual(embeddedBytes, mirroredBytes, item.path);
    assert.ok(artifact, item.path);
    assert.equal(item.sha256, sha256(embeddedBytes), item.path);
    assert.equal(artifact.sha256, item.sha256, item.path);
  }
});

test("signed receipt content tampering is release-blocking", async () => {
  const bundle = freshBundle();
  const receipt = decodeJson(bundle.receipt);
  receipt.result.outcome = "fail";
  bundle.receipt = encodeJson(receipt);

  await assertInvalid(bundle, "SIGNATURE_INVALID", "signature_math");
});

test("receipt signature tampering is release-blocking", async () => {
  const bundle = freshBundle();
  const receipt = decodeJson(bundle.receipt);
  const signature = receipt.signature.signature;
  receipt.signature.signature = `${signature[0] === "0" ? "1" : "0"}${signature.slice(1)}`;
  bundle.receipt = encodeJson(receipt);

  await assertInvalid(bundle, "SIGNATURE_INVALID", "signature_math");
});

test("one-byte evidence tampering is release-blocking", async () => {
  const bundle = freshBundle();
  const item = bundle.evidence.find(
    (candidate) => candidate.path === "evidence/BEFORE.json",
  );
  assert.ok(item);
  const bytes = Buffer.from(item.content, "base64");
  bytes[0] ^= 1;
  item.content = bytes.toString("base64");

  await assertInvalid(
    bundle,
    "ARTIFACT_DIGEST_MISMATCH",
    "evidence_integrity",
  );
});

test("attacker-controlled or changed registries are release-blocking", async (context) => {
  await context.test("attacker SPKI bytes cannot inherit the pinned fingerprint", async () => {
    const registry = freshRegistry();
    const attackerSpki = Buffer.from(
      registry.keys[0].public_key_spki_base64,
      "base64",
    );
    attackerSpki[attackerSpki.length - 1] ^= 1;
    registry.keys[0].public_key_spki_base64 = attackerSpki.toString("base64");

    await assertInvalid(
      freshBundle(),
      "KEY_FINGERPRINT_MISMATCH",
      "published_demo_key",
      registry,
    );
  });

  await context.test("changed registry identity cannot replace the pinned signer", async () => {
    const registry = freshRegistry();
    registry.keys[0].id = "attacker_demo_key";

    await assertInvalid(
      freshBundle(),
      "UNTRUSTED_SIGNER",
      "published_demo_key",
      registry,
    );
  });

  await context.test("duplicate signer records are ambiguous and rejected", async () => {
    const registry = freshRegistry();
    registry.keys.push(structuredClone(registry.keys[0]));

    await assertInvalid(
      freshBundle(),
      "UNTRUSTED_SIGNER",
      "published_demo_key",
      registry,
    );
  });
});

test("missing, duplicate, and unsafe evidence paths are release-blocking", async (context) => {
  await context.test("missing path", async () => {
    const bundle = freshBundle();
    bundle.evidence.shift();
    await assertInvalid(bundle, "BUNDLE_INVALID", "evidence_integrity");
  });

  await context.test("duplicate path", async () => {
    const bundle = freshBundle();
    bundle.evidence[1].path = bundle.evidence[0].path;
    await assertInvalid(bundle, "BUNDLE_INVALID", "evidence_integrity");
  });

  await context.test("unsafe traversal path", async () => {
    const bundle = freshBundle();
    bundle.evidence[0].path = "../ACTION_BOUNDARY.json";
    await assertInvalid(bundle, "BUNDLE_INVALID", "evidence_integrity");
  });
});

test("CLI verifies the bundle with network APIs and network modules denied", () => {
  const loaderUrl = pathToFileURL(NETWORK_DENY_LOADER_PATH).href;
  const blockedControl = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-loader",
      loaderUrl,
      "--input-type=module",
      "--eval",
      'await import("node:https")',
    ],
    { encoding: "utf8", timeout: 5_000 },
  );
  assert.notEqual(blockedControl.status, 0);
  assert.match(
    `${blockedControl.stdout}${blockedControl.stderr}`,
    /NETWORK_DISABLED: node:https/,
  );

  const result = spawnSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-loader",
      loaderUrl,
      "--import",
      loaderUrl,
      VERIFIER_PATH,
      BUNDLE_PATH,
      GLOBAL_REGISTRY_PATH,
    ],
    { encoding: "utf8", timeout: 5_000 },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.verdict, "VALID_SYNTHETIC_SPECIMEN");
  assert.equal(report.summary.evidence_files, 7);
  assert.equal(report.summary.semantic_checks, 8);
});
