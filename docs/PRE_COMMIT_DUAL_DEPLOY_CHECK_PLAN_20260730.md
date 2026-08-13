# Full check plan — before commit and dual-lane deploy

**Date:** 2026-07-30  
**Lane:** `witnessops-web` marketing copy + brand assets (approved 2026-07-30 sources)  
**Authority:** AGENTS.md + DEPLOYMENT_AUTHORITY.md  
**Boundary:** This plan is not deploy approval. Passing checks and deploying are separate recorded steps.

---

## 0. What is in scope for this ship

### Include (buyer-visible)

| Area | Paths (summary) |
|------|-----------------|
| Six-service catalogue | `buyer-services.ts`, homepage, catalogue, smoke markers |
| CSR / Why EN+PL | `customer-security-review/*`, `why-witnessops/*`, PL twins |
| Shell CTAs / footer P0 | navbar, footer, home.yaml, public-contact, public-i18n |
| Brand assets + mark | `public/brand/*`, `app/icon.png`, `app/apple-icon.png`, `witnessops-mark.tsx` |
| Tests aligned to copy | polish parity, CSR tests, smoke-buyer-path, ui-proof specs |
| Footer plan doc | `docs/FOOTER_UPDATE_PLAN_20260730.md` |
| Pre-deploy plan | this document |

### Exclude from commit (do not ship)

| Path | Why |
|------|-----|
| `var/claims-p0p1/` | Local deploy/scratch logs |
| `var/docs-claims-audit/` | Local audit scratch |
| Any secrets / `.env*` | Never |
| Unrelated dirty WIP outside marketing/brand | Split or stash |

### Explicit non-goals this ship

- Footer P1 mark lockup / P2 safety line (planned, not required for this deploy)
- LinkedIn/profile publication
- Docs MDX claims remediation unless already on main
- Using `ALLOW_DIRTY=1` for deploy if we can commit first (prefer clean HEAD)

---

## 1. Pre-check inventory (human / agent, ~5 min)

Run from repo root `repos/witnessops-web`:

```bash
git status -sb
git diff --stat
git log -5 --oneline
```

Confirm:

1. Branch is `main` (or named ship branch if you prefer PR — default here is direct main per internal release).
2. Diff is only the include list above.
3. Brand binary assets are present and not empty:
   - `apps/witnessops-web/src/app/icon.png`
   - `apps/witnessops-web/src/app/apple-icon.png`
   - `apps/witnessops-web/public/brand/witnessops-app-icon-dark-1024px.png`
   - horizontal + mark SVGs
4. Superseded catalogue strings absent from buyer chrome:

```bash
rg -n "Access Removal Proof|10-Server Security Pilot|Custody Operations Review|Package Security Workflow" \
  apps/witnessops-web/src/components/marketing \
  apps/witnessops-web/src/lib/buyer-services.ts \
  apps/witnessops-web/src/app/customer-security-review \
  apps/witnessops-web/src/app/why-witnessops \
  apps/witnessops-web/src/app/pl \
  content/witnessops/landing/home.yaml \
  scripts/smoke-buyer-path.ts || true
```

Expected: no hits (or only comments/archive intentional).

5. Node for release quality: **Node 22** (`.nvmrc`). Host may be 26; prefer `pnpm health:node22` if host ≠ 22.

---

## 2. Automated gate ladder (stop on first failure)

Order matters: cheapest → most expensive.

### Gate A — focused marketing unit tests (~1 min)

```bash
cd apps/witnessops-web
TSX_TSCONFIG_PATH=tsconfig.test.json node \
  --import ./scripts/register-server-only-test-stub.mjs --import tsx --test \
  src/app/pl/catalog/polish-catalog-parity.test.ts \
  src/app/customer-security-review/customer-security-review-route.test.ts \
  src/app/customer-security-review/customer-security-review-parity.test.ts \
  src/app/pl/pl-copy-naturalization.test.ts \
  src/lib/public-contact.test.ts \
  src/components/marketing/footer-readability.test.ts \
  src/components/shared/navbar-language-routes.test.ts
```

**Pass criteria:** all green.

### Gate B — monorepo test bundle (~5–15 min)

```bash
cd ../..   # repo root
pnpm test
```

Includes: app tests, proof package tests, route-parity, receipt-smoke, **smoke:buyer-path:test** (marker contract unit tests).

**Pass criteria:** exit 0.

### Gate C — full health (release bar)

Prefer Node 22:

```bash
pnpm health:node22
# if Node 22 already active:
pnpm health
```

`health` = build + lint + typecheck + test + docs:validate + signals:validate.

**Known caution:** pre-existing `docs/man` typegen export noise may appear under typecheck — if it fails and is unrelated to this diff, record and either fix in a tiny pre-commit fix or confirm it already fails on clean main before blaming this ship.

**Pass criteria:** exit 0, or documented pre-existing failure with proof on clean tree.

### Gate D — optional UI proof (if time / risk on layout)

Buyer catalogue/hero changed:

```bash
# requires build + playwright install as already used in repo
pnpm ui-proof:hero:ci
# and/or catalogue/offer-details if CI normally runs them
```

**Pass criteria:** not blocking if unit smoke markers pass and manual spot-check planned post-deploy; **recommended** before public dual deploy when icons/nav change.

### Gate E — deploy tooling self-test

```bash
pnpm deploy:k3s:test-parity
```

**Pass criteria:** exit 0.

---

## 3. Content / claim contract checklist (manual, ~10 min)

Against Drive authority (local mirror or Drive copy):

| Check | Expected |
|-------|----------|
| Six services order | CSR Sprint → Bounded Workflow → One Server → Launch → Key/Access/Custody → Incident |
| Prices EN/PL parity | Same euro bands / “from” language |
| Primary CTA | Start a review / Rozpocznij przegląd |
| Safety line | Non-secret fit check; no secrets list |
| CSR commercial | From €1,600; ~3 working days |
| Brand line | Proof-backed operations / Operacje poparte dowodami |
| Favicon/mark | Geometric W / dark app icon — not unicode hexagon |
| Footer library | No “Package Security Workflow” |

Optional local visual:

```bash
pnpm --filter witnessops-web dev
# open /, /catalog, /customer-security-review, /why-witnessops
# open /pl, /pl/catalog, /pl/customer-security-review, /pl/why-witnessops
# confirm favicon + navbar mark + footer motto
```

---

## 4. Commit plan

### 4.1 Stage deliberately

```bash
# include product + brand + tests + plans
git add \
  apps/witnessops-web/src \
  apps/witnessops-web/public/brand \
  content/witnessops/landing/home.yaml \
  packages/ui/src/brand/witnessops.ts \
  scripts/smoke-buyer-path.ts \
  tests/ui-proof \
  docs/FOOTER_UPDATE_PLAN_20260730.md \
  docs/PRE_COMMIT_DUAL_DEPLOY_CHECK_PLAN_20260730.md

# exclude scratch
# do NOT add var/claims-p0p1 var/docs-claims-audit
```

### 4.2 Commit message (suggested)

```
Ship approved website copy and brand assets (2026-07-30)

Align EN/PL buyer surfaces with the six-service catalogue, CSR and Why
pages, CTAs and safety lines from the approved website copy. Replace
favicon and navbar mark with the approved geometric brand assets.
Library footer CTA uses Start a review. Deploy remains a separate step.
```

### 4.3 Post-commit

```bash
git status -sb   # clean working tree preferred
git rev-parse --short HEAD
```

Record **clean SHA** for deploy tag (`main-<sha>-…`). Prefer **no `ALLOW_DIRTY`**.

Push only if your operating model requires remote before deploy:

```bash
git push origin main   # confirm with operator if policy requires
```

---

## 5. Dual-lane deploy plan

### 5.1 Preconditions

| Precondition | Check |
|--------------|--------|
| Clean git HEAD at ship SHA | `git status` clean |
| SSH to private deploy host | `ssh "${DEPLOY_SSH}" 'hostname'` |
| Private network for mesh smoke | Confirm the operator-custodied path is active |
| No concurrent deploy | `pnpm deploy:k3s:status` |

### 5.2 Deploy command (one image → both lanes)

```bash
# from clean tree — no ALLOW_DIRTY
pnpm deploy:k3s:both
```

If something forces dirty tree only (should not after commit):

```bash
ALLOW_DIRTY=1 pnpm deploy:k3s:both   # record dirty in receipt; avoid if possible
```

### 5.3 Enforced smoke (must exit 0)

```bash
pnpm deploy:k3s:smoke
# or included at end of both
```

Enforces:

1. **Identical** container image refs prod ↔ mesh-dev  
2. HTTP 200 on prod home and mesh-dev home  
3. Matching primary CSS hash  

### 5.4 Buyer-path live smoke (this ship requires)

Against **prod** (public):

```bash
pnpm smoke:buyer-path -- --base-url https://witnessops.com
```

Against **mesh-dev** (WG):

```bash
pnpm smoke:buyer-path -- --base-url "${MESH_DEV_URL}"
```

**Pass criteria:** all required markers present on `/`, `/catalog`, `/customer-security-review`, `/pl`, `/pl/catalog`, `/pl/customer-security-review`; no prohibited superseded catalogue strings.

### 5.5 Manual post-deploy spot check

| URL | Look for |
|-----|----------|
| `https://witnessops.com/` | Hero, six cards, geometric favicon/mark |
| `https://witnessops.com/catalog` | Six services + boundaries + Start a review |
| `https://witnessops.com/customer-security-review` | From €1,600, non-secret fit check |
| `https://witnessops.com/why-witnessops` | Clear work / verification boundary |
| `https://witnessops.com/pl` | Powiedz nam… / Rozpocznij przegląd |
| Mesh twin | Same image SHA in page source / deploy status |

### 5.6 Publication record (required)

Write a short receipt under `var/receipts/` or operator log:

- Date/time UTC  
- Git SHA  
- Image tag (`witnessops-web:main-…`)  
- `deploy:k3s:both` exit code  
- `deploy:k3s:smoke` exit code  
- buyer-path smoke prod + mesh results  
- Note: **copy approval ≠ this deploy**; this record is publication proof  

---

## 6. Stop / rollback conditions

| Condition | Action |
|-----------|--------|
| Gate A/B/C fail on this diff | Fix before commit |
| Typecheck fail only on pre-existing man export | Confirm on clean main; fix if blocking health |
| Deploy build fail | Do not force dirty; fix SHA |
| Image mismatch after both | Re-run both; do not leave lanes split |
| Buyer-path smoke fail on prod | Investigate; optional roll back to previous image tag via redeploy of prior SHA |
| Public claim overclaim found | Hotfix copy before advertising |

Rollback: redeploy previous known-good SHA with `pnpm deploy:k3s:both` from that checkout (same dual-lane path).

---

## 7. Execution order (checklist)

```text
[ ] 1. Inventory + exclude var/ scratch
[ ] 2. Gate A focused tests
[ ] 3. Gate B pnpm test
[ ] 4. Gate C pnpm health / health:node22
[ ] 5. Gate D optional ui-proof
[ ] 6. Gate E deploy:k3s:test-parity
[ ] 7. Manual content checklist
[ ] 8. Stage + commit (clean)
[ ] 9. Record SHA
[ ] 10. pnpm deploy:k3s:both
[ ] 11. pnpm deploy:k3s:smoke
[ ] 12. buyer-path smoke prod + mesh
[ ] 13. Manual spot-check URLs
[ ] 14. Publication receipt
```

**Do not** claim “website approved on live” until steps 10–14 pass.

---

## 8. Estimated time

| Phase | Time |
|-------|------|
| Inventory + Gate A | 5–10 min |
| Gate B+C health | 15–40 min (Node 22 / Docker) |
| Commit | 5 min |
| Dual deploy + smoke | 10–20 min |
| Buyer-path + manual | 10–15 min |
| **Total** | **~45–90 min** |

---

## 9. After this ship (deferred)

- Footer P1 geometric mark in footer lockup  
- Footer P2 buyer safety line under contact  
- Profile/LinkedIn asset apply (outside web deploy)  
- Optional OG image refresh to match new icon  

---

END OF PLAN
