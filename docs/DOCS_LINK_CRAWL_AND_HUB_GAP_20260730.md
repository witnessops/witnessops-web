# Docs broken-link crawl + hub-nav gap list

**Date:** 2026-07-30  
**Live base:** `https://witnessops.com`  
**Method:** Fetch every MDX-derived `/docs` route + hub pages; extract `href`s; re-check targets.

## Broken internal links

**None found** among ~3.6k internal link edges from crawled docs HTML (status ≠ 200).

### Non-200 content pages (not link failures; expected gates)

| Route | Status | Note |
|-------|--------|------|
| `/docs/man` | 404 | `draft: true` — intentionally not public |
| `/docs/man/witnessops` | 404 | `draft: true` — intentionally not public |

JSON: `var/receipts/docs-broken-links-and-hub-gap.json`

---

## Hub nav vs full corpus

| Metric | Count |
|--------|------:|
| Hub curated links (`sidebar.ts`) | 16 |
| Full corpus routes (MDX + home) | ~64 |
| **Not in hub** (expansion candidates) | **48** |

### Gap list by section (not in primary hub)

**audiences (5)** — whole section absent from hub  
`/docs/audiences`, `…/defender`, `…/integration-author`, `…/manager-approver`, `…/new-operator`

**decisions (3)** — hub has index only  
`/docs/decisions/escalation`, `…/evidence-required`, `…/scope-check`

**evidence (4)** — hub has receipts only  
`/docs/evidence`, `…/execution-chains`, `…/receipt-spec`, `…/sensitive-artifact-handling`

**evidence-mapping (4)** — whole section  
`/docs/evidence-mapping`, DORA, EU AI Act, NIST CSF 2.0

**faq (1)** — `/docs/faq`

**governance (3)** — whole section  
`/docs/governance`, authorization-model, lab-mode-and-scope-bypass

**how-it-works (4)** — hub has index + verification  
anchored-replay, evidence-bundles, proof-model, standards

**integrations (1)** — index; catalog is in hub  
`/docs/integrations`

**man (2)** — draft 404; do not hub-promote

**operations (1)** — `/docs/operations` (runbooks is hub)

**quickstart (1)** — `/docs/quickstart` (verify-first is hub)

**reference (2)** — commands, proof-artifact-classes

**scenarios (1)** — phishing-investigation (index is hub)

**security-education (10)** — hub has section root only; all children are gap

**security-systems (6)** — hub has section + governed-execution; remaining architecture pages are gap

### Suggested expansion tiers (for a later nav PR)

1. **P1 hubs:** `/docs/faq`, `/docs/governance`, `/docs/evidence` (index), `/docs/audiences`  
2. **P2 children under existing hubs:** how-it-works proof-model, evidence receipt-spec, decisions three children as expandable  
3. **P3:** full security-education list, evidence-mapping, mesh/architecture deep pages  

Keep hub small (≤ ~20–24 primary links) per existing hub-nav tests.

---

## CSR one-pager (related buyer chrome)

Separate EN / PL sales PDFs published at:

- EN: `/assets/one-pagers/csr-sprint-en-a4.pdf`
- PL: `/assets/one-pagers/csr-sprint-pl-a4.pdf`

Source: Marketing CSR campaign production pack (not the Drive file `10YAPPKE…` which resolved to synthetic demo zip).

Linked from homepage service cards, services catalogue, and CSR landing pages (locale-specific).

---

## Copy vs approved GDrive

Site buyer chrome was aligned to the 30 July approved website copy; full docs MDX corpus was **not** rewritten to that pack. Expect tone/claim drift between marketing pages and older technical docs until a dedicated copy pass.
