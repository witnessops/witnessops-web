# Buyer walkthrough — WitnessOps Local Server Audit

Proof run: `pr_lsa_20260710120000_198fd7aceb`

## Files you should receive

- `proofpack-pr_lsa_20260710120000_198fd7aceb.zip` — deterministic proofpack bytes
- `proofpack-pr_lsa_20260710120000_198fd7aceb.zip.sha256` — transport digest
- `proofpack-pr_lsa_20260710120000_198fd7aceb.zip.sig.json` — detached Ed25519 signature over the ZIP digest
- a WitnessOps trust registry obtained through a channel separate from the proofpack

## Independent reconstruction

1. Place the ZIP, signature, and separately obtained trust registry in an offline workspace.
2. Run `witnessops-local-audit verify --proofpack proofpack-pr_lsa_20260710120000_198fd7aceb.zip --signature proofpack-pr_lsa_20260710120000_198fd7aceb.zip.sig.json --trust-registry trusted-keys.json`.
3. Require exit code `0` and result `status: valid`.
4. Inspect `outcome`: `pass` means every required v1 section was complete; `partial` names required collection gaps. Neither is a host-security grade.
5. Inspect every named check. A skipped check is not a passed check.
6. Read `report.md`, `findings.json`, `posture.json`, `evidence/collection-completeness.json`, and the declared exclusions.
7. Challenge any source observation, authority declaration, finding rule, or trust assumption that cannot be reconstructed.

## Meaning of `valid`

`valid` means the delivered bytes, signer binding, receipt, manifest, artifact hashes, and collection-outcome semantics passed the named verifier checks. It does not mean the host is secure, uncompromised, or compliant.
