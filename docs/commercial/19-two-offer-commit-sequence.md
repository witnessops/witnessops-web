# Two-Offer V1 — Path A commit sequence

- Date: 2026-10-08.
- Authority: founder-approved pack + [18-two-offer-portfolio.md](./18-two-offer-portfolio.md) amendment (Agent Action ID).
- Path: **A — Approved stack** (PRs #450 / #451), not the divergent local agent WIP.
- Status: planning record only. **Not** merge, deploy, or publication authority.
- Hold: consumer stack #450–#454 remains **HOLD** until Agent Action reconciliation (see § Technical identity and publication hold in `18`).

## Workstation recovery notes (ops-laptop-03)

| Item | Location |
| --- | --- |
| Divergent agent WIP (stash) | `git stash` message: `wip: divergent two-offer agent work 20261008 (not pack-aligned)` on `witnessops-web` |
| Local rebase tip (not pushed) | branch `feat/two-offer-v1-discovery-rebased-onto-policy-20261008` |
| Remote discovery tip | `origin/feat/two-offer-v1-discovery-20261008` @ `fe03d306` (still on pre-amendment AI ID) |
| Policy tip | `origin/feat/two-offer-v1-policy-20261008` @ `7b33c8f5` |

Do not force-push rewritten discovery history without explicit approval.

## Already landed (do not redo)

### PR #450 — `feat/two-offer-v1-policy-20261008`

1. `feat(commercial): preserve two-offer policy and new-sales discovery selector`
2. Later amendment commits: Agent Action ID, `PUBLIC_AGENT_ACTION_OFFER`, selector tests, docs hold

### PR #451 — `feat/two-offer-v1-discovery-20261008` (stale vs #450 head)

1. `feat(web): share two-review catalogue and pricing discovery`  
   Still selects `agent-tools-access-review`. **Not merge-ready** on current #450.

## Required next commits (ordered)

Branch strategy: stack each consumer PR on the previous head. Keep drafts. No merge to `main` from this list alone.

### Commit / PR C1 — Catalogue truth (unblocks discovery)

**Branch:** `feat/two-offer-v1-catalogue-truth-20261008` (from latest #450)  
**Message:** `feat(commercial): register Agent Action in buyer services for public selector`

| Include | Notes |
| --- | --- |
| `apps/witnessops-web/src/lib/buyer-services.ts` | Add `agent-action-security-review` from `PUBLIC_AGENT_ACTION_OFFER`; keep `PRIMARY_OFFER` / historical IDs |
| EN/PL `service-landings` if required by contracts | Additive only |
| Focused unit tests | Selector over `BUYER_SERVICES` succeeds; inventory ID excluded from `PUBLIC_PAID_REVIEW_IDS` |

**Out of scope:** intake activation, sitemap prune, deleting old routes.

### Commit / PR C2 — Reconcile discovery presentation

**Branch:** rebase/rebuild #451 onto C1 (or new `feat/two-offer-v1-discovery-20261008` tip)  
**Message:** `fix(web): point catalogue and pricing at Agent Action public ID`

| Include | Notes |
| --- | --- |
| `buyer-catalogue.tsx` | Compare against `PUBLIC_AGENT_ACTION_REVIEW_ID`, not `agent-tools-access-review` |
| `public-paid-discovery.test.tsx` | Expect `agent-action-security-review` + external |
| `tests/ui-proof/catalogue.spec.ts` | Order, offerId, names/prices for Agent Action |
| `tests/ui-proof/pricing-t1.spec.ts` | `data-pricing-review` + request `offerId` |

**Out of scope:** retiring legacy enquiryPath options (next stage).

### Commit / PR C3 — Homepages

**Branch:** `feat/two-offer-v1-homepages-20261008`  
**Message:** `feat(web): align EN/PL homepages to two public paid reviews`

| Include | Notes |
| --- | --- |
| `simple-homepage.tsx`, `buyer-homepage.tsx`, PL equivalents | Copy anchors from `18`; free hostname check retained |
| Homepage trust / presentation tests | Two cards only for new-sales |

### Commit / PR C4 — Legacy detail CTAs (non-destructive)

**Branch:** `feat/two-offer-v1-legacy-cta-20261008`  
**Message:** `feat(web): stop selling withdrawn offers on legacy detail pages`

| Include | Notes |
| --- | --- |
| Legacy catalog detail pages | Withdrawal notice / stop-sell; **no** redirect onto another product |
| Keep routes and sitemap coverage | Per non-destructive boundary |

### Commit / PR C5 — New-intake guards

**Branch:** `feat/two-offer-v1-intake-20261008`  
**Message:** `feat(web): accept only Agent Action offerId or external productId on new intake`

| Include | Notes |
| --- | --- |
| `new-review-request-policy.ts`, form paths, raw JSON intake | Fail closed on retired/ambiguous IDs |
| Negative tests | Unknown, wrong-role, historical-only IDs |
| Preserve historical confirmation reader | Do not rewrite issued records |

### Commit / PR C6 — Assistant + FAQ closeout

**Branch:** `feat/two-offer-v1-assistant-faq-20261008`  
**Message:** `feat(web): align Ask recommendations and buyer FAQ to two public offers`

| Include | Notes |
| --- | --- |
| Ask / docs-assistant recommendation paths | No promotion of withdrawn/pilot offers |
| Buyer FAQ + 30-day retest anchor surfaces | External terms only where applicable |
| EN/PL parity tests | |

## Explicitly discarded for Path A

Do **not** commit the stashed WIP as-is. It used `CURRENT_PUBLIC_BUYER_SERVICE_IDS`, withdrawn-page redirects style, and sitemap edits that conflict with the pack’s projection model.

Recover only after diff-review against C1–C6 if a specific hunk is still wanted.

## Acceptance gates (unchanged)

Before any merge claim: scoped review, `pnpm health`, `pnpm smoke:buyer-path:test`, public UI/SEO tests, head-specific image/security gates, separate deployment approval. Module-only or syntax checks are insufficient.
