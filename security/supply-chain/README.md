# Supply Chain Gate data

`emergency-iocs.tsv` contains exact, temporary campaign overrides. External OSV
and GitHub advisory coverage remains separate; this file closes urgent feed lag
without copying a complete third-party database into Git.

`lifecycle-reviews.tsv` records a separate decision for each exact
package/version/lifecycle-phase/script-text SHA-256 tuple returned by the npm
registry. An approval does not transfer to another package with identical script
text and does not survive a script-text change. The source and short note record
the package-specific review rationale.
Inert acceptance data lives separately under `tools/supply-chain-gate/tests/fixtures`.

Run the gate from the repository root:

```bash
python3 tools/supply-chain-gate/supply_chain_gate.py \
  --lockfile pnpm-lock.yaml \
  --base-ref HEAD
```

Result states:

- `PASS`: all required local and network checks completed with no blocking match;
- `BLOCKED`: an exact malicious-package match, dependency/lock policy violation,
  same-version lockfile source/integrity change, newly introduced affected OSV
  record, unreviewed lifecycle script, or exact lifecycle tuple already recorded
  as `BLOCKED` was found. Git, remote-tarball, file, link, patch, and other
  non-registry dependency sources are unsupported and fail closed;
- `COVERAGE DEGRADED`: required external data was unavailable or unverifiable.

The detailed result and canonical package graph are written under
`artifacts/supply-chain-gate/`. The gate reads package metadata; it does not
install packages or execute lifecycle scripts.

GitHub dependency review provides pull-request GitHub Advisory Database
enforcement. The OSV query covers its documented GitHub Advisory Database,
OpenSSF Malicious Packages, and npm upstreams. npm registry version metadata is
used only for static lifecycle-script review.
