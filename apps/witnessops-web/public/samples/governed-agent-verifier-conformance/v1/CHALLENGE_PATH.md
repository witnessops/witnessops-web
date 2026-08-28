# Challenge path

Run from this directory:

```sh
sha256sum -c MANIFEST.sha256
node verify.mjs
```

Expected offline artifact verdict: `ARTIFACT_SET_CONSISTENT`. This command
checks the public artifact set only; it does not inspect runtime source,
catalogue metadata, repository tests, or deployment.

The separate repository conformance gate is run from the repository root:

```sh
pnpm verify:skill-contract
```

To challenge the exact-byte binding, copy either SKILL.md snapshot, change one
byte without changing its length, update no hashes, and rerun the equivalent
SHA-256 comparison. The mutated bytes must not match the receipt.

The post-merge GitHub workflow runs both checks above before signing the exact
`RECEIPT.json` bytes and a companion source-binding attestation with GitHub OIDC
and Sigstore. The companion names the checked `GITHUB_SHA`, workflow run, and
exact receipt SHA-256. Those signatures identify the workflow and checked
revision; they do not independently prove the receipt claims or production
deployment.
