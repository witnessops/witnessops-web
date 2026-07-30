# Footer — plan to fix all P0 / P1 / P2

**Date:** 2026-07-30  
**Source audit:** `docs/FOOTER_COPY_AUDIT_AND_IMPROVEMENT_PLAN_20260730.md`  
**Authority:** Brand Guide §10 + Website Copy (APPROVED 2026-07-30)  
**Boundary:** Implementation plan only until coded, reviewed, dual-lane deployed, and receipted.

---

## 0. Locked product decisions (use these unless founder overrides)

| Topic | Decision |
|--------|----------|
| Contact heading | **Start a review** / **Rozpocznij przegląd** (match primary CTA) |
| Build line | **Remove** from public footer (`build_label` empty or omit render) |
| `/pl/library` | **Library footer variant** (not buyer PL commercial set) |
| CSR link label | Keep **Customer Security Review** (match nav; full “Sprint” stays on catalogue/CSR page) |
| Library status chip | **Public entry points** (EN) / **Publiczne punkty wejścia** (PL library) — document as technical island |
| Library subline | Keep library-specific description; do **not** force buyer one-sentence onto library |
| Docs URL | **Canonical docs host** for all footers via existing `getDocsUrl(..., { mode: "canonical" })` |
| PL motto | Keep English closing line |
| PL legal | Keep EN `/privacy` `/terms` `/security` until PL legal pages exist (no fake PL URLs) |
| Mark a11y | `aria-hidden` on decorative mark when wordmark text is visible |
| Status pip | Flat green; **no** glow shadow |

---

## 1. Full issue register → fix mapping

| ID | Sev | Issue | Fix |
|----|-----|--------|-----|
| **P0-1** | P0 | `/pl/library` shows buyer PL footer | Expand library surface detection |
| **P0-2** | P0 | Contact heading “Tell us what happened” fights Start a review | Change contact heading to Start a review / PL twin |
| **P1-1** | P1 | `Build: STATIC` public noise | Stop rendering `build_label` when empty; clear EN/PL/library labels |
| **P1-2** | P1 | CSR short vs Sprint | Document decision; no rename (nav parity) |
| **P1-3** | P1 | Docs link strategy differs buyer vs library | Both use canonical docs URL helper |
| **P1-4** | P1 | Library chip not in brand §10 | Keep as documented exception + PL string for library PL |
| **P1-5** | P1 | PL library has no library labels | After P0-1, add `LIBRARY_FOOTER_PL` (or locale field) |
| **P2-1** | P2 | Double “WitnessOps” for AT | Mark decorative when wordmark present |
| **P2-2** | P2 | Green pip glow | Remove glow class |
| **P2-3** | P2 | Shared safety string drift | Single constants already exist; wire footer contact only (no homepage length change) |

---

## 2. Implementation work packages

### WP1 — Library surface + PL library footer (P0-1, P1-4, P1-5)

**Files**
- `apps/witnessops-web/src/components/marketing/footer.tsx`
- `apps/witnessops-web/src/components/marketing/footer-readability.test.ts` (extend)
- Optional helper: `isLibraryPath(pathname)` in `public-i18n.ts` if cleaner

**Logic**
```ts
function isLibrarySurface(pathname: string): boolean {
  return (
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === "/pl/library" ||
    pathname.startsWith("/pl/library/")
  );
}
```

**Content**
- Keep EN `LIBRARY_FOOTER` as today (after CTA fixes already shipped).
- Add PL library footer:
  - status: `Publiczne punkty wejścia`
  - subline: PL translation of library description (plain, technical, no new commercial claims)
  - links: Biblioteka, Dokumentacja (canonical docs), Przegląd (`/pl/review` if exists else `/review` with note), Rozpocznij przegląd, Przykłady, Raport przykładowy, Weryfikacja
  - legal: existing PL labels → EN legal routes
  - motto: English closing line
  - `build_label`: `""`

**PL library link targets (concrete)**
| Label | href |
|-------|------|
| Biblioteka | `/pl/library` |
| Dokumentacja | `getDocsUrl("witnessops", "/", { mode: "canonical" })` |
| Przegląd | `/review` (EN offer page is fine) **or** `/pl` if no PL `/review` — **prefer** `/review` with EN page until PL twin exists |
| Rozpocznij przegląd | `/pl/review/request` |
| Przykładowe przypadki | `/review/sample-cases` |
| Przykładowy raport | `/review/sample-report` |
| Weryfikacja | `/pl/verify` |

**Acceptance**
- `/library` → EN library footer  
- `/pl/library` → PL library footer (not commercial Usługi set)  
- `/pl` still → commercial PL footer  

---

### WP2 — Contact heading alignment (P0-2)

**Files**
- `public-contact-route.tsx`
- `public-contact-route.test.tsx`
- Any smoke markers that assert “Tell us what happened” **in footer contact only**

**Change**
| Locale | From | To |
|--------|------|-----|
| EN | Tell us what happened | **Start a review** |
| PL | Opowiedz nam, co się wydarzyło | **Rozpocznij przegląd** |

Keep body lines:
- Primary route / Główna ścieżka + path link  
- Fallback / Kontakt zapasowy + email  
- Short safety note  

**Do not change** Why page line “Tell us what happened. Start with a non-secret fit check.” (page body, not footer contact chrome).

**Acceptance**
- Footer compact contact heading matches primary CTA labels  
- Tests updated; no forbidden “engage@witnessops.com” regressions  

---

### WP3 — Remove Build: STATIC (P1-1)

**Files**
- `footer.tsx` (LIBRARY / POLISH / default content)
- `content/witnessops/landing/home.yaml` → `build_label: ""` or remove from schema if required non-empty  
- Check `FooterSchema` in `packages/content` — if `NonEmptyString`, keep yaml value but **do not render** empty/STATIC in UI

**Render rule**
```tsx
{content.build_label ? (
  <>
    <span>{content.build_label}</span>
    <span>·</span>
  </>
) : null}
<span>{content.copyright}</span>
```

Set all public footers’ `build_label` to `""` **or** stop passing STATIC.

**Acceptance**
- No “Build: STATIC” / “Wersja: STATIC” on `/`, `/pl`, `/library`, `/pl/library`  
- Copyright remains  

---

### WP4 — Docs URL unification (P1-3)

**Files**
- `footer.tsx` EN buyer links from `home.yaml` currently use `/docs`  
- Prefer: resolve Docs link through `DOCS_PUBLIC_HREF` (already used by library) for **buyer EN and PL** as well

**Change**
- EN `home.yaml` footer Docs href can stay `/docs` **if** `resolveFooterHref` or footer map rewrites Docs to canonical — cleaner: set buyer EN/PL Docs to `DOCS_PUBLIC_HREF` in code for the Docs entry only.

**Implementation preference (code, not yaml)**  
When mapping links, if `href` is `/docs` or `/pl/docs`, emit `DOCS_PUBLIC_HREF` (canonical).  
Keeps apex middleware behaviour but shows stable docs host in footer.

**Acceptance**
- All footers’ Docs link uses same host strategy (canonical docs URL)  
- No broken PL docs entry  

---

### WP5 — Mark a11y + pip (P2-1, P2-2)

**Files**
- `footer.tsx`  
- Optionally `witnessops-mark.tsx` prop `decorative?: boolean`

**Footer mark**
```tsx
<WitnessOpsMark ... aria-hidden /> 
// or pass decorative so SVG has aria-hidden and no title/aria-label
```

**Pip**
```tsx
// before: bg-signal-green shadow-[0_0_6px_var(--color-signal-green)]
// after:  bg-signal-green  (no shadow)
```

**Acceptance**
- One accessible name “WitnessOps” from wordmark text  
- No glow class in footer  

---

### WP6 — CSR naming note (P1-2) — docs only

**Files**
- This plan + one line in `FOOTER_COPY_AUDIT…` or brand implementation note  

**No code rename.** Catalogue/CSR H1 keep “Customer Security Review Sprint”; chrome keeps short label.

---

### WP7 — Tests + smoke

| Test | Updates |
|------|---------|
| `footer-readability.test.ts` | library path logic markers; no Build STATIC; no glow; mark decorative |
| `public-contact-route.test.tsx` | expect Start a review / not Tell us what happened (compact) |
| `polish-catalog-parity` / buyer smoke | unchanged commercial markers |
| New unit | `isLibrarySurface('/pl/library') === true` |
| Manual | four URLs footer strings |

Buyer-path smoke: ensure no accidental removal of “Start a review”; if contact heading becomes Start a review, markers stay fine.

---

## 3. Execution order (single PR preferred)

```text
1. WP1 library surface + PL library footer
2. WP2 contact heading
3. WP3 build_label hide
4. WP4 docs URL unify
5. WP5 mark a11y + pip
6. WP6 docs note (optional same PR)
7. WP7 tests green
8. pnpm test (or focused + health if time)
9. Commit
10. pnpm deploy:k3s:both  (clean HEAD; no ALLOW_DIRTY if var/ gitignored)
11. smoke:buyer-path prod + mesh
12. Manual four-URL footer check
13. Publication receipt
```

**Estimated effort:** 1–2 hours code + tests; ~20–40 min dual deploy + smoke.

---

## 4. File touch list (expected)

| File | WP |
|------|-----|
| `components/marketing/footer.tsx` | 1,3,4,5 |
| `components/marketing/public-contact-route.tsx` | 2 |
| `components/marketing/public-contact-route.test.tsx` | 2,7 |
| `components/marketing/footer-readability.test.ts` | 1,3,5,7 |
| `components/shared/witnessops-mark.tsx` | 5 (optional prop) |
| `content/witnessops/landing/home.yaml` | 3 (build_label) |
| `lib/public-i18n.ts` | 1 optional helper |
| `docs/FOOTER_*` | 6 close-out |

---

## 5. Out of scope (explicit)

- Six-service catalogue body, CSR page, Why page body (except not regressing Why line)  
- Creating full PL legal pages  
- Horizontal wordmark in footer (optional later)  
- LinkedIn/profile assets  
- Changing brand §10 approved strings for buyer description/motto/email  

---

## 6. Acceptance matrix (all Ps closed)

| ID | Done when |
|----|-----------|
| P0-1 | `/pl/library` footer ≠ Usługi commercial set; library-style links present |
| P0-2 | Contact heading = Start a review / Rozpocznij przegląd |
| P1-1 | No Build/Wersja STATIC in public footer HTML |
| P1-2 | Decision recorded; labels unchanged deliberately |
| P1-3 | Docs links use canonical docs URL on all four surfaces |
| P1-4 | Library chip exception documented; PL library has PL chip |
| P1-5 | PL library labels present |
| P2-1 | Mark decorative / single AT name |
| P2-2 | No pip glow |
| P2-3 | Safety notes still short approved form |

---

## 7. Risk notes

- **Contact heading change** is visible on every page (compact contact in footer). Low risk; aligns brand.  
- **PL library footer** is new copy — keep technical tone; no prices; no service list.  
- **Docs absolute URL** may open external host; already true for library; fine for buyer.  
- Deploy only after tests; clean tree expected (`var/` gitignored).

---

## 8. Ready to implement checklist

```text
[x] Founder confirms locked decisions in §0 (or notes overrides)
[x] Implement WP1–WP5 in one branch/PR
[x] WP7 tests pass (footer-readability + public-contact + nav)
[ ] Commit message: fix(footer): close P0–P2 copy and library surface gaps
[ ] Dual-lane deploy + buyer-path smoke
[ ] Receipt: footer P-fix ship
[ ] Mark audit plan items done in FOOTER_COPY_AUDIT doc
```

**Default:** §0 decisions are locked as recommended; implement on “go” without re-asking each item.  
**Status:** Implementation in progress after “plan approved go” (2026-07-30).

---

END OF PLAN
