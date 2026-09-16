# GHCR exact-image acceptance

Both operator-triggered GHCR publication paths use one Linux/amd64 OCI archive.
The standalone build remains separate. Publication does not authorize deployment.

1. Resolve source, dependency-gate source and checkout to the same commit.
2. Build once, recording archive SHA-256, OCI manifest digest and config digest.
3. In a contents-read verifier, use verification code checked out at
   `github.workflow_sha`, inspect the archive and run the existing independent
   OS/npm Trivy policy. No candidate code runs here.
4. Bind the original JSON report and archive to source, workflow revision,
   run/attempt and platform. Expected hashes come from job outputs.
5. Revalidate the complete handoff before registry writes. Import to
   `candidate-<run>-<attempt>-<source>`; independently hash registry manifest and
   config bytes and resolve the reference.
6. Only after parity succeeds, generate/attach the existing SBOM and perform
   existing keyless signing and signature verification.
7. Promote the same digest to the existing consumer tags, independently reading
   back each. Never rebuild or run the candidate in the publisher.

The policy remains `deploy/aws/validate-trivy-image.mjs`: critical/high block,
including unfixed findings; medium/low/unknown remain in the original report.
Missing coverage, invalid reports and filtered findings fail closed. Inherited
`TRIVY_*` settings are removed before invoking the shared scanner. Available
database metadata is retained; unavailable database metadata is explicitly null,
not invented. Scanner errors never yield an accepted handoff.

**Reruns:** rerun all jobs. Build run/attempt must equal verifier and publisher
execution context. A partial rerun cannot substitute a previous attempt's
artifact. Accepted-artifact names also include run and attempt.

**Failure:** uploads may leave a run-specific candidate or partially promoted
tags. Always-collected `registry-*.json` records attempted and verified references.
A failed run is not evidence of no registry writes. There is no automatic deletion.
Consumer tags are promoted sequentially, not atomically.

## Compatibility and local validation

The handoff is now OCI, not Docker-save format. Consumers must use the shared OCI
inspector and manifest-preserving regctl transport; `docker load` and push-log
digest parsing are no longer part of publication. Single-platform output disables
BuildKit provenance/SBOM index attachments; the existing GHCR SBOM and keyless
signature operations remain. AWS workflows and helpers are unchanged.

Run `pnpm deploy:ghcr:test` on Node 22. It is included in the existing every-PR
health gate. Run the existing supply-chain workflow-contract tests and actionlint
for both changed workflows.

For an explicit loopback integration test, install regctl v0.11.6 and
go-containerregistry's registry v0.20.6 outside the repo, then run:

```sh
REGCTL=/path/to/regctl REGISTRY_BINARY=/path/to/registry \
  node deploy/ghcr/local-registry-check.mjs
```

This command starts a localhost-only registry on an ephemeral port, transfers a
synthetic non-executable OCI fixture using the actual publication orchestrator,
checks manifest/config bytes and promoted tags, and injects a readback mismatch
to verify promotion stops. It destroys the test registry afterward. Optional
`EVIDENCE_DIR` writes a sample binding, failure journal and parity result.
The fixture's Trivy JSON is synthetic validator input, not a real image scan.

Local tests do not establish live GHCR permissions, scanner/database availability,
GitHub artifact/output transport or OIDC acceptance. Those require a separately
authorized live workflow execution; repository settings are outside this patch.
