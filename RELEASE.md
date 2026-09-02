# Releasing witnessops-web

Status: `PUBLIC_CONTRIBUTOR_RELEASE_BOUNDARY`

This public document describes repository validation only. Detailed production publication, deployment, rollback, host, credential, and operator procedures are kept in restricted operator custody.

## Repository release boundary

- Use the Node version pinned by `.nvmrc` and the package-manager version required by the repository.
- `pnpm health` is the full repository health gate.
- `pnpm release` is a **build-only** release entrypoint. Passing it does not prove that an image was published, a deployment occurred, or production changed.
- When buyer-visible routes, copy, links, forms, or proof surfaces change, run the relevant focused buyer-path checks in addition to the full repository gate.
- Start release-quality validation from an exact source commit and do not silently treat uncommitted changes as a production candidate.

## Deployment boundary

A merge, successful build, green CI run, generated artifact, or mutable image tag is not production deployment evidence.

Production publication/deployment requires separate explicit operator authorization and release-specific evidence. DNS, edge/proxy changes, credential rotation, new application-surface exposure, and verification/signing trust changes are separate authority lanes.

Executable release/deployment workflows may remain in this repository where required by CI or identity-bound release trust. Their definitions are not evidence that a particular run succeeded.

## Public evidence language

Do not describe an image, SBOM, release artifact, signature, receipt, workflow, or deployment as produced unless the named mechanism actually produced it and the result can be identified.

Detailed operator release, production smoke, and rollback procedures are maintained outside the public product documentation surface.
