import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const canaryWorkflow = readFileSync(
  new URL("../.github/workflows/canary-receipt-emit.yml", import.meta.url),
  "utf8",
);

test("receipt signing is source-bound and follows the low-authority conformance gate", () => {
  const gateIndex = canaryWorkflow.indexOf("pnpm verify:skill-contract");
  const signIndex = canaryWorkflow.indexOf("cosign sign-blob", gateIndex);
  assert.ok(gateIndex >= 0, "signing workflow must run the repository gate");
  assert.ok(signIndex > gateIndex, "receipt signing must happen after the repository gate");
  assert.match(canaryWorkflow, /sourceRevision: process\.env\.GITHUB_SHA/);
  assert.match(
    canaryWorkflow,
    /verifiedSourceRevision: process\.env\.VERIFIED_SOURCE_REVISION/,
  );
  assert.match(canaryWorkflow, /needs: verify-conformance/);
  assert.match(canaryWorkflow, /test "\$\{VERIFIED_SOURCE_REVISION\}" = "\$\{GITHUB_SHA\}"/);

  const signingJob = canaryWorkflow.slice(canaryWorkflow.indexOf("\n  emit-receipt:"));
  assert.doesNotMatch(
    signingJob,
    /pnpm install/,
    "the OIDC-enabled signing job must not install repository dependencies",
  );
  assert.match(canaryWorkflow, /SOURCE_BINDING_BASENAME/);
  assert.match(
    canaryWorkflow,
    /Binds the exact receipt bytes and named passing checks to this GitHub source revision/,
  );
});
