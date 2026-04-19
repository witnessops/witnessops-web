# WitnessOps Web

Public web surface for WitnessOps.

This repository contains the public WitnessOps site, the `/verify` route for
checking receipt JSON, and the `/api/verify` endpoint behind that flow.

## What this repository does

- Shows the public WitnessOps pages.
- Lets anyone check receipt JSON through `/verify`.
- Exposes the same receipt-first verification path through `/api/verify` for programmatic use.
- Returns deterministic verification results for the same receipt input.

## What this repository does not do

- It is not the control plane.
- It does not issue or sign receipts or proof bundles.
- It is not the system that runs customer workflows.
- It does not store customer data as part of normal verification.

## Verify a receipt

Open <https://witnessops.com/verify>, paste receipt JSON or upload a receipt `.json`, and read the result.
Programmatic callers can post the same receipt to `/api/verify` and receive the
same verification path and result shape.

`/verify` currently runs in receipt-first v1 mode. Proof-bundle uploads are documented in the docs, but they are not accepted by the public verifier surface.

## Security

For vulnerability disclosure, see [`SECURITY.md`](./SECURITY.md).

## Contributors

- Local validation: `pnpm health` (build, lint, typecheck, tests, route parity, receipt smoke).
- Frozen command contract: [`commands.md`](./commands.md).
