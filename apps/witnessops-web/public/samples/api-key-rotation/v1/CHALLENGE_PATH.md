# Challenge Path — Compromised API Key Rotation

Sample ID: `COMPROMISED_API_KEY_ROTATION_SAMPLE_V1`

## Reproduce the accepted result

1. Check `MANIFEST.sha256` against the package bytes.
2. Load `DEMO_KEY_REGISTRY.json` separately from `BUNDLE.wops.json`.
3. Match the receipt's key ID, Ed25519 algorithm, purpose, status, and full SPKI
   SHA-256 fingerprint.
4. Remove `signature` from the parsed receipt, canonicalize with sorted JSON
   keys and compact separators, and verify the 64-byte Ed25519 signature.
5. Canonicalize `EVIDENCE_MANIFEST.json` and compare its SHA-256 with the signed
   receipt's `manifest_hash`.
6. Hash every exact evidence file and compare the path, byte count, and digest.
7. Resolve every receipt evidence reference to one manifest artifact.
8. Reconstruct authority, target, operation order, dual-active interval,
   canaries, revocation, and final state from the evidence.

## Required negative outcomes

| Challenge | Required outcome |
|---|---|
| Change one receipt field | `SIGNATURE_INVALID` |
| Replace the key and re-sign | `UNTRUSTED_SIGNER` |
| Change one evidence byte | `ARTIFACT_DIGEST_MISMATCH` |
| Remove or duplicate evidence | `BUNDLE_INVALID` |
| Add an absolute or traversal path | `BUNDLE_INVALID` |
| Execute before or after authority | `AUTHORITY_SEQUENCE_INVALID` |
| Add an unapproved operation or target | `SCOPE_VIOLATION` |
| Reuse the old fingerprint as the replacement | `ROTATION_IDENTITY_INVALID` |
| Leave the consumer on the old key | `MIGRATION_NOT_CONFIRMED` |
| Let the old-key post-revocation probe succeed | `OLD_KEY_STILL_ACCEPTED` |
| Include credential material | `SECRET_MATERIAL_PRESENT` |

## Trust boundary

The demo registry is a purpose-limited public trust input. It is not a production
key registry or organization-wide trust root. A website compromise could replace
the page, bundle, verifier, and key together, so a high-assurance reviewer should
compare the key fingerprint and verifier source with the exact public Git commit
linked by the deployed page.

This package is synthetic. It must be rejected if represented as proof of a real
compromise, real provider rotation, production key custody, compliance, or whole-
environment security.
