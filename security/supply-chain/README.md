# Supply Chain Gate data

`emergency-iocs.tsv` contains exact, temporary campaign overrides. External OSV
and GitHub advisory coverage remains separate; this file closes urgent feed lag
without copying a complete third-party database into Git.

`lifecycle-reviews.tsv` records a separate decision for each exact
package/version/lifecycle-phase/script-text SHA-256 tuple returned by the npm
registry. An approval does not transfer to another package with identical script
text and does not survive a script-text change. The source and short note record
the package-specific review rationale.

`vendored-artifact-reviews.tsv` is the sole exception to the general
non-registry-source prohibition. It may approve one exact npm package tarball
tuple: package name, version, canonical repository-relative `.tgz` path, and
SHA-256. Wildcards, directories, symlinks, remote sources, Git sources, links,
and patches are not supported by this mechanism.

For a pull request, approval authority is read from the exact comparison-base
revision. Approval metadata added or changed by the pull-request head is
validated for syntax but cannot authorize a dependency introduced by that same
head. Establish an approval on authoritative `main` before a later dependency
PR consumes the artifact.

The gate hashes and inspects an approved tarball without installing it,
executing lifecycle scripts, or extracting it to disk. It requires a regular
non-symlink file under the repository root, canonical archive member paths,
`package/package.json`, matching package name and version, an exact pnpm
importer/package tuple, and lockfile SHA-512 integrity matching the reviewed
artifact bytes.

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
  as `BLOCKED` was found. Git, remote-tarball, arbitrary file/directory, link,
  patch, and other non-registry dependency sources are unsupported and fail
  closed. The only supported local source is an exact comparison-base-approved
  repository-local `.tgz` tuple from `vendored-artifact-reviews.tsv`. pnpm
  `patchedDependencies` remain unsupported;
- `COVERAGE DEGRADED`: required external data was unavailable or unverifiable.

The detailed result and canonical package graph are written under
`artifacts/supply-chain-gate/`. The gate reads package metadata; it does not
install packages or execute lifecycle scripts.

GitHub dependency review provides pull-request GitHub Advisory Database
enforcement. The OSV query covers its documented GitHub Advisory Database,
OpenSSF Malicious Packages, and npm upstreams. npm registry version metadata is
used only for static lifecycle-script review.
