# Footer update plan — next pass (post brand + copy approval)

**Status:** plan only — not implemented as a full footer rewrite in this pass.  
**Authority:** Brand Guide + Website Copy APPROVED 2026-07-30.  
**Prerequisite done:** EN/PL buyer copy catalogue; brand assets + favicon/mark on site.

---

## Current state (after 2026-07-30 copy patch)

| Surface | Brand line | Subline | Primary CTA |
|---------|------------|---------|-------------|
| EN default (home.yaml) | WitnessOps | Bounded security and operational reviews with evidence references, clear limits and a practical handover. | Start a review |
| PL footer override | WitnessOps | PL one-sentence description | Rozpocznij przegląd |
| Status chip | Proof-backed operations / Operacje poparte dowodami | — | — |
| Motto | Respect the boundary. Bring receipts. | — | — |
| Library override | Public entry points… | **Package Security Workflow** still present | Library/docs path |

---

## Gaps vs approved brand guide §10

1. **No mark in footer lockup**  
   Guide expects clear brand presence; footer is text-only. Next pass should add geometric mark (black on light / white if inverted) with clear space, not decorative effects.

2. **Library footer still uses workflow-package language**  
   `Package Security Workflow` and sample/package-centric links conflict with buyer-path CTA rule: main buyer path uses **Start a review**. Library may keep verifier/sample links, but the request CTA label should align: `Start a review` → `/review/request`.

3. **Library motto differs**  
   `Make boundaries legible. Bring receipts.` vs approved closing line `Respect the boundary. Bring receipts.` — unify unless library is intentionally a technical tone island (document the exception if kept).

4. **Safety line placement**  
   Full fit-check safety line lives on homepage/CSR; footer contact block uses short `PUBLIC_NO_SECRETS_NOTE`. Plan: keep short line in compact contact; link “How we start” or reuse one-sentence safety under contact on buyer routes only.

5. **Link set vs six-service offer**  
   Footer lists Services, CSR, Why, Verify, Docs, Library, Start a review — good. Does not list every service (correct — catalogue does). Confirm no dead “10-server / Access Removal” links (already removed from primary catalogue).

6. **EN layout metadata vs footer**  
   Root layout title/description updated to security/operational reviews language. Ensure OG image (if any) does not show old “proof packs” lockup.

7. **Polish brand line consistency**  
   Status chip uses `Operacje poparte dowodami` (approved). Footer motto currently English on PL surface — acceptable per guide closing line; optional PL motto only if Marketing Asset Register adds one.

8. **Accessibility / density**  
   Existing tests require 44px targets and ≥12px footer type. Any mark+wordmark addition must not drop link target sizes.

---

## Proposed next footer implementation (ordered)

### P0 — alignment (small PR)

1. ~~Library footer CTA: rename `Package Security Workflow` → **Start a review**~~ **Done 2026-07-29** (href stays `/review/request`).  
2. ~~Library motto → **Respect the boundary. Bring receipts.**~~ **Done 2026-07-29**.  
3. Ensure EN/PL status chip + subline match brand guide (already mostly done).  
4. Add `data-brand-footer="approved-2026-07-30"` for smoke markers (optional).

### P1 — visual lockup

1. ~~Footer brand row: `[geometric mark] WitnessOps` + status chip under or beside.~~ **Done 2026-07-29** via `WitnessOpsMark` tone white on dark site footer shell.  
2. ~~Mark geometry aligned with approved geometric W.~~  
3. Optional later: full horizontal wordmark on wide screens only.

### P2 — contact + safety

1. Compact contact remains email + request path.  
2. One-line safety under contact on buyer routes (not library):  
   `Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.`  
3. No file-upload affordance in footer.

### P3 — verification (tests)

1. Extend footer-readability tests for mark presence and CTA labels.  
2. Buyer-path smoke: footer contains `Proof-backed operations` + `Start a review` + no `Package Security Workflow` on `/` and `/catalog`.  
3. PL: `Operacje poparte dowodami` + `Rozpocznij przegląd`.

---

## Out of scope for footer PR

- LinkedIn/profile banner publication (Marketing Asset Register / external).  
- Full redesign (gradients, multi-column marketing mega-footer).  
- Deploy — separate dual-lane publication record.

---

## Acceptance criteria (when implemented)

- [ ] Buyer EN/PL footers match brand guide brand line, description, status chip, motto, contact route, fallback email.  
- [ ] No primary-catalogue superseded service names in footer links.  
- [ ] Geometric mark present without effects.  
- [ ] Library surface does not advertise “Package Security Workflow” as the public CTA label.  
- [ ] Tests + optional buyer-path smoke green before deploy.
