#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const NODE = /^mi-[0-9a-f]{17}$/;
const COMMAND = /^[0-9a-f-]{36}$/;
const REF = /^[0-9]{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/witnessops-web@(sha256:[0-9a-f]{64})$/;

function assert(value, message) {
  if (!value) throw new Error(message);
}

export function boundedStatusReceipt(invocation, expectedNode, expectedCommand) {
  assert(NODE.test(expectedNode) && COMMAND.test(expectedCommand), "invalid status target identity");
  assert(invocation?.InstanceId === expectedNode, "status result came from another node");
  assert(invocation?.CommandId === expectedCommand, "status result came from another command");
  const unknown = {
    schema_version: "witnessops.production-status-receipt.v1",
    status: "UNKNOWN",
    observed_at_utc: new Date().toISOString(),
    managed_node_id: expectedNode,
    command_id: expectedCommand,
    current_digest: "UNKNOWN",
    previous_digest: "UNKNOWN",
  };
  if (invocation.Status !== "Success" || invocation.StandardErrorContent !== "") return unknown;
  let result;
  try {
    result = JSON.parse(invocation.StandardOutputContent);
  } catch {
    return unknown;
  }
  if (result?.schema_version !== "witnessops.production-status.v1" || result.status !== "PASS") {
    return unknown;
  }
  const exactKeys = ["adapter_sha256", "config_sha256", "current_digest", "current_image_ref",
    "observed_at_utc", "previous_digest", "previous_state", "schema_version", "status"];
  if (JSON.stringify(Object.keys(result).sort()) !== JSON.stringify(exactKeys.sort())) return unknown;
  const match = REF.exec(result.current_image_ref);
  if (!match || !DIGEST.test(result.current_digest) || match[1] !== result.current_digest ||
      !DIGEST.test(result.adapter_sha256) || !DIGEST.test(result.config_sha256) ||
      !Number.isFinite(Date.parse(result.observed_at_utc)) ||
      !((result.previous_state === "UNKNOWN" && result.previous_digest === "UNKNOWN") ||
        (result.previous_state === "RECORDED" && DIGEST.test(result.previous_digest) &&
          result.previous_digest !== result.current_digest))) return unknown;
  return {
    schema_version: unknown.schema_version,
    status: "PASS",
    observed_at_utc: result.observed_at_utc,
    managed_node_id: expectedNode,
    command_id: expectedCommand,
    current_digest: result.current_digest,
    current_image_ref: result.current_image_ref,
    previous_state: result.previous_state,
    previous_digest: result.previous_digest,
    adapter_sha256: result.adapter_sha256,
    config_sha256: result.config_sha256,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2);
  assert(input && output && process.argv.length === 4, "status receipt requires input and output paths");
  const invocation = JSON.parse(readFileSync(input, "utf8"));
  const receipt = boundedStatusReceipt(invocation, process.env.MANAGED_NODE_ID, process.env.COMMAND_ID);
  writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  if (receipt.status !== "PASS") process.exitCode = 1;
}
