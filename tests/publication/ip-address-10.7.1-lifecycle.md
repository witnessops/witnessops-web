# ip-address 10.7.1 consumer lifecycle

Disposition: **NOT EXECUTED FOR PUBLISHED PACKAGE**.

Path: witnessops-web -> @modelcontextprotocol/sdk 1.32.1 ->
express-rate-limit 8.2.2 -> ip-address 10.7.1.

The candidate lockfile pins registry integrity
`sha512-4OUAqU9Z1i3vCnS05hzGiFnEMDpQ+62pAD/MVQOp83fYyNC8GleCqaS0QikQBmcWCrKFiUs/B8ztRRiYOAXuCA==`.
The downloaded registry tarball has SHA-256
`7f99ac7abda701afe1fd1e36de462236fb4d1eb8c595d7ae0267bba7d8ee55f8`
and contains 30 files: the licence, README, package manifest, and compiled
`dist/**` JavaScript, declarations, and source maps.

The published manifest declares no `preinstall`, `install`, or
`postinstall` hook. Its source `prepare` command is:

```text
git config core.hooksPath hooks || true
```

That command can mutate Git configuration and is not approved for source,
Git, local-directory, workspace, or arbitrary installation.

Two registry-consumer probes used the digest-pinned Node 22 deployment image,
Node 22.23.2, and pnpm 9.15.4 with lifecycle scripts enabled. A sentinel
`git` executable was first in `PATH`; any invocation would have created
an evidence record and failed the probe.

- Fresh registry install: PASS; Git invocations: 0; compiled module load: PASS.
- Frozen-lockfile registry install: PASS; Git invocations: 0; compiled module
  load: PASS.

pnpm 9.15.4's registry dependency build path excludes `prepare`; the
published artifact therefore needs no consumer build and does not execute the
Git-mutating command. The lifecycle approval is exact to this package,
version, phase, script hash, and registry source. It does not transfer to
another version or source type.

The registry reported 10.7.4 as available at review time and that version has
the same `prepare` command. It is outside this review.
