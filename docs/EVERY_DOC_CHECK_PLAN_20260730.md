# Every-doc check plan — full corpus

**Date:** 2026-07-30  
**Scope:** Every English public how-to page under `https://witnessops.com/docs` + every MDX file in `content/witnessops/docs/**/*.mdx` (63 files) + special app routes (`/docs`, `/docs/assistant`).  
**Out of scope unless explicitly extended:** PL marketing stubs (`/pl/docs*`), LinkedIn, non-docs site pages (except cross-links from docs).  
**Authority for claims:** AGENTS.md verify boundaries, Brand Guide / Website Copy (APPROVED 2026-07-30) for buyer-facing language, existing claims audits.  
**Boundary:** This is a **check plan**. Execution = score each doc + fix backlog; not proof of fixes until a later ship.

---

## 0. Why this pass

| Known state | Implication |
|-------------|-------------|
| Buyer chrome aligned to approved GDrive website copy | Docs MDX **not** fully rewritten — copy/claim drift expected |
| Link crawl (2026-07-30) | **0 broken internal links** among live edges; man pages 404 draft |
| Hub nav | 16 hubs vs ~64 corpus pages — 48 not in primary nav |
| Prior claims audit | P0/P1 items partially remediated; re-verify every file |

---

## 1. Inventory (complete checklist)

### 1.1 App shell routes

| # | Route | Check as |
|---|-------|----------|
| 0 | `/docs` | Hub index (not MDX) |
| 0b | `/docs/assistant` | App feature page (not MDX) |

### 1.2 MDX corpus — 63 files (check each)

Work in **batches** below. Each file gets one row in the score sheet (§4).

| Batch | Section | Files (approx) | Priority |
|-------|---------|----------------:|----------|
| **B1** | Start / buyer-adjacent | getting-started (2), quickstart (2), faq, glossary | **P0** — conflicts with approved offer |
| **B2** | Verification / evidence | how-it-works (6), evidence (5) | **P0** — claim language |
| **B3** | Operate | decisions (4), operations (2), scenarios (2), security-education (11) | **P1** |
| **B4** | Architecture / governance | security-systems (8), governance (3) | **P1** |
| **B5** | Reference / mapping | reference (3), integrations (2), evidence-mapping (4), audiences (5) | **P1–P2** |
| **B6** | Draft / gated | man (2) | **P0** — must stay unpublished |

**Total MDX:** 63. **Live 200 expected:** 61. **404 expected:** 2 (man drafts).

---

## 2. Per-doc checklist (apply to every page)

For **each** doc, answer yes/no/n/a and note a one-line finding.

### A. Availability & structure

| # | Check |
|---|--------|
| A1 | Live HTTP 200 (or expected 404 if draft-gated) |
| A2 | Frontmatter: `title`, `description`, `draft` consistent with live |
| A3 | Slug/route matches file path convention (`index.mdx` → section root) |
| A4 | No orphan absolute `docs.witnessops.com` links (should be `/docs…` or apex) |

### B. Links

| # | Check |
|---|--------|
| B1 | All internal `href`s resolve 200 (spot-recheck after edits; full crawl already clean) |
| B2 | No links to draft man as “authoritative” public CLI |
| B3 | External links either work or are marked optional / out-of-band |

### C. Claims & product truth (AGENTS + verify)

| # | Check |
|---|--------|
| C1 | Public verify described as **receipt-first**, not full bundle recompute by default |
| C2 | “Valid” / “verified” tied to named mechanism (receipt, manifest, verifier) |
| C3 | No guarantee of security, compliance, certification, customer acceptance |
| C4 | Samples/fixtures labeled non-customer / illustrative where relevant |
| C5 | No private mesh/OffSec entry points presented as public buyer path |

### D. Offer & brand alignment (Website Copy + Brand Guide 30 Jul 2026)

Apply **strictly** on buyer-adjacent docs (B1); **lightly** elsewhere (technical tone OK).

| # | Check |
|---|--------|
| D1 | Service names match six-service catalogue if services are named |
| D2 | No superseded primary offers (Access Removal Proof, 10-Server Pilot as catalogue) |
| D3 | CTAs prefer **Start a review** / `/review/request` over obsolete “package workflow” where buyer-facing |
| D4 | Prices/timing only if still accurate (prefer link to `/catalog` rather than hard-code) |
| D5 | Safety: non-secret fit check; no secrets solicitation |

### E. Navigation / discoverability

| # | Check |
|---|--------|
| E1 | In hub? (yes/no) |
| E2 | If not in hub: linked from parent index? |
| E3 | If orphan: flag for hub expansion or intentional deep-only |

### F. Quality

| # | Check |
|---|--------|
| F1 | Title matches H1 / purpose |
| F2 | “Does not prove” / limits section present on claim-heavy pages |
| F3 | No placeholder lorem / TODO / empty sections |

---

## 3. Execution method

### 3.1 Automated pass (run first, every file)

```text
1. Route map + HTTP status for all 63 MDX routes + /docs + /docs/assistant
2. Full-corpus regex scan:
   - guaranteed|certified|compliance|verified secure
   - docs.witnessops.com
   - hacktheworld|wops hunt|Codex Security (context review)
   - Access Removal|10-Server|Custody Operations Review (old name)
   - proves that|issuance guarantee
3. Extract all markdown/MDX links; re-validate internal targets
4. Diff hub list vs corpus → refresh gap list
5. Write machine sheet: var/receipts/every-doc-check-sheet.csv
```

### 3.2 Human / agent close-read pass (batched)

| Order | Batch | Effort est. | Exit criterion |
|-------|-------|-------------|----------------|
| 1 | B1 buyer-adjacent | 45–90 min | Every page scored; P0 copy/claim fixes listed |
| 2 | B2 verification/evidence | 60–120 min | Verify language matches live `/verify` |
| 3 | B6 man drafts | 15 min | Confirm 404 + no hub promotion |
| 4 | B3 operate + education | 60–90 min | Claims + audience clarity |
| 5 | B4 architecture | 45–60 min | Mesh/OffSec boundaries clear |
| 6 | B5 reference/mapping | 45–60 min | No certification overclaim |

**Total:** ~5–8 hours for full close-read + automated sheet, or **2–3 sessions**.

### 3.3 Score sheet columns

```text
route | file | live_status | draft | in_hub | parent_linked |
A_pass | B_pass | C_pass | D_pass | E_pass | F_pass |
severity (P0|P1|P2|ok) | finding | recommended_fix | owner
```

One row per route. Severity:

| Sev | Meaning |
|-----|---------|
| **P0** | Wrong vs live product, false absolute, draft treated as public authority, secrets risk |
| **P1** | Over-strong claim, buyer copy conflict, missing limits on claim-heavy page |
| **P2** | Nav orphan, tone drift, minor wording |
| **ok** | Pass all applicable checks |

---

## 4. Work packages after scoring (do not skip scoring)

| WP | Name | Depends on |
|----|------|------------|
| **WP0** | Generate CSV + auto scan report | — |
| **WP1** | Fix all P0 findings | WP0 + B1/B2/B6 close-read |
| **WP2** | Fix all P1 claim language | WP1 |
| **WP3** | Buyer-adjacent copy align to approved website copy | WP1 |
| **WP4** | Hub-nav expansion (tier list from gap report) | WP0; optional after WP1 |
| **WP5** | Regression: link crawl + claims grep + buyer-path smoke | WP1–WP3 |
| **WP6** | Commit + clean dual-lane deploy + receipt | WP5 |

**Do not** expand hub to all 48 gaps in one PR — use tiered list (faq, governance, evidence index, audiences first).

---

## 5. Standards library (open while scoring)

| Standard | Use for |
|----------|---------|
| Brand Guide + Website Copy APPROVED 2026-07-30 | D1–D5, CTAs, service names |
| AGENTS.md verify / proof boundaries | C1–C5 |
| `docs/DOCS_CLAIMS_AUDIT.md` | Prior P0/P1 not to reintroduce |
| Live `/verify`, `/catalog`, `/review/request` | Product truth |
| `docs/DOCS_LINK_CRAWL_AND_HUB_GAP_20260730.md` | Links + hub gaps baseline |

---

## 6. Explicit every-doc worklist (tick when scored)

### B1 — Start / buyer (P0)

- [ ] `/docs`
- [ ] `/docs/getting-started`
- [ ] `/docs/getting-started/proof-run-buyer-path`
- [ ] `/docs/quickstart`
- [ ] `/docs/quickstart/verify-first`
- [ ] `/docs/faq`
- [ ] `/docs/glossary`
- [ ] `/docs/assistant` (app)

### B2 — Model / evidence (P0)

- [ ] `/docs/how-it-works` (+ 5 children)
- [ ] `/docs/evidence` (+ 4 children)

### B3 — Operate (P1)

- [ ] `/docs/decisions` (+ 3)
- [ ] `/docs/operations` (+ runbooks)
- [ ] `/docs/scenarios` (+ phishing)
- [ ] `/docs/security-education` (+ 10 children)

### B4 — Architecture (P1)

- [ ] `/docs/security-systems` (+ 7 children)
- [ ] `/docs/governance` (+ 2)

### B5 — Reference (P1–P2)

- [ ] `/docs/reference` (+ 2)
- [ ] `/docs/integrations` (+ catalog)
- [ ] `/docs/evidence-mapping` (+ 3)
- [ ] `/docs/audiences` (+ 4)

### B6 — Draft (P0 availability)

- [ ] `/docs/man` → expect 404
- [ ] `/docs/man/witnessops` → expect 404

---

## 7. Deliverables when execution completes

| Artifact | Purpose |
|----------|---------|
| `var/receipts/every-doc-check-sheet.csv` | Full scores |
| `docs/EVERY_DOC_CHECK_RESULTS_YYYYMMDD.md` | Narrative findings |
| Fix PR(s) by severity | WP1–WP3 |
| Optional hub PR | WP4 |
| Publication receipt | After dual deploy |

---

## 8. Exit criteria (definition of done)

- [ ] All 63 MDX + 2 app routes have a score-sheet row  
- [ ] Zero open **P0**  
- [ ] All **P1** either fixed or explicitly deferred with reason  
- [ ] Link crawl still clean  
- [ ] Man drafts remain 404 and unlinked as authority  
- [ ] Buyer-path smoke still green  
- [ ] Clean commit + dual-lane deploy if code changed  

---

## 9. Recommended first execution slice (if not all at once)

**Session 1 (approve to run immediately):**  
WP0 automated sheet + **full B1 + B2 + B6** close-read → P0 fix list.

**Session 2:** B3–B5 close-read → P1 backlog.

**Session 3:** Implement WP1–WP3 fixes → deploy.

---

## 10. Approval

| Item | Status |
|------|--------|
| Plan covers every MDX doc | Yes (§1 + §6) |
| Includes claims, copy, links, nav | Yes (§2) |
| Execution not started until “go” | This document is the plan |

**Default execution order on go:** §9 Session 1 first (automated + B1/B2/B6), then continue remaining batches without re-planning unless findings force scope change.

---

END OF PLAN
