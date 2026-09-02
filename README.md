# WitnessOps Web

Public web surface for WitnessOps.

This repository contains the public WitnessOps site, the receipt-only `/verify`
route, the `/api/verify` endpoint behind that flow, public buyer/review pages,
and sample proof-surface pages used to explain artifact inspection boundaries.

## What this repository does

- Shows the public WitnessOps pages.
- Lets anyone check receipt JSON through `/verify`.
- Exposes the same receipt-only verification path through `/api/verify` for programmatic use.
- Exposes public WitnessOps documentation and bounded guidance to ChatGPT and
  other MCP clients through the stateless Streamable HTTP `/mcp` endpoint.
- Returns deterministic verification results for the same receipt input.
- Provides buyer-facing proof-run, sample-case, docs, support, pricing, library, and legal/security surfaces.
- Presents the AI Agent Action Proof Run sample with pinned artifact links, manifest provenance, visible artifact digests, and buyer-path smoke coverage.
- Documents the current public hosting custody in [`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md) and [`docs/DEPLOYMENT_AUTHORITY.md`](./docs/DEPLOYMENT_AUTHORITY.md). Historical lane notes: [`README-LANE.md`](./README-LANE.md).

## What this repository does not do

- It is not the control plane.
- It does not issue or sign customer or production verification receipts or proof bundles. A CI canary workflow emits and keyless-signs a public-manifest diff to test repository release evidence.
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

- active public website runtime: Caddy reverse-proxying to a private k3s deployment; topology is injected from operator custody
- active app runtime inputs: app source, package scripts, Dockerfile, environment examples, and validation commands
- retired Azure archive: `docs/archive/azure-aca-retired-20260508/`

The full source-to-runtime custody map, including image custody, verification,
and rollback expectations, lives in [`docs/DEPLOYMENT_CUSTODY.md`](./docs/DEPLOYMENT_CUSTODY.md).

The archived Azure material is historical reference only. Do not run Azure
commands, restore Azure deployment paths, or treat the archive as rollback
authority without a separate explicit Azure reopening lane.

## Verify a receipt

Open <https://witnessops.com/verify>, upload a supported receipt `.json` or paste
the JSON, and read the result. The current example is `indeterminate`: the
receipt-only checks run, but required artifact bytes are not independently
checked. Receipts using the legacy-named `public_exposure_review` profile also remain `indeterminate` while the
full evidence, workflow, signature, and production trust checks are incomplete.

Programmatic callers can post the same receipt to `/api/verify` and receive the
same verification path and result shape. Proof-bundle uploads and caller-supplied
trust inputs are not accepted on the public surface. Full-package verification is
a separate internal path and is not currently a supported public distribution.

## ChatGPT / MCP app

The production app endpoint is designed to be `https://witnessops.com/mcp`.
It exposes three public, read-only tools:

- `search` — find public WitnessOps documentation.
- `fetch` — retrieve a selected document with its canonical citation URL.
- `ask_witnessops` — return bounded deterministic guidance without claiming
  that a private system, customer evidence, or receipt was verified.

Run locally with `pnpm dev`, then connect MCP Inspector to
`http://127.0.0.1:3001/mcp`. Production exposure and ChatGPT app connection
remain separate explicit apply steps under the deployment authority contract.

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
