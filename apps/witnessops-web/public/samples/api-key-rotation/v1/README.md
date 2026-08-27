# Compromised API Key Rotation — Signed Synthetic Specimen

Sample ID: `COMPROMISED_API_KEY_ROTATION_SAMPLE_V1`

Status: `signed_synthetic_specimen`

## The 17-second story

A synthetic detector flags one API-key fingerprint as exposed. A remediation
agent proposes an exact contract. A synthetic security owner authorizes only
that contract. The rotation tool then:

1. creates a distinct replacement without reading or exporting secret material;
2. moves one synthetic consumer to the replacement;
3. proves the replacement is accepted;
4. revokes the old credential;
5. proves the old credential is rejected; and
6. performs a separate final-state read-back.

The receipt is cryptographically signed with a purpose-limited Ed25519 demo key.
The evidence manifest binds every public artifact by SHA-256. The website and
downloadable verifier recompute the signature, published-key match, artifact
hashes, evidence references, and rotation semantics rather than trusting
`VERIFY_RESULT.json`.

## What is independently checkable

- The receipt signature is mathematically valid for the canonical unsigned
  receipt under the separately published demo public key.
- The demo-key fingerprint matches the purpose-limited public registry.
- The receipt's manifest hash matches the canonical evidence manifest.
- Every exact evidence file matches its declared SHA-256 digest.
- Every receipt claim resolves to named evidence.
- The included synthetic evidence supports the declared authority, target,
  action order, consumer migration, replacement-key acceptance, old-key
  revocation, old-key rejection, and final state.
- The package contains identifiers and fingerprints only, never credential
  values.

## What this does not prove

This is a deterministic synthetic demonstration. No real provider, credential,
compromise, customer, or production system was used or checked. A valid
signature establishes integrity under the published demo key; it does not
establish source-system honesty, production signing-key custody, legal
compliance, or whole-environment security.

The replay on the website presents this already-signed run. Clicking replay does
not approve or execute a new action.

## Package

| File | Purpose |
|---|---|
| `ACTION_BOUNDARY.json` | Exact target, allowed/prohibited operations, success, timeout, rollback, and recovery |
| `AUTHORITY_MAP.json` | Distinct proposer, approver, executor, verifier, and single-use authority |
| `evidence/ALERT.json` | Synthetic exposure alert with fingerprint only |
| `evidence/BEFORE.json` | Initial synthetic provider and consumer state |
| `evidence/EVENTS.ndjson` | Ordered mutation, probe, revocation, and read-back events |
| `evidence/AFTER.json` | Independent synthetic final-state read-back |
| `evidence/CHECKS.json` | Reference expectations; never trusted as the verifier result |
| `EVIDENCE_MANIFEST.json` | Canonical evidence inventory and SHA-256 bindings |
| `RECEIPT.json` | Canonical WitnessOps profiled receipt with Ed25519 signature |
| `DEMO_KEY_REGISTRY.json` | Purpose, status, public key, and SPKI fingerprint |
| `DEMO_PUBLIC_KEY.pem` | Public verification key; no private key is retained |
| `BUNDLE.wops.json` | Single-file portable bundle containing exact receipt and evidence bytes |
| `VERIFY_RESULT.json` | Reference output for comparison, not verification authority |
| `MANIFEST.sha256` | Drift check for the complete published package |

## Verify

From this directory:

```bash
shasum -a 256 -c MANIFEST.sha256
```

Public browser verification and the dependency-free offline verifier are served
from the WitnessOps sample page:

`https://witnessops.com/review/sample-cases/ai-agent-action-proof-run`

## Producer provenance

The receipt uses the canonical receipt profile in
`witnessops-contracts@444a2f93ee8d46009f5c737e9d6dfb231b1587fc` and the exact
canonicalization/signing convention documented by
`witnessops-proof-engine@14eeb9b05d2eadde7bced0d5e41122c2bca27d07`:
sorted JSON keys, compact separators, the unsigned receipt only, Ed25519, and
hex-encoded raw signature bytes.

The purpose-limited demo keypair was generated in memory for this specimen. The
private key was never written to this repository and was not persisted after
generation.
