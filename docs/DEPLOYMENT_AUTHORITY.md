# Deployment authority

Status: `servury_active_azure_retired`
Last updated: 2026-05-23

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, or cloud inventory.

## Active hosting lane

The active WitnessOps web hosting lane is the clean server path on
Servury/edge02. This repository's active runtime inputs are the web app source,
package scripts, standalone Dockerfile, environment examples, and local
validation commands.

Provider-side server configuration, DNS operations, Caddy configuration,
secrets, billing, and host administration are outside this repository unless a
separate lane explicitly names those surfaces.

## Retired Azure lane

The Azure Container Apps material is retired and archived at:

```text
docs/archive/azure-aca-retired-20260508/
```

That archive contains the former root `azure.yaml` and `infra/**` Bicep files.
They are historical reference only. They are not active deploy inputs, rollback
authority, release authority, or instructions to run `azd`.

Do not use the archived Azure files for new work unless a separate explicit
Azure reopening lane names the allowed cloud surfaces, validation commands,
receipt requirements, and stop boundary.

## Review boundary

Changes to this deployment authority classification should remain separate from
public copy, verifier semantics, receipt semantics, release, and server-provider
mutation.

Any future PR that removes the archive entirely should include reference search
results, replacement authority, and the validation commands run.
