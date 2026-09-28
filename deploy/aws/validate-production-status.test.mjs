import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { boundedStatusReceipt } from "./validate-production-status.mjs";

const digest = (letter) => `sha256:${letter.repeat(64)}`;
const node = `mi-${"a".repeat(17)}`;
const command = "123e4567-e89b-42d3-a456-426614174000";
const payload = () => ({
  schema_version: "witnessops.production-status.v1",
  status: "PASS",
  observed_at_utc: "2026-09-28T12:00:00+00:00",
  current_digest: digest("b"),
  current_image_ref: `123456789012.dkr.ecr.eu-central-1.amazonaws.com/witnessops-web@${digest("b")}`,
  previous_digest: "UNKNOWN",
  previous_state: "UNKNOWN",
  adapter_sha256: digest("c"),
  config_sha256: digest("d"),
});
const invocation = (body = payload()) => ({
  InstanceId: node,
  CommandId: command,
  Status: "Success",
  StandardErrorContent: "",
  StandardOutputContent: JSON.stringify(body),
});

test("accepts only exact live status and leaves unknown rollback unknown", () => {
  const receipt = boundedStatusReceipt(invocation(), node, command);
  assert.equal(receipt.status, "PASS");
  assert.equal(receipt.current_digest, digest("b"));
  assert.equal(receipt.previous_digest, "UNKNOWN");
});

test("rejects another managed node or SSM command", () => {
  assert.throws(() => boundedStatusReceipt(invocation(), `mi-${"e".repeat(17)}`, command));
  assert.throws(() => boundedStatusReceipt(invocation(), node, "00000000-0000-0000-0000-000000000000"));
});

test("fails closed on failed SSM, wrong image, unsupported fields, and secret-bearing output", () => {
  const failed = invocation();
  failed.Status = "Failed";
  assert.equal(boundedStatusReceipt(failed, node, command).status, "UNKNOWN");
  const mismatched = payload();
  mismatched.current_digest = digest("e");
  assert.equal(boundedStatusReceipt(invocation(mismatched), node, command).status, "UNKNOWN");
  const secret = payload();
  secret.secret_value = "must-not-be-emitted";
  const receipt = boundedStatusReceipt(invocation(secret), node, command);
  assert.equal(receipt.status, "UNKNOWN");
  assert.equal(JSON.stringify(receipt).includes("must-not-be-emitted"), false);
});

test("rejects guessed or malformed previous state", () => {
  const guessed = payload();
  guessed.previous_state = "RECORDED";
  guessed.previous_digest = "UNKNOWN";
  assert.equal(boundedStatusReceipt(invocation(guessed), node, command).status, "UNKNOWN");
  const noOp = payload();
  noOp.previous_state = "RECORDED";
  noOp.previous_digest = noOp.current_digest;
  assert.equal(boundedStatusReceipt(invocation(noOp), node, command).status, "UNKNOWN");
  const recorded = payload();
  recorded.previous_state = "RECORDED";
  recorded.previous_digest = digest("f");
  assert.equal(boundedStatusReceipt(invocation(recorded), node, command).previous_digest, digest("f"));
});

test("failed invocation lookup writes the bounded UNKNOWN artifact before the job fails", () => {
  const directory = mkdtempSync(join(tmpdir(), "wops-status-lookup-"));
  try {
    const aws = join(directory, "aws");
    writeFileSync(aws, `#!/usr/bin/env bash
case "$2" in
  send-command) printf '%s\\n' '${command}' ;;
  wait) exit 0 ;;
  get-command-invocation) printf '%s\\n' 'RAW_AWS_ERROR_MUST_NOT_ESCAPE' >&2; exit 9 ;;
  *) exit 99 ;;
esac
`, { mode: 0o700 });
    const source = readFileSync(new URL("../../.github/workflows/aws-release-reusable.yml", import.meta.url), "utf8");
    const start = source.indexOf("      - name: Invoke only the parameterless production status document");
    const runStart = source.indexOf("        run: |\n", start) + "        run: |\n".length;
    const end = source.indexOf("\n      - name: Retain the bounded non-secret status receipt", runStart);
    assert.ok(start >= 0 && runStart > start && end > runStart);
    const script = source.slice(runStart, end).split("\n").map((line) => line.replace(/^          /, "")).join("\n");
    const outcome = spawnSync("bash", ["-c", script], {
      cwd: fileURLToPath(new URL("../..", import.meta.url)),
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        AWS_REGION: "eu-central-1",
        MANAGED_NODE_ID: node,
        DEPLOY_DOCUMENT_NAME: "stack-deploy-production-v1",
        LOG_GROUP: "test-log-group",
        RUNNER_TEMP: directory,
        GITHUB_STEP_SUMMARY: join(directory, "summary.md"),
      },
      encoding: "utf8",
    });
    assert.equal(outcome.status, 1);
    const artifact = join(directory, "production-status-receipt.json");
    const receipt = JSON.parse(readFileSync(artifact, "utf8"));
    assert.deepEqual(Object.keys(receipt).sort(), [
      "command_id", "current_digest", "managed_node_id", "observed_at_utc",
      "previous_digest", "schema_version", "status",
    ]);
    assert.equal(receipt.schema_version, "witnessops.production-status-receipt.v1");
    assert.equal(receipt.status, "UNKNOWN");
    assert.equal(receipt.managed_node_id, node);
    assert.equal(receipt.command_id, command);
    assert.equal(receipt.current_digest, "UNKNOWN");
    assert.equal(receipt.previous_digest, "UNKNOWN");
    assert.ok(Number.isFinite(Date.parse(receipt.observed_at_utc)));
    assert.equal(statSync(artifact).mode & 0o777, 0o600);
    assert.equal(JSON.stringify(receipt).includes("RAW_AWS_ERROR_MUST_NOT_ESCAPE"), false);
    assert.match(source.slice(end), /if: always\(\)[\s\S]*production-status-receipt\.json/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
