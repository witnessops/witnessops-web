# Design QA — witnessed review request

## Comparison target

- Source visual truth: `SHOW ME THE RECEIPT — WitnessOps Agent Action Proof`, slide 4 (source attachment; not committed to this repository).
- Existing-site visual truth: `docs/product-decisions/assets/agent-verification-funnel/homepage-desktop.png`.
- Browser-rendered implementation screenshot: transient QA capture inspected during implementation; not retained in the repository.
- Combined comparison evidence: transient side-by-side QA artifact inspected during implementation; not retained in the repository.
- Route and state: `/review/request/confirmed`, English, confirmed mailbox with a synthetic non-secret QA request record. The synthetic seed was used only in the preview build and is absent from the source tree.

## Viewport and normalization

- Source pixels: `1467 x 825`.
- Implementation pixels: `1363 x 936`.
- Implementation CSS viewport: `1363 x 936`.
- Device pixel ratio: `1`.
- Density normalization: both artifacts were inspected at one rendered pixel per CSS pixel; the side-by-side comparison scaled each crop proportionally without judging browser chrome or unrelated page height as design drift.

## Evidence reviewed

- Full view: browser viewport plus the combined side-by-side image were opened and compared for composition, hierarchy, shell integration, and density.
- Focused region: the receipt/request sheet was compared at readable scale for header treatment, typography, fact grid, boundary stripe, footer rail, and button treatment.
- Browser state: confirmed state, direct-visit empty state, successful copy state, and an intentionally forced clipboard-denied state were inspected.
- Primary interactions tested: copy request record, selected-text fallback after clipboard denial, specimen link, proof-model link, and direct confirmation-page visit without browser-held state.
- Console errors checked: no application-origin warnings or errors were present in the confirmed-state walkthrough.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: the implementation preserves the deck's condensed display hierarchy, mono uppercase evidence labels, high-contrast facts, and restrained body copy. The site shell continues to use its existing homepage typography.
- Spacing and layout rhythm: the bordered paper sheet, two-column fact grid, boundary block, and side guidance retain the deck's evidence-document rhythm while fitting the existing homepage content width.
- Colors and tokens: warm paper, black ink, muted rules, and the existing WitnessOps orange are consistent across the deck reference and the live homepage shell.
- Image quality and asset fidelity: no new raster illustration, decorative icon, inline SVG, CSS drawing, or placeholder imagery was introduced. The existing WitnessOps mark and shell assets remain authoritative.
- Copy and content: every positive status is paired with negative facts. The record states that review has not started, customer evidence has not been accepted, and the object is not a proof receipt, verifier result, identity proof, scope acceptance, or start-of-work record.
- Interaction and accessibility: native button and textarea controls are used; the button and record header retain a minimum `44px` target; keyboard focus and `aria-live` copy status are present; a direct route visit makes no verification claim.
- Compact Ask integration: widget typography and form selectors are scoped to explicit Ask chrome markers, so the paper record and clipboard fallback retain readable record colors. The existing homepage orange `#b94716` now clears the `4.5:1` text-contrast threshold on both record paper surfaces.
- Focus and language continuity: confirmation moves focus to the newly mounted record heading, Return/Back restores focus to the Ask launcher, and the browser-held record is relocalized rather than disappearing when the site language changes.
- Request-kind continuity: Public Exposure Review records retain their payment, SOW, written-authority, fixed-scope, required-input, evidence-handling, and collection-window gates and link to the matching synthetic sample.
- Light-shell contrast: the trust label teal is darkened to `#2d777c`, clearing `4.5:1` on the confirmation shell without changing the established palette.
- Responsiveness: CSS collapses the fact grid and footer rail at the narrow breakpoint and removes the desktop side-by-side dependency. Automated surface tests cover the `44px` target. A separate cloud-browser mobile capture was unavailable because the selected browser viewport could not be resized; this is retained as P3 follow-up coverage, not an observed layout defect.

## Comparison history

1. Iteration 1 — visual comparison
   - Earlier finding: no visual P0/P1/P2 mismatch, but clipboard denial left the buyer without a usable take-away (`P1` interaction failure).
   - Fix: added an explicit bounded-record fallback instead of treating clipboard permission as guaranteed.
   - Post-fix evidence: confirmed desktop comparison retained the deck/home visual language.
2. Iteration 2 — legacy clipboard fallback
   - Earlier finding: `execCommand` could report “Record copied” while the browser clipboard remained empty (`P1` honesty and usability failure).
   - Fix: removed the unverifiable success path. Failure now reveals a read-only textarea containing only the narrowed record.
   - Post-fix evidence: the forced clipboard-denied browser state showed the textarea focused and fully selected.
3. Iteration 3 — bounded selectable fallback
   - Result: the selected record contained the request reference, timestamp, requested path, and negative facts. It contained no email address, OTP, price, issuance ID, assessment run ID, or thread ID. No P0/P1/P2 issue remained.
4. Iteration 4 — compact integration and in-flight state
   - Earlier finding: broad Ask widget selectors overrode the compact record title and clipboard fallback; input edits could also re-enable submission during an active request.
   - Fix: scoped widget styles to explicit contact-form/header markers, moved the record accent to the existing contrast-safe homepage orange, added a synchronous in-flight lock, disabled Back and dialog Close during requests, and restored keyboard focus after confirmation or return.
   - Post-fix evidence: source contracts cover selector isolation, `44px` targets, focus transfer, and both contact/verification locks; the full integration gate is rerun after these changes.

## Implementation checklist

- [x] Match the deck's evidence-object visual language inside the existing homepage shell.
- [x] Preserve explicit not-proven boundaries.
- [x] Provide an honest copy interaction and a permission-denied fallback.
- [x] Keep direct confirmation-page visits non-authoritative.
- [x] Localize the shared request-record surface for English and Polish.
- [x] Remove the synthetic QA seed from production source.
- [ ] Optional P3: repeat the visual capture at the mobile breakpoint when the selected cloud browser supports viewport resizing.

final result: passed
