# Footer copy audit + improvement plan — 30 July 2026

**Live SHA context:** dual-lane image `main-90f932b`  
**Authority:** Brand Guide §10 + Website Copy global contract (APPROVED 2026-07-30)  
**Boundary:** This document audits and plans only. It is not deploy approval.

---

## 1. Live snapshot (what visitors see)

### 1.1 English buyer (`/`, `/catalog`, …)

| Element | Live text |
|---------|-----------|
| Mark | Geometric W (SVG) |
| Wordmark | WitnessOps |
| Status chip | **Proof-backed operations** |
| Description | Bounded security and operational reviews with evidence references, clear limits and a practical handover. |
| Links | Services · Customer Security Review · Why WitnessOps · Verify · Docs · Library · **Start a review** |
| Contact heading | Tell us what happened |
| Primary route | `/review/request` |
| Fallback | engage@mail.witnessops.com |
| Safety | Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets. |
| Legal | Privacy · Terms · Security · GitHub |
| Meta | Build: STATIC · © WitnessOps |
| Motto | Respect the boundary. Bring receipts. |

### 1.2 Polish buyer (`/pl`, …)

| Element | Live text |
|---------|-----------|
| Status chip | **Operacje poparte dowodami** |
| Description | Ograniczone zakresowo przeglądy… (approved one-sentence PL) |
| Links | Usługi · Customer Security Review · Dlaczego WitnessOps · Weryfikacja · Dokumentacja · Biblioteka · **Rozpocznij przegląd** |
| Contact heading | Opowiedz nam, co się wydarzyło |
| Primary route | `/pl/review/request` |
| Safety | Nie wysyłaj haseł… (short PL note) |
| Motto | **English** closing line (same as EN) |
| Legal | Prywatność / Warunki / Bezpieczeństwo → **EN** `/privacy` etc. |

### 1.3 Library EN (`/library`)

| Element | Live text |
|---------|-----------|
| Status chip | Public entry points |
| Description | Public entry points for docs, reviews, verifier fixtures, explanatory sample cases, and the illustrative sample report. |
| Links | Library · Docs (docs.witnessops.com) · Review · Start a review · Sample cases · Sample report · Verify |
| Contact / motto / legal | Same pattern as EN buyer; Docs is absolute docs host |

### 1.4 Library PL bug (`/pl/library`)

**Live behaviour:** Polish **buyer** footer is shown, **not** the library footer.

Cause: `isLibrarySurface` only matches pathname starting with `/library`, so `/pl/library` falls through to `isPolishPath` → `POLISH_FOOTER`.

---

## 2. Brand guide §10 scorecard

| Approved element | EN buyer | PL buyer | Library EN | Notes |
|------------------|----------|----------|------------|-------|
| Brand line “Proof-backed operations” | ✓ status chip | ✓ PL form | ✗ “Public entry points” | Intentional technical island; still differs from §10 |
| Footer description (one sentence) | ✓ matches guide | ✓ matches PL one-sentence | Partial / different | Library uses library-specific subline |
| Primary route `/review/request` | ✓ | ✓ `/pl/…` | ✓ | |
| Fallback email | ✓ | ✓ | ✓ | |
| Safety note (short) | ✓ | ✓ | ✓ | Full homepage safety list is longer; footer short form is approved §10 |
| Closing line | ✓ | ✓ (EN) | ✓ | PL intentionally English per guide closing line |
| Geometric mark, no neon | ✓ | ✓ | ✓ | Green status **dot still has glow** (`shadow-[0_0_6px…]`) — mild visual conflict with “no decorative effects” |

---

## 3. Mistakes / defects (fix)

### P0 — correctness

1. **`/pl/library` uses wrong footer variant**  
   Should be library footer (or a PL library variant), not the commercial PL buyer footer.  
   **Fix:** treat `/library` and `/pl/library` as library surface; optionally localise library labels in PL later.

2. **Contact CTA language vs primary brand CTA**  
   Compact contact opens with “Tell us what happened” / “Opowiedz nam, co się wydarzyło”.  
   Brand primary CTA is **Start a review** / **Rozpocznij przegląd**.  
   Why page also reuses “Tell us what happened” as a secondary path — fine there; in the **footer** it competes with the link already labelled Start a review.  
   **Risk:** two different “next action” phrasings in one chrome block.  
   **Fix (recommended):** contact heading → “Start a review” / “Rozpocznij przegląd”, or neutral “Contact” / “Kontakt”, keep path + email + safety.

### P1 — consistency / buyer clarity

3. **CSR nav label omits “Sprint”**  
   Link text “Customer Security Review” vs catalogue name “Customer Security Review Sprint”.  
   Same as top nav — not wrong, but footer and catalogue can diverge in search/skim.  
   **Options:** keep short form (nav density) **or** use full Sprint name in footer only.

4. **PL legal pages point at English routes**  
   `/privacy`, `/terms`, `/security` with PL labels.  
   **OK** if no PL legal pages exist; otherwise mislabelled.  
   **Plan:** either add PL legal twins later or add `lang`/`hreflang` note — not a copy typo today.

5. **“Build: STATIC” / “Wersja: STATIC”**  
   Operator residue; zero buyer value; can look unfinished.  
   **Fix:** remove from public footer **or** replace with year-only copyright line.

6. **Library status chip “Public entry points”**  
   Not in brand guide §10. Fine for technical surface if documented as exception; otherwise use **Proof-backed operations** for global brand unity.

7. **Docs link behaviour**  
   Buyer EN uses `/docs` (apex; may 308 to docs host). Library uses canonical `https://docs.witnessops.com/`.  
   Prefer one strategy for less confusion.

### P2 — polish / product language

8. **EN description** matches guide exactly ✓.  
   Optional improvement (not a mistake): guide primary one-sentence starts with “WitnessOps delivers…”. Footer omits the subject. Current form is the approved **Footer description** line — keep as-is unless Marketing wants the longer form.

9. **PL contact safety** is the short secrets list; homepage uses the longer fit-check list.  
   Aligned with §10 footer safety note. Optional: one shared constant for both short forms.

10. **Motto on PL** stays English. Correct per guide. Optional PL motto only if Marketing Asset Register adds one.

11. **Accessibility**  
    Mark SVG has `aria-label="WitnessOps"` and adjacent text “WitnessOps” → screen readers may hear the name twice.  
    **Fix:** `aria-hidden` on mark when wordmark text is present.

12. **Green status glow**  
    Soften to flat signal without `shadow-[0_0_6px…]` for brand visual rules.

---

## 4. Improvement plan (implementation order)

### Phase A — bugs (small PR, ship soon)

| # | Change | Acceptance |
|---|--------|------------|
| A1 | Library surface includes `/pl/library` | `/pl/library` shows library link set + “Public entry points” (or chosen library status) |
| A2 | Mark `aria-hidden` when wordmark shown | Single name announcement |
| A3 | Remove status-dot glow | Flat green pip only |

### Phase B — copy alignment (buyer chrome)

| # | Change | Acceptance |
|---|--------|------------|
| B1 | Contact heading → **Start a review** / **Rozpocznij przegląd** (or neutral “Contact”) | No competing “what happened” CTA in footer |
| B2 | Drop or hide **Build: STATIC** | Footer meta is copyright only (or build only on internal surfaces) |
| B3 | Decide CSR short vs full name; document in brand note | Nav + footer match that decision |

### Phase C — library island (optional)

| # | Change | Acceptance |
|---|--------|------------|
| C1 | Keep library-specific subline **or** unify to brand footer description | Written exception in brand register if kept |
| C2 | PL library labels if A1 keeps library variant | PL labels for Library/Docs/Sample… |
| C3 | Single Docs URL strategy | Buyer and library both use host-aware canonical docs URL |

### Phase D — verification

| # | Check |
|---|--------|
| D1 | Update footer-readability tests for A1–B2 |
| D2 | Buyer-path smoke still requires no “Package Security Workflow” |
| D3 | Manual: `/`, `/pl`, `/library`, `/pl/library` footer screenshots |
| D4 | Dual-lane deploy + publication receipt |

**Out of scope for footer PR:** six-service catalogue body copy, CSR page, LinkedIn profiles, OG images.

---

## 5. Recommended decisions (for founder)

| Decision | Recommended |
|----------|-------------|
| Contact heading | **Start a review** / **Rozpocznij przegląd** |
| Build: STATIC | **Remove** from public footer |
| `/pl/library` footer | **Library variant** (fix A1) |
| CSR label | Keep short **Customer Security Review** (match nav) |
| Library status chip | Keep “Public entry points” **or** switch to Proof-backed operations — pick one in Marketing Asset Register |
| PL motto | Keep English closing line |

---

## 6. What is already correct (do not “fix”)

- EN footer description = brand §10 footer description  
- Status chip EN/PL brand lines  
- Primary CTA Start a review / Rozpocznij przegląd  
- Fallback email + short safety note  
- Closing motto  
- Geometric mark present  
- No Access Removal / 10-Server / Package Security Workflow in footer links  
- PL commercial subline matches approved brand one-sentence  

---

END OF AUDIT
