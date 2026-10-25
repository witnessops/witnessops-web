# Deployment boundary

Status: `PUBLIC_BOUNDARY_AND_EXECUTABLE_CLASSIFICATION`

This public repository contains the WitnessOps public website and authenticated app source. It is not a public operator handbook and this document is not deploy approval, production verification, cloud inventory, rollback approval, or server-administration authority.

## Publicly stated boundary

- A merge to `main` does **not** itself authorize or perform a production deployment.
- Production publication and deployment require a separate explicit operator action through protected, identity-bound release controls.
- Runtime artifacts are promoted by immutable identity rather than by treating a mutable tag as proof of what is live.
- Production state claims require release-specific deployment/runtime evidence; repository prose and green CI are not sufficient evidence.
- DNS, edge/proxy changes, credential changes, public exposure of additional application surfaces, and verification/signing trust changes are separate authority lanes.
- Host identity, cloud account identifiers, private network topology, Secret/key inventories, credential locations, rollback endpoints, operator commands, and detailed release procedures are intentionally kept outside the public product-documentation surface.

Detailed operator deployment authority and recovery procedures are maintained in restricted non-public custody.

## Tracked executable-path classification

This table is intentionally limited to authority classification. It does not publish host identity, cloud account details, Secret/key inventories, private topology, or operator commands.

| Tracked surface | Public authority classification |
| --- | --- |
| `.github/workflows/aws-release.yml` and `.github/workflows/aws-release-reusable.yml` | **Active routine website release/deployment source contract.** Use still requires an explicit authorized dispatch/approval path; merge alone does not run production deployment. The reusable workflow path participates in identity/trust constraints and must not be moved or renamed as incidental cleanup. |
| `deploy/aws/**` | **Active website deployment and shared image-validation source.** Contains reviewable AWS/OIDC/ECR/SSM/host-adapter source; source presence is not execution approval or evidence of live resource state. |
| [`deploy/app/`](../deploy/app/) | **Separate authenticated-app build/lifecycle and finalizer source.** Read the app README and selected app contracts. Do not treat the website release workflow or `pnpm release` as an app deployment path. Runtime grants, custody, migration compatibility, recovery and activation remain separately evidenced. |
| [`.github/workflows/app-validation.yml`](../.github/workflows/app-validation.yml) | **App acceptance and retained candidate artifacts, not production publication.** Builds an exact app OCI archive, scans/tests that candidate and checks its archive checksum before retention. A stored candidate or green check alone is not proof of provider acceptance or a running release. |
| `deploy/k8s/**` and retained `deploy/scripts/k3s-*` helpers | **Retained runtime/dev/recovery source.** Direct production invocation is not the routine production authority; distinguish read-only/dev/recovery behavior by the executable source and the non-public operator runbook. |
| `.github/workflows/release.yml` and `.github/workflows/build-image.yml` | **Artifact/build/repository-release surfaces, not routine production runtime deployment authority.** A successful artifact workflow does not prove `witnessops.com` changed. |
| legacy Compose/GHCR direct-deploy helpers and retired Azure deployment material | **Historical/retired for routine production.** Do not reactivate as a shortcut without a separately authorized reopening decision. |

## App candidate binding and host proxy source

The app lifecycle helper compares the human approval file with the CI candidate an operator copies. The comparison is local and unsigned. A missing file or a digest that does not match fails closed, before a container is removed or started, with exit status 78. The tracked unit lists that status in `RestartPreventExitStatus`, so systemd does not retry the mismatch. Other failures still restart after 15 seconds, at most 10 times in 5 minutes.

Operator copy, only after a separate decision to deploy:

1. From the successful app-validation run's `app-image-candidate` artifact, copy `identity.json` and `image.sha256` unchanged into `/etc/witnessops-app/ci-candidate/`.
2. Set `image-security-approved` so `imageConfig` is the on-host image ID and equals `image_digest` or `config_digest` from that `identity.json`, `archiveSha256` is the 64-character hex digest in `image.sha256` (the `image.tar` checksum, two spaces, then `image.tar`), and `vulnerabilities` and `secrets` are both 0.
3. Pass that same image ID to the lifecycle start and stop commands.

`identity.json` records the OCI manifest digest and the image config digest. `image.sha256` records the archive checksum. Those are different values. The helper does not re-hash `image.tar` and does not download the artifact. A new image ID needs a new CI candidate and a new approval record before the next start. Copying these files is not itself a deployment, and this repository change does not copy them onto a host.

`deploy/app/host/Caddyfile.app-witnessops` is source only. It overwrites `X-Forwarded-For` and `X-Real-IP` from the accepted connection and sets `X-Forwarded-Host` and `X-Forwarded-Proto` to fixed literals. It does not apply or reload Caddy.

## Distinguish validation, retained helpers and activation

Root `deploy:k3s:build`, `deploy:k3s:prod` and `deploy:k3s:both` point to
[`retired-production-deploy.mjs`](../deploy/scripts/retired-production-deploy.mjs),
which exits with an error. That does not classify every k3s helper or runtime
manifest as unused. Retained dev/status/recovery operations must be evaluated
individually; do not remove them or reactivate a production shortcut during docs
cleanup.

[`NODE22-BUILDER.md`](./NODE22-BUILDER.md) describes local source validation;
[`ALPINE-MESH.md`](./ALPINE-MESH.md) is a retained image-source reference.
Neither is a universal deployment recipe. Read current image pins, build steps
and identity checks from the selected executable source, rather than copying
historical command examples or assuming a shared base proves image equivalence.

This classification is source-derived. It neither claims all referenced paths
have been exercised nor establishes which image, providers or database schema
are running. No helper, workflow trust binding, image pin or runtime configuration
is changed by reconciling these documents.

Executable source may remain in this repository where required by CI, recovery, or identity-bound release trust. Its presence is not evidence that a particular workflow ran or that a particular release is live.

Retired deployment material is historical reference only and must not be reactivated without a separately authorized reopening lane.
