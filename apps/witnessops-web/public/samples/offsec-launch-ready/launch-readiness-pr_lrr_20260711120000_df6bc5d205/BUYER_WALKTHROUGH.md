# Buyer walkthrough — WitnessOps Launch Readiness Review

Proof run: `pr_lrr_20260711120000_df6bc5d205`

## Start here

1. Read `review-summary.json` for the owner-facing signal.
2. Read `drift.json` to see every admitted v1 change between baseline and candidate.
3. Read `findings.json` and `report.md` for candidate posture and named limits.
4. Treat the result as evidence for the named decision owner, never as automatic launch approval.

## Verify independently

- `proofpack-pr_lrr_20260711120000_df6bc5d205.zip` — deterministic proofpack
- `proofpack-pr_lrr_20260711120000_df6bc5d205.zip.sha256` — transport digest
- `proofpack-pr_lrr_20260711120000_df6bc5d205.zip.sig.json` — detached Ed25519 signature over the ZIP digest
- a WitnessOps trust registry obtained separately from the proofpack

Run:

`witnessops-launch-ready verify --proofpack proofpack-pr_lrr_20260711120000_df6bc5d205.zip --signature proofpack-pr_lrr_20260711120000_df6bc5d205.zip.sig.json --trust-registry trusted-keys.json`

Require exit code `0`, `status: valid`, and all named checks passed. `valid` means the delivered bytes, baseline and final signer bindings, receipt, manifest, artifacts, snapshot relationship, and deterministic drift reconstructed. It does not mean the launch is secure, production-ready, approved, or compliant.
