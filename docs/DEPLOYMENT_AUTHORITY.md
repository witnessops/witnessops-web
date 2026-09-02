# Deployment boundary

Status: `PUBLIC_BOUNDARY_AND_EXECUTABLE_CLASSIFICATION`

This public repository contains the WitnessOps web product source. It is not a public operator handbook and this document is not deploy approval, production verification, cloud inventory, rollback approval, or server-administration authority.

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
| `.github/workflows/aws-release.yml` and `.github/workflows/aws-release-reusable.yml` | **Active routine release/deployment source contract.** Use still requires an explicit authorized dispatch/approval path; merge alone does not run production deployment. The reusable workflow path participates in identity/trust constraints and must not be moved or renamed as incidental cleanup. |
| `deploy/aws/**` | **Active deployment source/validation contract.** Contains reviewable AWS/OIDC/ECR/SSM/host-adapter source; source presence is not execution approval or evidence of live resource state. |
| `deploy/k8s/**` and retained `deploy/scripts/k3s-*` helpers | **Retained runtime/dev/recovery source.** Direct production invocation is not the routine production authority; distinguish read-only/dev/recovery behavior by the executable source and the non-public operator runbook. |
| `.github/workflows/release.yml` and `.github/workflows/build-image.yml` | **Artifact/build/repository-release surfaces, not routine production runtime deployment authority.** A successful artifact workflow does not prove `witnessops.com` changed. |
| legacy Compose/GHCR direct-deploy helpers and retired Azure deployment material | **Historical/retired for routine production.** Do not reactivate as a shortcut without a separately authorized reopening decision. |

Executable source may remain in this repository where required by CI, recovery, or identity-bound release trust. Its presence is not evidence that a particular workflow ran or that a particular release is live.

Retired deployment material is historical reference only and must not be reactivated without a separately authorized reopening lane.
