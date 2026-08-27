const VERIFIER_VERSION = "witnessops.demo_verifier.v1";
const EXPECTED_BUNDLE_VERSION = "witnessops.synthetic_proof_bundle.v1";
const EXPECTED_FIXTURE = "compromised_api_key_rotation_v1";
const EXPECTED_WORKFLOW_CLASS = "compromised_api_key_rotation";
const EXPECTED_KEY_ID = "witnessops_demo_api_key_rotation_20260827";
const PINNED_KEY_FINGERPRINT =
  "sha256:72a03b6fdacaad90dfc58c0e782ec51e111dfecbc1b841b6cb7a68d0a557f6e4";
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export async function verifyBundle(bundleText, registryText) {
  const checks = [];
  const context = {};

  async function stage(id, label, operation) {
    try {
      const detail = await operation();
      checks.push({ id, label, status: "pass", detail });
      return true;
    } catch (error) {
      const failure = normalizeFailure(error);
      checks.push({
        id,
        label,
        status: "fail",
        detail: failure.message,
        failure_code: failure.code,
      });
      context.failure = failure;
      return false;
    }
  }

  if (
    !(await stage("bundle_structure", "Bundle structure", () => {
      assertUtf8Size(bundleText, "bundle");
      assertUtf8Size(registryText, "key registry");
      assertNoDuplicateKeys(bundleText, "bundle");
      assertNoDuplicateKeys(registryText, "key registry");

      const bundle = parseJson(bundleText, "bundle");
      const registry = parseJson(registryText, "key registry");
      expectRecord(bundle, "MALFORMED_BUNDLE", "bundle must be a JSON object");
      expectRecord(registry, "MALFORMED_KEY_REGISTRY", "key registry must be a JSON object");
      expect(
        bundle.bundle_version === EXPECTED_BUNDLE_VERSION,
        "UNSUPPORTED_BUNDLE_VERSION",
        `expected ${EXPECTED_BUNDLE_VERSION}`,
      );
      expect(bundle.mode === "synthetic", "SYNTHETIC_BOUNDARY_MISSING", "bundle mode must be synthetic");
      expect(bundle.fixture === EXPECTED_FIXTURE, "UNSUPPORTED_FIXTURE", `expected ${EXPECTED_FIXTURE}`);
      expect(bundle.receipt_encoding === "base64", "UNSUPPORTED_ENCODING", "receipt must use base64");
      expect(
        bundle.evidence_manifest_encoding === "base64",
        "UNSUPPORTED_ENCODING",
        "evidence manifest must use base64",
      );
      expect(Array.isArray(bundle.evidence), "MALFORMED_BUNDLE", "evidence must be an array");

      const receiptText = decodeBase64Text(bundle.receipt, "receipt");
      const manifestText = decodeBase64Text(bundle.evidence_manifest, "evidence manifest");
      assertNoDuplicateKeys(receiptText, "receipt");
      assertNoDuplicateKeys(manifestText, "evidence manifest");
      const receipt = parseJson(receiptText, "receipt");
      const manifest = parseJson(manifestText, "evidence manifest");
      expectRecord(receipt, "MALFORMED_RECEIPT", "receipt must be a JSON object");
      expectRecord(manifest, "MALFORMED_MANIFEST", "evidence manifest must be a JSON object");

      context.bundle = bundle;
      context.registry = registry;
      context.receipt = receipt;
      context.receiptText = receiptText;
      context.manifest = manifest;
      context.manifestText = manifestText;

      return `${bundle.evidence.length} embedded evidence files; synthetic fixture declared`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("published_demo_key", "Published demo signer", async () => {
      const { bundle, registry, receipt } = context;
      expect(registry.schema === "witnessops.demo_key_registry.v1", "UNSUPPORTED_KEY_REGISTRY", "unexpected key registry schema");
      expect(Array.isArray(registry.keys), "MALFORMED_KEY_REGISTRY", "registry keys must be an array");
      const matches = registry.keys.filter((key) => key?.id === receipt.signature?.public_key_id);
      expect(matches.length === 1, "UNTRUSTED_SIGNER", "receipt key must resolve to exactly one registry entry");
      const key = matches[0];
      expect(receipt.signature?.public_key_id === EXPECTED_KEY_ID, "UNTRUSTED_SIGNER", "receipt key ID is not the pinned demo key");
      expect(receipt.signature?.algorithm === "ed25519", "UNSUPPORTED_SIGNATURE", "only Ed25519 is accepted");
      expect(receipt.signature?.encoding === "hex", "UNSUPPORTED_SIGNATURE", "signature must use lowercase hex");
      expect(/^[a-f0-9]{128}$/.test(receipt.signature?.signature ?? ""), "MALFORMED_SIGNATURE", "signature must be 64-byte lowercase hex");
      expect(key.algorithm === "ed25519", "UNTRUSTED_SIGNER", "registry algorithm mismatch");
      expect(key.purpose === "synthetic_demo_receipts_only", "UNTRUSTED_SIGNER", "registry purpose is not demo-only");
      expect(["active", "retired"].includes(key.status), "UNTRUSTED_SIGNER", `unacceptable key status: ${String(key.status)}`);
      expect(key.public_key_fingerprint === PINNED_KEY_FINGERPRINT, "UNTRUSTED_SIGNER", "registry fingerprint is not pinned by verifier v1");
      const spki = decodeBase64(key.public_key_spki_base64, "registry SPKI key");
      const computedFingerprint = `sha256:${await sha256Hex(spki)}`;
      expect(computedFingerprint === PINNED_KEY_FINGERPRINT, "KEY_FINGERPRINT_MISMATCH", "registry SPKI bytes do not match the pinned fingerprint");
      expect(
        bundle.verification_material?.public_key_fingerprint === PINNED_KEY_FINGERPRINT,
        "KEY_FINGERPRINT_MISMATCH",
        "bundle convenience-key fingerprint disagrees with the trust source",
      );
      expect(
        bundle.verification_material?.public_key_spki_base64 === key.public_key_spki_base64,
        "KEY_FINGERPRINT_MISMATCH",
        "bundle convenience key disagrees with the registry",
      );
      context.key = key;
      context.spki = spki;
      return `${key.id}; ${key.status}; ${PINNED_KEY_FINGERPRINT}`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("signature_math", "Ed25519 receipt signature", async () => {
      const { receipt, spki } = context;
      expect(receipt.receipt_version === "witnessops.receipt.v0", "UNSUPPORTED_RECEIPT", "unexpected receipt version");
      expect(
        receipt.receipt_profile === "witnessops.verification_context.v1",
        "UNSUPPORTED_RECEIPT",
        "expected verification-context profile v1",
      );
      expect(receipt.workflow_class === EXPECTED_WORKFLOW_CLASS, "UNSUPPORTED_RECEIPT", "unexpected workflow class");
      const unsigned = { ...receipt };
      const signatureHex = unsigned.signature.signature;
      delete unsigned.signature;
      const canonicalBytes = utf8(canonicalize(unsigned));
      const signatureBytes = hexToBytes(signatureHex);
      const key = await crypto.subtle.importKey(
        "spki",
        spki,
        { name: "Ed25519" },
        false,
        ["verify"],
      );
      const valid = await crypto.subtle.verify(
        "Ed25519",
        key,
        signatureBytes,
        canonicalBytes,
      );
      expect(valid, "SIGNATURE_INVALID", "receipt signature did not verify");
      return `valid Ed25519 signature over ${canonicalBytes.byteLength} canonical unsigned-receipt bytes`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("manifest_integrity", "Signed evidence manifest", async () => {
      const { receipt, manifest } = context;
      expect(
        manifest.manifest_version === "witnessops.evidence_manifest.v0",
        "UNSUPPORTED_MANIFEST",
        "unexpected evidence-manifest version",
      );
      expect(manifest.workflow_class === receipt.workflow_class, "MANIFEST_IDENTITY_MISMATCH", "workflow class differs from receipt");
      expect(manifest.proof_run_id === receipt.proof_run_id, "MANIFEST_IDENTITY_MISMATCH", "proof-run ID differs from receipt");
      const digest = `sha256:${await sha256Hex(utf8(canonicalize(manifest)))}`;
      expect(digest === receipt.manifest_hash, "MANIFEST_HASH_MISMATCH", "canonical manifest hash differs from signed receipt");
      return digest;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("evidence_integrity", "Exact evidence bytes", async () => {
      const { bundle, manifest } = context;
      expect(Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0, "MALFORMED_MANIFEST", "manifest artifacts are required");
      const manifestPaths = new Set();
      const artifactIds = new Set();
      for (const artifact of manifest.artifacts) {
        expectRecord(artifact, "MALFORMED_MANIFEST", "artifact entries must be objects");
        expectSafePath(artifact.path);
        expect(!manifestPaths.has(artifact.path), "BUNDLE_INVALID", `duplicate manifest path: ${artifact.path}`);
        expect(!artifactIds.has(artifact.artifact_id), "BUNDLE_INVALID", `duplicate artifact ID: ${artifact.artifact_id}`);
        manifestPaths.add(artifact.path);
        artifactIds.add(artifact.artifact_id);
      }

      const bundlePaths = new Set();
      const evidenceByPath = new Map();
      for (const item of bundle.evidence) {
        expectRecord(item, "MALFORMED_BUNDLE", "evidence entries must be objects");
        expectSafePath(item.path);
        expect(!bundlePaths.has(item.path), "BUNDLE_INVALID", `duplicate bundle path: ${item.path}`);
        bundlePaths.add(item.path);
        evidenceByPath.set(item.path, item);
      }
      expect(bundlePaths.size === manifestPaths.size, "BUNDLE_INVALID", "bundle and manifest evidence counts differ");

      const decodedEvidence = new Map();
      for (const artifact of manifest.artifacts) {
        const item = evidenceByPath.get(artifact.path);
        expect(item, "ARTIFACT_MISSING", `missing ${artifact.path}`);
        expect(item.content_encoding === "base64", "UNSUPPORTED_ENCODING", `${artifact.path} must use base64`);
        const bytes = decodeBase64(item.content, artifact.path);
        expect(bytes.byteLength === item.byte_length, "ARTIFACT_LENGTH_MISMATCH", `${artifact.path} byte length differs`);
        const digest = `sha256:${await sha256Hex(bytes)}`;
        expect(digest === item.sha256, "ARTIFACT_DIGEST_MISMATCH", `${artifact.path} bundle digest differs`);
        expect(digest === artifact.sha256, "ARTIFACT_DIGEST_MISMATCH", `${artifact.path} manifest digest differs`);
        decodedEvidence.set(artifact.path, decodeUtf8(bytes, artifact.path));
      }
      context.artifactIds = artifactIds;
      context.evidence = decodedEvidence;
      return `${decodedEvidence.size}/${manifest.artifacts.length} files matched by exact path, byte length, and SHA-256`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("receipt_references", "Receipt-to-evidence references", () => {
      const { receipt, artifactIds } = context;
      expect(Array.isArray(receipt.claims) && receipt.claims.length > 0, "MALFORMED_RECEIPT", "receipt claims are required");
      const seenClaims = new Set();
      for (const claim of receipt.claims) {
        expectRecord(claim, "MALFORMED_RECEIPT", "claims must be objects");
        expect(!seenClaims.has(claim.claim), "MALFORMED_RECEIPT", `duplicate claim: ${claim.claim}`);
        seenClaims.add(claim.claim);
        expect(claim.status === "passed", "CLAIM_STATUS_INVALID", `${claim.claim} is not passed`);
        expect(Array.isArray(claim.evidence_refs) && claim.evidence_refs.length > 0, "EVIDENCE_REFERENCE_INVALID", `${claim.claim} has no evidence`);
        expect(new Set(claim.evidence_refs).size === claim.evidence_refs.length, "EVIDENCE_REFERENCE_INVALID", `${claim.claim} repeats evidence refs`);
        for (const ref of claim.evidence_refs) {
          expect(artifactIds.has(ref), "EVIDENCE_REFERENCE_INVALID", `${claim.claim} references missing artifact ${ref}`);
        }
      }
      context.claimIds = seenClaims;
      return `${seenClaims.size} signed claims resolve to unique manifest artifacts`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("authority_and_scope", "Synthetic authority and scope", () => {
      const { evidence } = context;
      const contract = parseEvidenceJson(evidence, "ACTION_BOUNDARY.json");
      const authority = parseEvidenceJson(evidence, "AUTHORITY_MAP.json");
      const events = parseNdjson(evidence.get("evidence/EVENTS.ndjson"), "evidence/EVENTS.ndjson");
      expect(contract.synthetic === true && authority.synthetic === true, "SYNTHETIC_BOUNDARY_MISSING", "contract and authority must be synthetic");
      expect(authority.approval?.approved === true, "AUTHORITY_SEQUENCE_INVALID", "approval is not granted");
      expect(authority.approval?.single_use === true, "AUTHORITY_SEQUENCE_INVALID", "approval must be single-use");
      expect(authority.approval?.contract_id === contract.contract_id, "AUTHORITY_TARGET_MISMATCH", "approval references a different contract");
      expect(deepEqual(authority.approval?.exact_target, contract.exact_targets), "AUTHORITY_TARGET_MISMATCH", "approved and contracted targets differ");
      expect(deepEqual(authority.approval?.allowed_operations, contract.allowed_operations), "AUTHORITY_SCOPE_MISMATCH", "approved and contracted operations differ");

      const approvedAt = time(authority.approval.approved_at, "approval time");
      const expiresAt = time(authority.approval.expires_at, "approval expiry");
      const firstEventAt = time(events[0]?.at, "first event time");
      const lastEventAt = time(events.at(-1)?.at, "last event time");
      expect(approvedAt < firstEventAt, "AUTHORITY_SEQUENCE_INVALID", "execution did not begin after approval");
      expect(lastEventAt <= expiresAt, "AUTHORITY_SEQUENCE_INVALID", "execution exceeded approval expiry");

      const allowed = new Set(contract.allowed_operations);
      const prohibited = new Set(contract.prohibited_operations);
      for (const event of events) {
        expect(allowed.has(event.operation), "SCOPE_VIOLATION", `unapproved operation: ${event.operation}`);
        expect(!prohibited.has(event.operation), "SCOPE_VIOLATION", `prohibited operation: ${event.operation}`);
        expectEventTarget(event, contract.exact_targets);
      }
      context.contract = contract;
      context.authority = authority;
      context.events = events;
      return `${events.length} ordered events stayed inside one target-bound, single-use approval`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("rotation_semantics", "Recomputed rotation transition", () => {
      const { evidence, contract, events, receipt, claimIds } = context;
      const alert = parseEvidenceJson(evidence, "evidence/ALERT.json");
      const before = parseEvidenceJson(evidence, "evidence/BEFORE.json");
      const after = parseEvidenceJson(evidence, "evidence/AFTER.json");
      const expectedOperations = [
        "create_replacement",
        "update_consumer_reference",
        "probe_replacement",
        "revoke_old",
        "probe_old",
        "read_back_state",
      ];
      expect(events.length === expectedOperations.length, "ROTATION_SEQUENCE_INVALID", "unexpected event count");
      expect(deepEqual(events.map((event) => event.operation), expectedOperations), "ROTATION_SEQUENCE_INVALID", "event order differs from the frozen method");
      events.forEach((event, index) => {
        expect(event.seq === index + 1, "ROTATION_SEQUENCE_INVALID", "event sequence numbers are not contiguous");
        if (index > 0) {
          expect(time(events[index - 1].at, "event time") < time(event.at, "event time"), "ROTATION_SEQUENCE_INVALID", "event timestamps are not strictly increasing");
        }
      });

      const oldBefore = before.credentials?.find((credential) => credential.key_id === contract.exact_targets.old_key_id);
      const created = events[0];
      const migrated = events[1];
      const newProbe = events[2];
      const revoked = events[3];
      const oldProbe = events[4];
      const readBack = events[5];
      const oldAfter = after.credentials?.find((credential) => credential.key_id === oldBefore?.key_id);
      const newAfter = after.credentials?.find((credential) => credential.key_id === created.key_id);

      expect(oldBefore?.status === "active", "BEFORE_STATE_INVALID", "old key was not active before rotation");
      expect(alert.credential?.fingerprint === oldBefore.fingerprint, "ALERT_TARGET_MISMATCH", "alert fingerprint differs from before state");
      expect(created.key_id !== oldBefore.key_id, "ROTATION_IDENTITY_INVALID", "replacement reused the old key ID");
      expect(created.fingerprint !== oldBefore.fingerprint, "ROTATION_IDENTITY_INVALID", "replacement reused the old fingerprint");
      expect(migrated.from_key_id === oldBefore.key_id && migrated.to_key_id === created.key_id, "MIGRATION_NOT_CONFIRMED", "consumer migration IDs do not bind old to replacement");
      expect(time(migrated.at, "migration time") < time(revoked.at, "revocation time"), "MIGRATION_NOT_CONFIRMED", "consumer migration did not precede revocation");
      expect(newProbe.key_id === created.key_id && newProbe.result === "accepted" && newProbe.http_status === 200, "NEW_KEY_NOT_ACCEPTED", "replacement canary did not return accepted HTTP 200");
      expect(time(newProbe.at, "new probe time") < time(revoked.at, "revocation time"), "NEW_KEY_NOT_ACCEPTED", "replacement was not proven before revocation");
      expect(revoked.key_id === oldBefore.key_id && revoked.result === "old_key_revoked", "OLD_KEY_NOT_REVOKED", "old-key revocation is missing or mismatched");
      expect(oldProbe.key_id === oldBefore.key_id && oldProbe.result === "rejected" && oldProbe.http_status === 401 && oldProbe.response_code === "credential_revoked", "OLD_KEY_STILL_ACCEPTED", "old-key post-revocation probe was not 401 credential_revoked");
      expect(time(revoked.at, "revocation time") < time(oldProbe.at, "old probe time"), "OLD_KEY_STILL_ACCEPTED", "old-key rejection was not observed after revocation");
      const dualActiveSeconds = (time(revoked.at, "revocation time") - time(created.at, "creation time")) / 1000;
      expect(dualActiveSeconds <= contract.maximum_dual_active_seconds, "DUAL_ACTIVE_WINDOW_EXCEEDED", `dual-active interval ${dualActiveSeconds}s exceeds contract`);
      expect(oldAfter?.status === "revoked", "FINAL_STATE_MISMATCH", "final state does not show old key revoked");
      expect(newAfter?.status === "active", "FINAL_STATE_MISMATCH", "final state does not show replacement active");
      expect(after.consumer?.credential_key_id === created.key_id, "MIGRATION_NOT_CONFIRMED", "final consumer does not reference replacement");
      expect(readBack.state_revision === after.revision, "FINAL_STATE_MISMATCH", "read-back revision differs from final state");
      expect(receipt.result?.outcome === "pass" && Array.isArray(receipt.result?.failure_states) && receipt.result.failure_states.length === 0, "CLAIM_STATUS_INVALID", "signed receipt outcome is not pass");

      const expectedClaims = new Set([
        "approval_preceded_rotation",
        "target_matched_approval",
        "replacement_key_accepted",
        "consumer_migrated_before_revocation",
        "old_key_rejected_after_revocation",
        "prohibited_actions_absent",
        "plaintext_secret_absent",
      ]);
      expect(deepEqual([...claimIds].sort(), [...expectedClaims].sort()), "CLAIM_SET_INVALID", "signed claim set differs from method v1");
      context.semanticCount = 8;
      return `8/8 checks: authority, target, identity, migration, new-key probe, revocation, old-key rejection, final read-back`;
    }))
  ) {
    return buildReport(checks, context);
  }

  if (
    !(await stage("secret_material_absent", "Credential material suppression", () => {
      const { evidence, bundle } = context;
      const forbiddenFields = new Set([
        "api_key",
        "api_key_value",
        "credential_value",
        "secret",
        "secret_value",
        "token",
        "token_value",
        "private_key",
      ]);
      for (const [path, text] of evidence) {
        const values = path.endsWith(".ndjson")
          ? parseNdjson(text, path)
          : [parseJsonWithDuplicateCheck(text, path)];
        for (const value of values) {
          walk(value, (key, item) => {
            expect(!forbiddenFields.has(key), "SECRET_MATERIAL_PRESENT", `${path} contains forbidden field ${key}`);
            if (key === "credential_material_observed" || key === "secret_material_available") {
              expect(item === false, "SECRET_MATERIAL_PRESENT", `${path} reports readable credential material`);
            }
          });
        }
      }
      expect(bundle.mode === "synthetic", "SYNTHETIC_BOUNDARY_MISSING", "bundle is not synthetic");
      return "fingerprints and synthetic key IDs only; no credential-value fields";
    }))
  ) {
    return buildReport(checks, context);
  }

  checks.push({
    id: "real_provider_action",
    label: "Real provider or compromise checked",
    status: "not_checked",
    detail: "No. This verifier checked one public synthetic fixture only.",
  });
  return buildReport(checks, context);
}

function buildReport(checks, context) {
  const failed = checks.find((check) => check.status === "fail");
  const valid = !failed && checks.some((check) => check.id === "secret_material_absent");
  return {
    verifier_version: VERIFIER_VERSION,
    verdict: valid ? "VALID_SYNTHETIC_SPECIMEN" : "INVALID_OR_UNTRUSTED",
    valid,
    synthetic: true,
    proof_run_id: context.receipt?.proof_run_id ?? null,
    fixture: context.bundle?.fixture ?? null,
    checks,
    summary: {
      passed: checks.filter((check) => check.status === "pass").length,
      failed: checks.filter((check) => check.status === "fail").length,
      not_checked: checks.filter((check) => check.status === "not_checked").length,
      evidence_files: context.evidence?.size ?? 0,
      semantic_checks: context.semanticCount ?? 0,
    },
    failure_code: failed?.failure_code ?? null,
    proves_real_provider_action: false,
    limitation:
      "Cryptographic integrity and the declared synthetic rotation transition are checkable. No real provider, credential, compromise, customer, or production system was used or checked.",
  };
}

function expect(condition, code, message) {
  if (!condition) throw new VerificationFailure(code, message);
}

function expectRecord(value, code, message) {
  expect(value !== null && typeof value === "object" && !Array.isArray(value), code, message);
}

function expectSafePath(path) {
  expect(typeof path === "string" && path.length > 0, "BUNDLE_INVALID", "artifact path is missing");
  expect(!path.startsWith("/") && !path.startsWith("\\"), "BUNDLE_INVALID", `absolute path rejected: ${path}`);
  expect(!path.includes("\\") && !path.split("/").includes(".."), "BUNDLE_INVALID", `unsafe path rejected: ${path}`);
  expect(/^[A-Za-z0-9._/-]+$/.test(path), "BUNDLE_INVALID", `unsupported path characters: ${path}`);
}

function expectEventTarget(event, targets) {
  const expectedByOperation = {
    create_replacement: targets.tenant,
    update_consumer_reference: targets.consumer,
    probe_replacement: targets.provider,
    revoke_old: targets.tenant,
    probe_old: targets.provider,
    read_back_state: targets.tenant,
  };
  expect(event.target === expectedByOperation[event.operation], "SCOPE_VIOLATION", `${event.operation} target differs from contract`);
}

function parseEvidenceJson(evidence, path) {
  const text = evidence.get(path);
  expect(typeof text === "string", "ARTIFACT_MISSING", `missing ${path}`);
  return parseJsonWithDuplicateCheck(text, path);
}

function parseJsonWithDuplicateCheck(text, label) {
  assertNoDuplicateKeys(text, label);
  return parseJson(text, label);
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new VerificationFailure("MALFORMED_JSON", `${label} is not valid JSON`);
  }
}

function parseNdjson(text, label) {
  expect(typeof text === "string", "ARTIFACT_MISSING", `missing ${label}`);
  const lines = text.split("\n").filter((line) => line.length > 0);
  expect(lines.length > 0, "MALFORMED_JSON", `${label} is empty`);
  return lines.map((line, index) => parseJsonWithDuplicateCheck(line, `${label} line ${index + 1}`));
}

function assertUtf8Size(value, label) {
  expect(typeof value === "string", "MALFORMED_INPUT", `${label} must be text`);
  expect(utf8(value).byteLength <= MAX_INPUT_BYTES, "INPUT_TOO_LARGE", `${label} exceeds ${MAX_INPUT_BYTES} bytes`);
}

function assertNoDuplicateKeys(source, label) {
  const duplicate = findDuplicateJsonObjectKey(source);
  expect(duplicate === null, "DUPLICATE_JSON_KEY", `${label} contains duplicate key ${String(duplicate)}`);
}

function findDuplicateJsonObjectKey(source) {
  let index = 0;
  function whitespace() {
    while (/\s/.test(source[index] ?? "")) index += 1;
  }
  function string() {
    const start = index++;
    let escaped = false;
    while (index < source.length) {
      const char = source[index++];
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') return JSON.parse(source.slice(start, index));
    }
    throw new VerificationFailure("MALFORMED_JSON", "unterminated JSON string");
  }
  function primitive() {
    while (index < source.length && !/[,\]}]/.test(source[index] ?? "")) index += 1;
  }
  function value(depth) {
    expect(depth <= 128, "MALFORMED_JSON", "JSON nesting exceeds 128 levels");
    whitespace();
    if (source[index] === "{") return object(depth + 1);
    if (source[index] === "[") return array(depth + 1);
    if (source[index] === '"') {
      string();
      return null;
    }
    primitive();
    return null;
  }
  function object(depth) {
    index += 1;
    const keys = new Set();
    whitespace();
    if (source[index] === "}") {
      index += 1;
      return null;
    }
    while (index < source.length) {
      whitespace();
      if (source[index] !== '"') return null;
      const key = string();
      if (keys.has(key)) return key;
      keys.add(key);
      whitespace();
      if (source[index] !== ":") return null;
      index += 1;
      const duplicate = value(depth);
      if (duplicate !== null) return duplicate;
      whitespace();
      if (source[index] === ",") {
        index += 1;
        continue;
      }
      if (source[index] === "}") {
        index += 1;
        return null;
      }
      return null;
    }
    return null;
  }
  function array(depth) {
    index += 1;
    whitespace();
    if (source[index] === "]") {
      index += 1;
      return null;
    }
    while (index < source.length) {
      const duplicate = value(depth);
      if (duplicate !== null) return duplicate;
      whitespace();
      if (source[index] === ",") {
        index += 1;
        continue;
      }
      if (source[index] === "]") {
        index += 1;
        return null;
      }
      return null;
    }
    return null;
  }
  return value(0);
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeBase64Text(value, label) {
  return decodeUtf8(decodeBase64(value, label), label);
}

function decodeBase64(value, label) {
  expect(typeof value === "string" && /^[A-Za-z0-9+/]*={0,2}$/.test(value), "MALFORMED_BASE64", `${label} is not canonical base64`);
  try {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new VerificationFailure("MALFORMED_BASE64", `${label} could not be decoded`);
  }
}

function decodeUtf8(value, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    throw new VerificationFailure("MALFORMED_UTF8", `${label} is not valid UTF-8`);
  }
}

function hexToBytes(value) {
  expect(typeof value === "string" && value.length % 2 === 0 && /^[a-f0-9]+$/.test(value), "MALFORMED_HEX", "signature is not lowercase hex");
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function time(value, label) {
  const parsed = Date.parse(value);
  expect(Number.isFinite(parsed), "MALFORMED_TIMESTAMP", `${label} is invalid`);
  return parsed;
}

function deepEqual(left, right) {
  return canonicalize(left) === canonicalize(right);
}

function walk(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      visit(key, item);
      walk(item, visit);
    }
  }
}

function normalizeFailure(error) {
  if (error instanceof VerificationFailure) return error;
  return new VerificationFailure(
    "VERIFIER_ERROR",
    error instanceof Error ? error.message : String(error),
  );
}

class VerificationFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = "VerificationFailure";
    this.code = code;
  }
}

async function runCli() {
  const [{ readFile }, { dirname, resolve }, { fileURLToPath }] = await Promise.all([
    import("node:fs/promises"),
    import("node:path"),
    import("node:url"),
  ]);
  const here = dirname(fileURLToPath(import.meta.url));
  const bundlePath = resolve(process.argv[2] ?? `${here}/BUNDLE.wops.json`);
  const registryPath = resolve(process.argv[3] ?? `${here}/DEMO_KEY_REGISTRY.json`);
  try {
    const [bundleText, registryText] = await Promise.all([
      readFile(bundlePath, "utf8"),
      readFile(registryPath, "utf8"),
    ]);
    const report = await verifyBundle(bundleText, registryText);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.valid ? 0 : report.failure_code?.startsWith("MALFORMED") ? 2 : 1;
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify(
        {
          verifier_version: VERIFIER_VERSION,
          verdict: "INVALID_OR_UNTRUSTED",
          valid: false,
          failure_code: "MALFORMED_INPUT",
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      )}\n`,
    );
    process.exitCode = 2;
  }
}

if (
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  await runCli();
}
