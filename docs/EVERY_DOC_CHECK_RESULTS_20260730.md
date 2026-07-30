# Every-doc check results — Session 1 + Session 2 (+ P1)

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
| Session 1 | B1 buyer path **fixed**; B2 verify/receipts **pass**; B6 man **pass** |
| Session 2 | B3–B5 close-read **complete**; auto “guarantee” flags mostly **cannot / does not guarantee** |
| Open **P0** | **0** |
| Open **P1** | **0** (catalog ownership-table softens applied) |
| Open **P2** | **0** after Session 2 human filter (prior auto-P2 downgraded where negative framing was healthy) |

---

## B6 — Man drafts

| Route | Live | Verdict |
|-------|------|---------|
| `/docs/man` | 404 | **ok** — draft gated |
| `/docs/man/witnessops` | 404 | **ok** — draft; not frozen public contract |

No hub promotion of man as authoritative public CLI.

---

## B2 — Verification / evidence

| Route | Verdict | Notes |
|-------|---------|--------|
| `/docs/how-it-works/verification` | **ok** | Receipt-first public vs offline bundle-complete |
| `/docs/evidence/receipts` | **ok** | Proves / does not prove bounded |
| `/docs/evidence/receipt-spec` | **ok** | “proves that” already qualified with trusted key |
| `/docs/quickstart/verify-first` | **ok** | Aligns with public `/verify` |

---

## B1 — Buyer-adjacent (Session 1)

| Route | Before | After |
|-------|--------|--------|
| `/docs/getting-started/proof-run-buyer-path` | “Package one security workflow”, old offer framing | **Buyer path** → six-service catalogue, **Start a review**, CSR + one-pagers |
| `/docs` index UI | “Security Workflow Buyer Path”, package CTA | **Buyer path** + **Start a review** |
| Sidebar + Getting Started labels | Old names | **Buyer path** |

### Deferred outside docs corpus

- `/support` and some marketing still may say “Package one security workflow” (not in this MDX corpus).

---

## B3 — Operate + security-education (Session 2)

| Area | Verdict | Notes |
|------|---------|--------|
| Decisions (4) | **ok** | Scope / evidence / escalation maps; “does not remove judgment” |
| Operations (2) | **ok** | Path model + runbooks; versioning ≠ execution quality |
| Scenarios (2) | **ok** | Controlled frames; not governance substitute |
| Security-education (11) | **ok** | Every “guarantee” hit is **cannot / does not guarantee** — healthy limits, not product promises |

No P1 claim fixes required in B3.

---

## B4 — Architecture + governance (Session 2)

| Area | Verdict | Notes |
|------|---------|--------|
| Security-systems index + stack / gates / practices | **ok** | Owns / does-not-own language |
| Threat model | **ok** | Strong non-claims; public `valid` receipt-scoped |
| Governed execution | **ok** | Signed claim bounds + does-not-prove list |
| Mesh federation / VaultMesh | **ok** | Mesh hygiene ≠ buyer `/verify`; OffSec path separate |
| Architecture | **ok** | “Outside system guarantees” is limit-setting |
| Governance (3) | **ok** | “What authorization does not guarantee” present |

No P1 claim fixes required in B4.

---

## B5 — Reference / mapping / audiences (Session 2)

| Area | Verdict | Notes |
|------|---------|--------|
| Reference + commands + artifact classes | **ok** | Command guarantees ≠ verify claims; no man promotion |
| Evidence-mapping (4) | **ok** | Explicit **cannot certify**; mapping ≠ legal conformity |
| Audiences (5) | **ok** | “Breaks … guarantees” = integrity assumption language |
| Integrations index | **ok** | No overclaim |
| **WitnessOps Catalog** | **ok** after P1 | Ownership table Outside column used absolute **Proves that** / **Guarantees** verbs (misreadable as positive claims) |

### P1 fix applied (catalog)

**File:** `content/witnessops/docs/integrations/witnessops-catalog.mdx`

| Before (Outside catalog responsibility) | After |
|-----------------------------------------|--------|
| Proves that a specific execution instance met real-world objectives | Claiming a specific execution met real-world objectives |
| Guarantees environment stability, remote system truth, or tool correctness | Environment stability, remote system truth, or tool correctness |
| Decides final risk significance without human review | Final risk significance without human review |

---

## Hub gap (unchanged)

48 corpus pages not in primary 16-link hub — see `docs/DOCS_LINK_CRAWL_AND_HUB_GAP_20260730.md`. Expand only by tier in a later WP.

---

## Fixes shipped

### Session 1

1. Rewrite `proof-run-buyer-path.mdx` to approved offer language  
2. Update `docs/page.tsx` CTAs and buyer blurb  
3. Sidebar + getting-started link labels  
4. Smoke markers for `/docs` and buyer-path doc  

### Session 2 + P1

1. Soften catalog ownership-table Outside column (no absolute proves/guarantees verbs)  
2. Human-score B3–B5 into `var/receipts/every-doc-check-sheet.csv`  
3. This results document  

---

## Next (optional Session 3+)

1. Hub expansion tier 1 (faq, governance, evidence index, audiences)  
2. Support/marketing residual “Package one security workflow” cleanup (outside docs)  
3. Spot re-crawl after any further copy edits  

---

## Exit checklist

- [x] Automated sheet for every doc  
- [x] B1 close-read + buyer path fix  
- [x] B2 sample / key close-read  
- [x] B6 man draft status confirmed  
- [x] Full human score B3–B5  
- [x] Open P0 = 0; open P1 fixed or closed  
- [ ] Dual-lane deploy of Session 2 P1 (this ship)  

END
