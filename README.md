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

## What this repository does not do

- It is not the control plane.
- It does not issue or sign receipts or proof bundles.
- It is not the system that runs customer workflows.
- It does not store customer data as part of normal verification.
- It does not recompute individual source artifact hashes for the external sample repo locally.
- It does not prove production deployment, legal compliance, source-system truth, or complete AI governance coverage.

## Verify a receipt

Open <https://witnessops.com/verify>, paste receipt JSON or upload a receipt `.json`, and read the result.
Programmatic callers can post the same receipt to `/api/verify` and receive the
same verification path and result shape.

`/verify` currently runs in receipt-first v1 mode. Proof-bundle uploads are documented in the docs, but they are not accepted by the public verifier surface.

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
- Repository-local docs index: [`docs/README.md`](./docs/README.md).
- Agent instructions: [`AGENTS.md`](./AGENTS.md) and [`apps/witnessops-web/AGENTS.md`](./apps/witnessops-web/AGENTS.md).
