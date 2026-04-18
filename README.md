# WitnessOps Web

Portable proof for governed security work.

WitnessOps turns governed security workflows into signed, portable proof bundles
that anyone with the bundle can independently verify.

This repository is the public web surface for WitnessOps — the marketing site,
the `/verify` route for verifying received proof bundles, and the `/api/verify`
endpoint that backs it.

## What this repository proves

- A bundle dropped into `/verify` produces a deterministic verification result.
- The `/api/verify` route is the same verification path, available to programs.
- No sign-in is required to verify a bundle.

## What this repository does not claim

- It is not the control plane.
- It does not issue or sign bundles.
- It does not store customer data.

## Verifying a bundle

Visit <https://witnessops.com/verify>, drop in a bundle, and read the result.
Programmatic callers can post the same bundle to `/api/verify` and receive the
same result.

## Security

For vulnerability disclosure, see [`SECURITY.md`](./SECURITY.md).

## Contributors

- Local validation: `pnpm health` (build, lint, typecheck, tests, route parity, receipt smoke).
- Frozen command contract: [`commands.md`](./commands.md).
