# WitnessOps Web

Public web surface for WitnessOps.

This repository contains the public WitnessOps site, the `/verify` route for
checking proof bundles, and the `/api/verify` endpoint behind that flow.

## What this repository does

- Shows the public WitnessOps pages.
- Lets anyone check a proof bundle through `/verify`.
- Exposes the same verification path through `/api/verify` for programmatic use.
- Returns deterministic verification results for the same bundle input.

## What this repository does not do

- It is not the control plane.
- It does not issue or sign bundles.
- It is not the system that runs customer workflows.
- It does not store customer data as part of normal verification.

## Verify a bundle

Open <https://witnessops.com/verify>, drop in a bundle, and read the result.
Programmatic callers can post the same bundle to `/api/verify` and receive the
same verification path and result shape.

## Security

For vulnerability disclosure, see [`SECURITY.md`](./SECURITY.md).

## Contributors

- Local validation: `pnpm health` (build, lint, typecheck, tests, route parity, receipt smoke).
- Frozen command contract: [`commands.md`](./commands.md).
