# WitnessOps web app subtree instructions

This subtree contains live WitnessOps web app logic, not canonical public proof law.

## Skill routing

- For proof-shaped changes, route through `proof-constitutional-guardian` first.
- For auth/session changes, route through `auth-identity-security`.
- For security review, route through `app-pentest`.

## Rules

- The live app owns `/verify` and `/api/verify`.
- Reuse shared proof/package contracts from `packages/proof` — do not invent local proof structures.
- Keep operator concerns, public-user concerns, and proof concerns distinct.
- Check auth/session and receipt-shaped changes carefully for trust boundary violations.
- Do not expose internal-only proof details through operator-facing surfaces.
- Keep comments and docs aligned with the live repository name `witnessops-web`.

## Terminology

Use the repo standard terms:
- `canonical verification` — ADR-001 file-bundle verification
- `legacy JSON structural verification` — hosted JSON compatibility path
- `proof bundle` — generic product artifact term

## Required checks

After changes here:
```bash
pnpm health
```

If changes touch receipt or proof-shaped data, also run:
```bash
pnpm --filter @witnessops/proof test
```
