# Public docs site audit

**Date:** 2026-07-30 (UTC)  
**Auditor:** implementer (live probe + repo read)  
**Live image (at probe):** `main-3abbab5-…` dual-lane (hub-only nav shipped)  
**Evidence:** goal scratch `docs-audit-*.log` / `docs-audit-corpus.txt`

---

## 1. Surfaces

| Surface | URL | Role | Live observation |
| --- | --- | --- | --- |
| **English docs host** | `https://docs.witnessops.com/` | SEO + canonical authority; full MDX corpus; primary docs UI | HTTP **200**; robots `Allow: /`; sitemap **62** locs all on docs host |
| **Apex English entry** | `https://witnessops.com/docs` (+ `www`) | Human/marketing bookmark path only | HTTP **308** → `https://docs.witnessops.com/` (path-preserving for deeper `/docs/*`) |
| **Polish docs** | `https://witnessops.com/pl/docs` | Locale marketing / buyer orientation; **not** English technical corpus | HTTP **200**; canonical `/pl/docs`; slug pages are stubs pointing to EN |

### Host policy (as shipped)

- Middleware 308s apex/www `/docs` → docs host (strip `/docs` prefix on destination).
- Docs host rewrites short paths (`/getting-started`) → app routes (`/docs/getting-started`).
- Apex sitemap (**40** locs) includes **`/pl/docs` only** for docs; English pages live on docs-host sitemap only.
- Apex robots no longer Disallow `/docs` (crawlers should follow 308).

---

## 2. Nav / docs home (post hub-only chrome)

### Primary sidebar (live HTML)

| Metric | Value |
| --- | --- |
| Unique primary sidebar hrefs | **16** (≤18 target) |
| Security-education **leaves** in sidebar | **none** |
| `password-reuse` (or similar leaves) in sidebar | **none** |
| Section hubs | Start, Model, Operate, Reference, Architecture |

Full unique set observed:

```text
/docs
/docs/getting-started
/docs/getting-started/proof-run-buyer-path
/docs/quickstart/verify-first
/docs/how-it-works
/docs/how-it-works/verification
/docs/evidence/receipts
/docs/security-systems/governed-execution
/docs/decisions
/docs/operations/runbooks
/docs/scenarios
/docs/security-education
/docs/reference
/docs/glossary
/docs/integrations/witnessops-catalog
/docs/security-systems
```

Source contract: `packages/content/src/sidebar.ts` (`OFFSEC_DOCS_LAYERS` hub-only; no leaf auto-expand). Unit test: `packages/content/src/sidebar.hub-nav.test.ts`.

### Docs home body

| Check | Observation |
| --- | --- |
| “Documentation layers” full tree re-list | **Absent** |
| “Browse by area” hub cards | **Present** |
| Buyer path CTA / copy | **Present** (`Security Workflow Buyer Path`, buyer route blurb) |
| Skip to main content | Present (a11y skip link; correct) |

### Residual UX note (not density regression)

Sidebar **hrefs still use `/docs/...` prefix** even when the browser is already on `docs.witnessops.com`. Clicking a hub issues **308** strip to short path (e.g. `/docs/getting-started` → `/getting-started`). Works, but every primary nav click is a permanent redirect hop.

---

## 3. Route sample (live)

Legend: all paths on docs host unless noted. Canonicals for EN pages are under `https://docs.witnessops.com/…`.

| Area | Path | HTTP | Notes |
| --- | --- | --- | --- |
| Start hub | `/` | 200 | Docs home |
| Start | `/getting-started` | 200 | |
| **Buyer path** | `/getting-started/proof-run-buyer-path` | 200 | Critical |
| **Verify First** | `/quickstart/verify-first` | 200 | Critical |
| Model hub | `/how-it-works` | 200 | |
| Model leaf | `/how-it-works/verification` | 200 | |
| Model leaf | `/evidence/receipts` | 200 | |
| Operate hub | `/security-systems/governed-execution` | 200 | |
| Operate hub | `/decisions` | 200 | |
| Operate leaf | `/decisions/escalation` | 200 | |
| Operate hub | `/scenarios` | 200 | |
| Operate hub | `/security-education` | 200 | hub only in nav |
| Operate leaf | `/security-education/phishing` | 200 | leaf still published |
| Reference hub | `/reference`, `/glossary` | 200 | |
| Architecture hub | `/security-systems` | 200 | |
| Architecture leaf | `/security-systems/threat-model` | 200 | |
| Apex entry | `witnessops.com/docs` | **308** | → docs host |
| Apex buyer | `witnessops.com/docs/…/proof-run-buyer-path` | **308** | → docs host short path |
| PL | `witnessops.com/pl/docs` | 200 | |
| Legacy | `/overview` | 200 after follow | → security-systems (via legacy redirect; intermediate `/docs/…` hop) |
| Guess | `/intro`, `/verify` | **404** | common mental shortcuts |

No redirect loops observed on sampled paths. No P0 5xx.

---

## 4. Corpus inventory

| Item | Count |
| --- | --- |
| English MDX under `content/witnessops/docs` | **63** |
| Docs-host sitemap locs | **62** (+ home; drafts/filters may explain 63 vs 62) |

Largest folders: `security-education` (11), `security-systems` (8), `how-it-works` (6), `audiences` (5), `evidence` (5).  
Primary nav intentionally surfaces **hubs only**; ~47 leaves rely on section indexes + search.

**PL:** separate shallow nav (`docs-navigation.ts`); slug pages are **placeholder** (“Polska wersja… jest przygotowywana”) with link to English `/docs/{slug}` — not 1:1 with the 63 EN MDX tree.

---

## 5. Findings (ranked)

### P0 — none observed

Host coherence, hub-only chrome, buyer-critical 200s, and dual sitemap roles are consistent with the last shipping lane.

### P1 — improve soon

1. **Docs-host nav uses `/docs/...` hrefs → extra 308 on every primary click**  
   - **Evidence:** `GET https://docs.witnessops.com/docs/getting-started` → `308 Location: https://docs.witnessops.com/getting-started`. Live sidebar hrefs are `/docs/...` while browser URL space on docs host is short paths.  
   - **Rec:** host-aware public hrefs (`getPublicDocPath`) so docs host emits `/getting-started`, local/apex keep `/docs/...` where needed.

2. **PL technical docs are stubs; EN/PL IA not aligned**  
   - **Evidence:** `pl/docs/[...slug]` copy states full technical docs remain English; nav lists many PL labels without full MDX parity.  
   - **Rec:** explicit product lane: either (a) PL buyer-only docs + clear “technical = EN” badge, or (b) curated PL subset of hubs only—not fake deep nav.

3. **Legacy redirects still emit intermediate `/docs/...` Location on docs host**  
   - **Evidence:** `/overview` follows to security-systems but first hop is app `permanentRedirect(getDocHref(...))` → `/docs/security-systems` then middleware strip.  
   - **Rec:** redirect to short path when request host is docs host.

### P2 — backlog

4. **Common guess paths 404:** `/intro`, `/verify` (docs host)  
   - **Evidence:** live 404.  
   - **Rec:** map `intro` → getting-started; `verify` → how-it-works/verification or quickstart/verify-first via `LEGACY_DOC_REDIRECTS`.

5. **Apex marketing still links `/docs/...` (by design)**  
   - One hop via 308 is fine; optional absolute `https://docs.witnessops.com/...` for fewer hops from chrome CTAs.

6. **Search still indexes full corpus (including education leaves)**  
   - Not a bug (search is the long-tail tool); ensure UX copy on home continues to say “use search for depth.”

7. **Source `listDocPages` cwd sensitivity**  
   - Running sidebar loader outside the expected content root can under-resolve docs (seen in one off-cwd script). Live build is fine; document/test cwd for content package tests.

---

## 6. Recommended next lanes (priority order)

| # | Lane | Outcome |
| --- | --- | --- |
| 1 | **Host-aware doc hrefs + legacy/guess redirects** | Zero 308 on normal docs-host nav; `/intro`/`/verify` land on real hubs |
| 2 | **PL docs product decision** | Stop over-promising deep PL tree; buyer PL path clear; EN technical boundary explicit |
| 3 | **Section index pages as leaf catalogs** | Tasks/education/mapping leaves discoverable under hubs without primary chrome bloat |
| 4 | **Optional content editorial** | Only after chrome/IA stable |

---

## 7. Verification evidence files

| File | Contents |
| --- | --- |
| `{SCRATCH}/docs-audit-hosts.log` | Host matrix, robots, sitemap counts, roles |
| `{SCRATCH}/docs-audit-nav.log` | 16 unique sidebar hrefs; no edu leaves; Browse by area |
| `{SCRATCH}/docs-audit-routes.log` | ≥20 path probes (hubs, leaves, buyer, apex 308, PL, guesses) |
| `{SCRATCH}/docs-audit-corpus.txt` | 63 MDX + folder histogram |
| This document | Criteria 1–4 coverage |

---

## Summary

Public docs are **operationally healthy** after host coherence + hub-only nav: English lives on **docs.witnessops.com**, apex **308s** cleanly, primary chrome is **16 hubs**, buyer paths **200**. Remaining work is **href host-awareness**, **guess/legacy redirects**, and a **conscious PL stub policy**—not another full-tree expansion.
