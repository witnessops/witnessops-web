# WitnessOps Web

Public web surface for WitnessOps.

This repository contains the public WitnessOps site, the receipt-first `/verify`
route, the `/api/verify` endpoint behind that flow, public buyer/review pages,
and sample proof-surface pages used to explain artifact inspection boundaries.

## What this repository does

- Shows the public WitnessOps pages.
- Lets anyone check receipt JSON through `/verify`.
- Exposes the same receipt-first verification path through `/api/verify` for programmatic use.
- Returns deterministic verification results for the same receipt input.
- Provides buyer-facing proof-run, sample-case, docs, support, pricing, library, and legal/security surfaces.
- Presents the AI Agent Action Proof Run sample with pinned artifact links, manifest provenance, visible artifact digests, and buyer-path smoke coverage.
- Documents the current public hosting custody in [`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md) and [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md). OffSec-Lane copy: `working/sources/witnessops-web/README-LANE.md`.

## What this repository does not do

- It is not the control plane.
- It does not issue or sign receipts or proof bundles.
- It is not the system that runs customer workflows.
- It does not store customer data as part of normal verification.
- It does not recompute individual source artifact hashes for the external sample repo locally.
- It does not prove production deployment, legal compliance, source-system truth, or complete AI governance coverage.
- Public positioning category (working): bounded independent verification of consequential AI and security work—one activity reconstructed (authorized, executed, observed, unresolved); not a whole-environment or GRC replacement.
- It does not use Azure Container Apps, `azd`, or root Bicep files as active deployment authority.

## Product governance

All user-facing workflows follow the
[Usability-First Invisible-Proof Principle](./docs/product-decisions/WITNESSOPS_USABILITY_FIRST_INVISIBLE_PROOF_PRINCIPLE_V1.md):
**Easy in the foreground. Reconstructable in the background.** The linked
decision record is the canonical authority for this product rule.

## Deployment authority

Deployment guidance lives in [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md).

Current repo boundary:

- active public website runtime: Caddy on `ops-dev-01` reverse-proxying to the k3s `witnessops-web` deployment
- active app runtime inputs: app source, package scripts, Dockerfile, environment examples, and validation commands
- retired Azure archive: `docs/archive/azure-aca-retired-20260508/`

The full source-to-runtime custody map, including image custody, verification,
and rollback expectations, lives in [`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md).

The archived Azure material is historical reference only. Do not run Azure
commands, restore Azure deployment paths, or treat the archive as rollback
authority without a separate explicit Azure reopening lane.

## Verify a receipt

Open <https://witnessops.com/verify>, upload a receipt `.json` or paste the JSON, and
read the result. A valid result confirms the checks named in the receipt; it does
not prove that every underlying action was correct.

Programmatic callers can post the same receipt to `/api/verify` and receive the
same verification path and result shape. Proof-bundle uploads are not accepted on
the public surface — see the verification docs for offline package checks.

## Public proof-surface contract

The AI Agent Action Proof Run sample lives at:

```text
apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/
```

The local web-side artifact contract is:

```text
sample-artifact-contract.ts
```

That contract records the pinned external sample identity, manifest provenance,
artifact names, artifact URLs, displayed digests, and displayed-vs-manifest-hashed
artifact relationship. The page and source tests should read from that contract
rather than duplicating commits, digests, or sample URLs.

Current boundary: this repository records and displays pinned external manifest
provenance for the sample, but a separate cross-repo verification lane is needed
before claiming that `witnessops-web` independently recomputes the external
sample artifact bytes.

## Security

For vulnerability disclosure, see [`SECURITY.md`](./SECURITY.md).

## Contributors

- Local validation: `pnpm health` (build, lint, typecheck, tests, route parity, receipt smoke, buyer-path smoke).
- Public buyer/proof-surface validation: `pnpm smoke:buyer-path:test`.
- Frozen command contract: [`commands.md`](./commands.md).
- Deployment authority: [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md).
- Repository-local docs index: [`docs/README.md`](./docs/README.md).
- Root/subtree authority-file inventory and stale-file deletion gate: [`docs/ROOT_SURFACE_INVENTORY.md`](./docs/ROOT_SURFACE_INVENTORY.md).
- Agent instructions: [`AGENTS.md`](./AGENTS.md) and [`apps/witnessops-web/AGENTS.md`](./apps/witnessops-web/AGENTS.md).
