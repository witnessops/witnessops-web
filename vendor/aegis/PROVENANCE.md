# Vendored Aegis artifact

This directory holds a **distribution artifact**, not a fork.

- Package: `aegis-deterministic@2.0.0-cleanroom.3`
- Source: `VaultSovereign/Aegis` at `af967e166d44776675ed78e9fd68eda52c3d72ff`
- Remote CI: GitHub Actions run `32999353580`
- Artifact: `aegis-deterministic-2.0.0-cleanroom.3.tgz`
- SHA-256: `d438853a906de7949e3e476f7ca7c5589dcbd3d1f7d08e62b96d840900d046eb`

WitnessOps Web consumes this tarball as a `file:` package. It must not contain an editable copy of Aegis scanner source (`scan.ts`, `transfer.ts`, `canonicalize.ts`, policy tables, or rule tables).

Compiled verifier logic is expected to appear in the production browser bundle. That is the local-verification model, not a secrecy failure.

## Update rule

Aegis upgrades are explicit. Never auto-follow `main`. Never use an unpinned artifact.

1. Select a new accepted immutable Aegis SHA.
2. Fresh-checkout that SHA.
3. Run its acceptance suite (typecheck, 46 tests, build).
4. `npm pack`.
5. Calculate SHA-256 of the `.tgz`.
6. Replace the vendored artifact in this directory.
7. Update `manifest.json` and this file.
8. Run CLI/web parity for ledger-notes, cluster-ops, glyph-override, paste-exfil.
9. Review as an explicit WitnessOps Web dependency update.
