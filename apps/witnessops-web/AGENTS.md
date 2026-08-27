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

## Deployment boundary

- This subtree owns app behavior, not cloud-provider authority.
- Do not add Azure, `azd`, Bicep, ACA, or provider-specific deployment wiring under this subtree unless a separate explicit Azure reopening lane authorizes it.
- Active dual-lane hosting is private k3s with topology injected from operator
  custody as classified by `../../docs/DEPLOYMENT_AUTHORITY.md`:
  - **prod** → public `https://witnessops.com` through Caddy
  - **mesh-dev** → the custodied private `MESH_DEV_URL`
- Deploy from monorepo root: `pnpm deploy:k3s:both` (shared image) or `deploy:k3s:prod` / `deploy:k3s:dev`. See root `AGENTS.md` and `deploy/scripts/k3s-*.sh`.
- Archived Azure material under `../../docs/archive/azure-aca-retired-20260508/` is historical reference only.

## Public proof-surface rules

- Public pages explain the proof model; they do not become proof authority unless tied to a named artifact, receipt, verifier result, or manifest.
- Do not describe a page as verified unless the verifier path or artifact proving that state is named.
- Keep sample, explanatory, live customer, legal/security, support, and admin surfaces separate.
- Buyer-visible proof markers must stay aligned with `scripts/smoke-buyer-path.ts`.
- Claim-boundary language must stay aligned with `src/app/public-claim-boundary.test.ts`.

## AI sample artifact contract

For `src/app/review/sample-cases/ai-agent-action-proof-run/`:

- Treat `sample-artifact-contract.ts` as the local web-side source of truth for pinned sample identity, manifest provenance, artifact names, artifact URLs, and displayed digests.
- Do not duplicate sample commit, manifest blob SHA, manifest text SHA-256, artifact digests, or GitHub sample URLs in page code when a contract field exists.
- Keep `artifact-links.test.ts` updated with any contract or page-rendering change.
- Preserve the distinction between the immutable source specimen, the exact same-origin mirror, the purpose-limited demo trust root, and the sample-specific verifier. `MANIFEST.sha256` is not self-listed.
- Current boundary: this app recomputes exact evidence bytes and the declared synthetic rotation transition for one fixed public specimen. It does not verify a real provider action, a real compromise, production signing-key custody, or source-system truth. `/verify` and `/api/verify` remain receipt-only.

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

If changes touch public buyer/proof-surface copy, also run:
```bash
pnpm smoke:buyer-path:test
```

If changes touch receipt or proof-shaped data, also run:
```bash
pnpm --filter @witnessops/proof test
```
