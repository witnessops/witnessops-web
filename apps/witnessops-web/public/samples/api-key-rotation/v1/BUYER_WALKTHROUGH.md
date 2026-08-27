# Buyer Walkthrough — Compromised API Key Rotation

## Start with the claim

For one fixed synthetic run, the bundle says that scoped authority preceded a
credential rotation, a distinct replacement worked before revocation, one
consumer migrated, the old credential was revoked and then rejected, and a
separate state read-back observed the intended final state.

The verifier can establish that this claim follows from the included signed
synthetic artifacts. It cannot establish that a real provider action occurred.

## Read it in five minutes

1. Open `ACTION_BOUNDARY.json`. Confirm the exact synthetic tenant, consumer,
   old-key fingerprint, allowed operations, prohibited operations, timeout,
   termination, rollback, and recovery path.
2. Open `AUTHORITY_MAP.json`. Confirm the approval is single-use, target-bound,
   operation-bound, and timestamped before the first execution event.
3. Compare `evidence/BEFORE.json`, `evidence/EVENTS.ndjson`, and
   `evidence/AFTER.json`. Confirm the replacement becomes active, the consumer
   moves, the new-key probe returns 200, the old key is revoked, the old-key
   probe returns 401 `credential_revoked`, and the read-back observes the same
   final state.
4. Open `RECEIPT.json` and `EVIDENCE_MANIFEST.json`. Confirm the receipt names
   its bounded claims and the manifest artifact IDs that support each one.
5. Use the website verifier or downloadable `verify.mjs`. It independently
   recomputes the public-key fingerprint, Ed25519 signature, manifest hash,
   evidence hashes, claim references, and semantic state transition.

## Result labels

| Result | Meaning |
|---|---|
| Signature math: PASS | The canonical unsigned receipt matches the Ed25519 signature. |
| Published demo key: PASS | The signing key matches the separately loaded purpose-limited key registry. |
| Evidence integrity: PASS | Every supplied evidence byte matches the signed manifest path and hash. |
| Rotation semantics: PASS | The verifier reconstructed all declared synthetic state-transition checks. |
| Real provider checked: NO | No real provider, credential, or production system was contacted. |

## Why this is stronger than a screenshot or log dump

A screenshot can show a success message. A log can assert that a call happened.
This package makes the evidence set, method, signer, limitations, and failure
conditions explicit, then lets another party run the same checks without
trusting the animation or the precomputed result.

## What to challenge

Reject or mark the package inconclusive if the key is unknown, the signature
fails, evidence is missing or changed, a claim points to missing evidence,
authority is late or mismatched, an unapproved operation appears, the
replacement is not distinct, the new credential fails, the old credential still
works, the final state disagrees, or credential material appears.

For a real paid review, submit only non-secret scoping information first: the
workflow owner, system, consequential action, authority path, safe evidence
sources, and exclusions. Never submit live secrets through this public sample.
