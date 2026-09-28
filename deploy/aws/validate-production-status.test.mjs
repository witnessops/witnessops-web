import assert from "node:assert/strict";
import test from "node:test";
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
