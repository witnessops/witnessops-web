# Claim boundary

**Synthetic worked example — not customer evidence.**

The named offline verifier checks receipt structure, detached signature, signer
trust-set membership, supported bridge identity, source hashes, hash-manifest
reconciliation for supplied artifacts, and declared authority references.

The bundled verifier and signer registry do not bootstrap their own trust.
Their expected hashes/key identities must be obtained and pinned through an
independent channel before a buyer executes or trusts them. Synthetic signer
registries are test-only.

It does not prove system security, assessment completeness, compliance,
third-party acceptance, operator honesty, or absence of vulnerabilities.
