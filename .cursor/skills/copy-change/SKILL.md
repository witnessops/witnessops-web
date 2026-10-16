---
name: copy-change
description: >
  Use when changing public copy, offer names, CTAs, catalogue identity, prices,
  contact lines, or claim wording under apps/witnessops-web or content.
---

# Copy change

Public website and content edits stay inside the current two offers and the claim boundary. This skill does not authorize a rename, a new price, billing, collection, or deployment.

## Read first

1. `docs/commercial/README.md` and the offer record for the surface you are editing.
2. `.cursor/rules/commercial-offers.mdc` for contact, timing, held terms, and historical names.
3. `content/witnessops/skills/claim-boundary-copy/SKILL.md`.
4. `apps/witnessops-web/src/app/public-claim-boundary.test.ts` for prohibited claims and required boundary markers.

## Write

- Public new-sales offers are only Agent Action Security Review at €2,500 excluding VAT and External Attack Surface Review at €1,900 excluding VAT.
- Public contact is `engage@mail.witnessops.com` only.
- Timing copy is `Delivery timing per signed SOW`.
- Do not reintroduce held or historical prices and terms tracked in the commercial registry. Read them from `apps/witnessops-web/src/lib/commercial-truth.ts` and `apps/witnessops-web/src/lib/historical-held-term-surfaces.test.tsx`, and keep them off public surfaces and new-sales selection.
- Keep historical offer names as historical records. Do not rename them.
- Replace banned claim words using `.cursor/rules/claim-boundary.mdc`. State the limit in the same sentence as any positive result.

## Before committing

From `apps/witnessops-web`:

```bash
NODE_ENV=test TSX_TSCONFIG_PATH=tsconfig.test.json node --import ./scripts/register-server-only-test-stub.mjs --import tsx --test \
  src/app/public-claim-boundary.test.ts \
  src/lib/historical-held-term-surfaces.test.tsx \
  src/lib/public-contact.test.ts \
  src/lib/public-agent-action-contract.test.ts \
  src/components/marketing/buyer-homepage-trust.test.ts \
  src/components/docs-assistant/docs-assistant-public-copy.test.ts \
  src/app/media-kit/media-kit-route.test.ts
```

From the repository root, when the copy is buyer-visible or on a proof surface:

```bash
pnpm smoke:buyer-path:test
```

Also run `pnpm lint` and `pnpm typecheck`. Do not merge, deploy, or weaken a wording test to make it pass.
