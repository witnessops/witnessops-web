# Every-doc check results — Session 1 (+ automated full sheet)

**Date:** 2026-07-30  
**Plan:** `docs/EVERY_DOC_CHECK_PLAN_20260730.md`  
**Sheet:** `var/receipts/every-doc-check-sheet.csv` (65 routes: 63 MDX + `/docs` + `/docs/assistant`)

---

## Executive summary

| Item | Result |
|------|--------|
| Live HTTP for non-draft MDX | **61 × 200** |
| Draft man pages | **2 × 404** (expected) |
| Broken internal links (prior crawl) | **0** |
| Auto-flag severity | 0 P0, 3 P1, 27 P2 (mostly “guarantee” wording — many are “does **not** guarantee”) |
| Session 1 close-read | B1 buyer path **fixed**; B2 verification/receipts **pass**; B6 man **pass** (gated) |
| Remaining | B3–B5 close-read not fully human-scored row-by-row in this session |

---

## B6 — Man drafts

| Route | Live | Verdict |
|-------|------|---------|
| `/docs/man` | 404 | **ok** — draft gated |
| `/docs/man/witnessops` | 404 | **ok** — draft; text says not frozen public contract |

No hub promotion of man as authoritative public CLI.

---

## B2 — Verification / evidence (sample close-read)

| Route | Verdict | Notes |
|-------|---------|--------|
| `/docs/how-it-works/verification` | **ok** | Clear public receipt-first vs offline bundle-complete split |
| `/docs/evidence/receipts` | **ok** | Proves / does not prove well bounded |
| `/docs/evidence/receipt-spec` | **ok** (light) | “proves that” already qualified with trusted key |
| `/docs/quickstart/verify-first` | **ok** | Aligns with public `/verify` |

---

## B1 — Buyer-adjacent (fixed this session)

| Route | Before | After |
|-------|--------|--------|
| `/docs/getting-started/proof-run-buyer-path` | “Package one security workflow”, old offer framing | **Buyer path** aligned to six-service catalogue, **Start a review**, CSR + one-pagers, non-secret fit check |
| `/docs` index UI | “Security Workflow Buyer Path”, package CTA | **Buyer path** + **Start a review** |
| Sidebar hub label | Security Workflow Buyer Path | **Buyer path** |
| Getting Started | Old buyer path name | Points to **Buyer path** |

### Still deferred (P1/P2, not Session 1 blockers)

- Many MDX files still use operator “governed run” framing (technical docs) vs marketing “bounded review” — intentional dual audience; score in B3–B5.
- Auto “guarantee” hits often appear in “does not guarantee” sentences — manual filter required before mass edit.
- `/support` and some marketing pages still say “Package one security workflow” (outside docs corpus).

---

## Hub gap (unchanged)

48 corpus pages not in primary 16-link hub — see `docs/DOCS_LINK_CRAWL_AND_HUB_GAP_20260730.md`. Expand only by tier in a later WP.

---

## Fixes shipped in this session

Code/content changes:

1. Rewrite `proof-run-buyer-path.mdx` to approved offer language  
2. Update `docs/page.tsx` CTAs and buyer blurb  
3. Sidebar + getting-started link labels  
4. Smoke markers for `/docs` and buyer-path doc  

---

## Next sessions (continue every-doc)

1. **Session 2:** Score B3–B5 into CSV (severity + finding per row)  
2. **Session 3:** P1 claim fixes from auto sheet + human review  
3. Optional hub expansion tier 1 (faq, governance, evidence index, audiences)  
4. Support/marketing residual “Package one security workflow” cleanup  

---

## Exit for Session 1

- [x] Automated sheet for every doc  
- [x] B1 close-read + P0/P1 buyer path fix  
- [x] B2 sample close-read (verify/receipts)  
- [x] B6 man draft status confirmed  
- [ ] Full human score every row in B3–B5  
- [ ] Dual deploy of Session 1 fixes  

END
