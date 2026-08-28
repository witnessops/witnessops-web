# Media Kit homepage-native design QA

## Comparison target

- Visual source of truth: the rendered homepage before this batch.
- Source desktop: `media-kit-dark-batch/01-source-home-desktop.jpg`
- Source mobile: `media-kit-dark-batch/02-source-home-mobile-390.jpg`
- Final implementation desktop: `media-kit-dark-batch/18-final-media-kit-desktop.jpg`
- Final implementation mobile: `media-kit-dark-batch/19-final-media-kit-mobile-390.jpg`
- Desktop comparison: `media-kit-dark-batch/20-final-comparison-desktop.jpg`
- Mobile comparison: `media-kit-dark-batch/21-final-comparison-mobile-390.jpg`

These local visual-evidence names resolve inside the task's external visualization output folder; the repository document intentionally omits operator-specific absolute paths.

The comparison target is the homepage's visual system, not its marketing content or two-column hero composition. The Media Kit intentionally keeps a reading-page information architecture while matching the homepage chrome, palette, type hierarchy, spacing rhythm, borders, cards and interaction geometry.

## Viewports and normalization

| State | CSS viewport | Source pixels | Implementation pixels | Device scale factor | Normalization |
| --- | --- | --- | --- | --- | --- |
| Desktop, page top, navigation closed | 1280 × 720 | 1274 × 717 | 1274 × 717 | 1 | Chrome capture excludes the scrollbar edge; equal pixel dimensions were compared directly. |
| Mobile, page top, navigation closed | 390 × 663 | 390 × 663 | 390 × 663 | 2 | Chrome returned CSS-pixel captures for both source and implementation; no resampling was needed. |

The homepage regression captures after the final build are pixel-identical to the pre-edit source at both viewports (ImageMagick absolute-error count: 0 desktop, 0 mobile).

## Findings

- No actionable P0, P1 or P2 mismatch remains.
- Fonts and typography: Inter remains the primary family; IBM Plex Mono carries orange eyebrows and technical metadata. Display scale, weight, tight tracking and line height follow the homepage hierarchy without adding a new font dependency.
- Spacing and layout rhythm: the page uses the homepage's wide frame, large section cadence and single-pixel rules. Dense assets stay in bounded cards rather than turning the page into a white reading surface.
- Colors and tokens: black `#000000` / near-black `#050505`, warm white `#FAF7F2` and orange `#F27A3D` map to the selected homepage system. Warm white is limited to contrast-dependent asset previews.
- Image quality and assets: all logo previews use existing repository SVG/PNG assets; both product screenshots retain their accepted crops and native aspect ratios. No placeholder, generated or hand-drawn substitute was introduced.
- Copy and content: approved Media Kit wording, claims, metadata, canonical, asset names, dimensions and contact boundaries are unchanged.
- Interaction and accessibility: primary navigation, mobile menu, Skills route, Ask AI open/close, download focus order and same-origin asset responses were exercised in Chrome. Download controls measure 50px high, the 390px page has no horizontal overflow, mobile background scrolling is locked for open overlays, and Escape restores sensible focus.

## Comparison history

1. Pass 1 found one P2: the desktop and mobile-menu `Start a review` action remained warm white on `/media-kit`, while the homepage reference uses the signature orange action treatment.
2. The shared navbar now applies homepage-native action chrome on `/media-kit` without changing its buyer-navigation destinations or the homepage navigation contract.
3. Pass 2 and the final production-build capture show the orange action treatment at matched desktop/mobile sizes. No P0/P1/P2 mismatch remains.

## Focused evidence

- Desktop logo grid: `media-kit-dark-batch/15-media-kit-desktop-logo-grid.png`
- Mobile download controls: `media-kit-dark-batch/17-media-kit-mobile-download-controls.png`
- Mobile menu open: `media-kit-dark-batch/11-media-kit-mobile-menu-open.png`
- Mobile Ask AI open: `media-kit-dark-batch/14-media-kit-mobile-ask-open.png`
- Desktop footer: `media-kit-dark-batch/16-media-kit-desktop-footer.png`
- Mobile footer: `media-kit-dark-batch/13-media-kit-mobile-footer.png`

Focused views were required because buttons, asset sharpness, footer clearance and open overlays are not readable enough in the page-top comparisons. Final production-build interaction state was rechecked after these focused captures. The Chrome connection did not expose a browser-console log reader; rendered DOM checks, HTTP responses and the local server log showed no error state.

## Remaining public route inventory and proposed batches

Admin routes are intentionally excluded. Public APIs, robots and sitemap retain their current contracts and need no visual conversion.

1. **Buyer conversion path — next.** `/catalog/workflows`, `/review/request` and `/review/request/confirmed`, including the shared `BuyerServiceDetail` and request-form framing. Use the new dark page tokens for the outer surface and bounded warm-white panels only where form readability needs them.
2. **Buyer catalogue and decision pages.** `/catalog`, `/catalog/[skuId]`, `/catalog/offsec`, `/catalog/operator-platform`, `/catalog/professional-public-footprint-audit`, `/customer-security-review`, `/pricing`, `/contact`, `/why-witnessops`, plus their shared catalogue/service components and simple redirect hubs (`/why`, `/operators`, `/receipts`, `/runbooks`, `/governed-execution`).
3. **Skills, review discovery and reading surfaces.** `/library`, `/library/[slug]`, `/review`, `/review/sample-cases` and its case routes, `/review/sample-report`, `/docs`, `/docs/[...slug]`, `/docs/assistant`, `/docs/man/witnessops`, `/support` and `/support/[slug]`. Keep dense documents and specimens operational inside bounded reading panels.
4. **Proof, utility, legal and locale parity.** `/verify`, `/verify/skill`, `/verify-token`, `/verify-ui`, `/execution`, `/execution/[receiptId]`, `/assessment/[issuanceId]`, `/package/[issuanceId]`, `/access-change-proof-run`, `/proof-backed-security-systems`, `/runner-loop`, `/signals`, `/status`, `/privacy`, `/terms`, `/security`, `/payment/success`, `/mcp`, `/mcp/directory`, `/og/home`, and the corresponding `/pl/*` public routes. Share chrome and tokens while preserving verifier, receipt, evidence and document density.

## Residual polish

- P3: after the buyer path converts, consider extracting the repeated homepage title/eyebrow/card primitives from route-local styles into shared presentation helpers. This is not needed for the current Media Kit and should not precede the audited conversion path.

previous result: passed

# Compact mobile brand-lockup header design QA

## Selected target and evidence

- Figma source section: `WitnessOps Mobile Header — Audit and Direction` (`1:2`) in file `C02sL5wYROkzMhVwOwXtz3`.
- Exact selected-direction text node: `1:5`.
- Accepted Figma current-state references: `mobile-header-implementation/18-figma-source-closed-390x844.png` and `mobile-header-implementation/19-figma-source-open-390x844.png`.
- Pre-change local captures: `mobile-header-implementation/02-pre-home-closed-390x844.png` and `mobile-header-implementation/03-pre-home-menu-open-390x844.png`.
- Final 390px implementation captures: `mobile-header-implementation/21-final-home-closed-390x844.png` and `mobile-header-implementation/22-final-home-menu-open-390x844.png`.
- Direct comparison: `mobile-header-implementation/23-final-source-implementation-comparison.png`.

The Figma section is authoritative for direction and measurements: a 60–64px black row, the existing W with the exact `Proof beats memory.` line, a quiet 44px menu control, an attached black sheet, 48px rows, a restrained active marker and one orange primary action. The file does not contain a separate polished after-state frame; its screenshots document the state being improved. Implementation therefore follows the exact selected-direction contract and compares against those accepted current-state captures without inventing another visual direction.

## Final measurements and checks

| Check | Result |
| --- | --- |
| Closed header | 62px including the divider; W renders at 22px high; brand line is 12px/600 in warm white. |
| Menu control | 44×44px, quiet neutral border/background, descriptive open/close label and visible orange focus ring. |
| Open sheet | Full viewport width, normal-flow continuation of the header, and pushes the hero to y=326 rather than overlaying or slicing through it. |
| Menu rhythm | Navigation and utility rows are 48px; the current route uses a 2px orange marker with a 6% tint. |
| Primary action | Exactly one orange action appears in the sheet on Home, Media Kit and Skills. |
| Reflow | No horizontal overflow at 320px or 390px; the 62px lockup holds at both widths. |
| Keyboard and focus | Open focuses the first link; Tab and Shift+Tab wrap across the sheet; Escape closes and restores focus to the trigger. |
| Route continuity | Home, `/media-kit`, and `/library` retain the same mobile black lockup; Skills shows the restrained active marker. |
| Desktop regression | The mobile control remains hidden at 1280px and the existing 77px desktop header/navigation layout is unchanged. |
| Ask AI regression | Android API 34 WebView + LatinIME reduced the real visible viewport from 681px to 397px; the full-screen panel matched the 397px viewport, its close control and active input remained visible, and close restored the trigger/body scroll. |
| Safe area | The mobile nav keeps `env(safe-area-inset-top)` outside its 60px content row; the Android test had a zero CSS inset because system chrome did not overlay the WebView. |

## Comparison history

1. Baseline: 71.5px header, 18px W, low-contrast 10.9px tagline and a bordered utility-style menu trigger.
2. Pass 1: header/lockup/row hierarchy matched the selected contract, but the attached sheet stopped 32px short of the right edge at 390px (P2).
3. Pass 2: explicit full-bleed width corrected the sheet to 390px. The sheet now remains attached, pushes page content, keeps one orange action and preserves focus behavior. No actionable P0, P1 or P2 mismatch remains.

## Evidence limits

- The Figma board supplies an explicit selected-direction specification and current-state captures, not a final after-state mockup.
- The Android keyboard check used the already-installed API 34 AVD and bundled Chromium WebView shell because no standalone Chrome package is installed in that AVD; it validates real Android viewport/IME behavior, not Chrome-specific UI chrome.
- Screenshot review does not establish screen-reader announcement quality, every iOS notch configuration or zoom reflow beyond the tested widths.

previous result: passed

# Compact mobile header glyph-alignment polish QA

## Comparison target and evidence

- Source visual truth: the freshly captured pre-change header/menu at the existing selected 390px mobile treatment.
- Before, closed/full page: `mobile-header-glyph-polish/04-before-closed-fullpage.png`.
- Before, open/full page: `mobile-header-glyph-polish/03-before-open-fullpage.png`.
- After, closed/full page: `mobile-header-glyph-polish/10-after-closed-fullpage.png`.
- After, open/full page: `mobile-header-glyph-polish/11-after-open-fullpage.png`.
- Final production build, closed/full page: `mobile-header-glyph-polish/19-final-production-closed-fullpage.png`.
- Final production build, open/full page: `mobile-header-glyph-polish/20-final-production-open-fullpage.png`.
- Full-state comparison: `mobile-header-glyph-polish/18-full-before-after-comparison.png`.
- Focused lockup, Agent row and CTA comparison: `mobile-header-glyph-polish/17-focused-before-after-comparison.png`.

The CSS viewport was 390 × 844 at device scale factor 1. Open-state full-page captures are 390 × 6770 pixels. Closed-state captures are 384 × 6593 because Chrome excludes the six-pixel vertical scrollbar from the captured content width; the page viewport remained 390px and no resampling was used for pixel measurements. Focus crops were enlarged with nearest-neighbour sampling only for inspection.

## Diagnosis

- The lowercase `g` in `Agent` and `Bring` has a normal descender. It was not clipped and the 20px menu line box had adequate room.
- The visible glyph ink was nevertheless optically low: before the change, the `Agent` ink box was centered 1.5px below its 48px row center, the CTA label was 1.5px low, and the mono lockup ink was 1.5px below its 16px line-box center.
- The rows themselves were correctly centered with equal padding, `align-items: center`, no clipping and no unintended baseline transform. The issue came from the fonts' ink metrics inside their line boxes, not from header height, row padding, tracking or sheet geometry.

## Fix and post-fix evidence

- Applied a one-pixel upward optical correction to text spans only. The shared CTA keeps its existing DOM unless the optional label class is supplied, so CTAs outside the mobile menu are unchanged.
- The `Agent` ink box now centers on the row center; the CTA and mono lockup residual offset is 0.5px, which is the nearest whole-pixel alignment without pushing the glyphs visibly high.
- The final production build reproduces the same measured `Agent` and CTA ink boxes as the accepted after state.
- The header remains 62px, the menu trigger remains 44px, rows remain 48px, the sheet remains attached/full-width, and the active marker plus single orange CTA are unchanged.
- The exact `Proof beats memory.` copy, W mark, Inter/IBM Plex Mono families, sizes, weights, tracking and accessible labels are unchanged.

## Required fidelity surfaces

- Fonts and typography: same families, sizes, weights, line heights and tracking; only the one-pixel optical baseline correction changed.
- Spacing and layout rhythm: 62px header, 44px trigger, 48px rows and sheet/hero relationship are unchanged.
- Colors and tokens: production black, warm-white and orange tokens are unchanged.
- Image and icon quality: the existing W mark and menu icon rendering are unchanged; no assets were added or replaced.
- Copy and content: all lockup, navigation, utility and CTA copy is unchanged.

## Comparison history

1. Fresh pre-change inspection reproduced the user-reported low-looking `g`. Pixel crops separated the normal descender from a measurable 1.5px low optical center.
2. A text-only one-pixel correction reduced the residual offset to 0–0.5px without changing component geometry, fonts or interaction structure.
3. Matched closed/open and focused after captures show no actionable P0, P1 or P2 mismatch.

## Evidence limits

- Pixel thresholds measure the visible rasterized glyph bounds in the tested Chrome rendering; another operating system's font rasterizer may differ by a subpixel.
- Screenshot review does not establish screen-reader announcements, but the adjustment adds no accessible text and leaves labels, focus order and controls unchanged.

final result: passed

---

# Skills Library intro-to-catalog spacing and internal-link QA

## Comparison target

- Source visual truth:
  - `skills-library-spacing-fix/01-before-desktop-full.png`
  - `skills-library-spacing-fix/02-before-mobile-full.png`
- Final production implementation:
  - `skills-library-spacing-fix/11-final-production-desktop-full.png`
  - `skills-library-spacing-fix/12-final-production-mobile-full.png`
- Focused same-state comparisons:
  - `skills-library-spacing-fix/15-final-desktop-before-after.png`
  - `skills-library-spacing-fix/16-final-mobile-before-after.png`
- Route and state: `/library`, disclaimer through the first `Governed agent verifier` card; first-card navigation exercised through the local production preview.

## Viewports and normalization

- Desktop: 1440 × 1000 CSS px, DPR 1. Browser full-page captures are 1434 × 2676 px before and 1434 × 2716 px after; the six-pixel difference from the CSS width is the browser scrollbar reservation.
- Mobile: 390 × 844 CSS px, DPR 1. Browser full-page captures are 384 × 5155 px before and 384 × 5179 px after; the six-pixel difference from the CSS width is the browser scrollbar reservation.
- Focused comparisons use matched 1200 × 620 desktop crops and 384 × 620 mobile crops from those current-run browser captures. No density resampling was needed.

## Findings and iteration history

1. **[P2 fixed] Catalogue blended into the introduction.** The first card started 113px below the disclaimer on desktop and 66px below it at 390px. The card grid therefore read as the next line of the hero rather than a distinct catalogue region, especially on mobile.
2. Added one catalogue-level spacing step using the existing responsive spacing rhythm: `clamp(1.5rem, 3vw, 2.5rem)`. No divider, decoration, new card, header movement or card-internal spacing changed.
3. Post-fix measurements are 154px on desktop and 90px at 390px. The focused comparisons show a clearer transition without weakening the relationship between the disclaimer and the list.
4. The `Governed agent verifier` card renders `href="/library/governed-agent-verifier"`. Clicking it in the production preview navigated from `http://127.0.0.1:3010/library` to `http://127.0.0.1:3010/library/governed-agent-verifier`; the origin remained unchanged. The detail page exposes no visible back/category link, so no additional label or route change was required.

## Required fidelity surfaces

- Fonts and typography: unchanged. Existing Inter and IBM Plex Mono families, weights, line heights, tracking and wrapping are preserved.
- Spacing and layout rhythm: only the catalogue's responsive top padding changed; the compact global header, hero, disclaimer, cards and footer retain their existing geometry.
- Colors and visual tokens: unchanged black, warm-white, orange and rule tokens; no new divider or decorative treatment was introduced.
- Image quality and asset fidelity: this boundary contains no new image asset; existing W mark and interface icons are unchanged.
- Copy and content: disclaimer, card metadata, heading, description, hash and CTA copy are unchanged. The stable `/library` route and relative detail route remain intact.

## Responsive, interaction and accessibility checks

- Desktop and 390px renders have no horizontal overflow (`scrollWidth` remains within the viewport after scrollbar reservation).
- The first card remains one semantic link with its accessible card content and keyboard behavior unchanged.
- The persistent Ask AI control, mobile header/menu, card focus treatment and all unrelated links are unchanged by this patch.
- The full Node 22 health suite passed after the production build.

## Evidence limits

- The current-run screenshots and DOM measurements establish visual spacing, responsive reflow and rendered href behavior. They do not replace screen-reader or browser-zoom testing.
- The existing fixed Ask AI trigger is visible in the mobile full-page capture; this scoped batch intentionally preserves its behavior and does not reassess that separate surface.

final result: passed

---

# Ask WitnessOps proof-theatre QA

## Comparison target and evidence

- Presentation source: `/workspace/scratch/704377652655/deck-reference-render/slide-4.png` from `SHOW ME THE RECEIPT — WitnessOps Agent Action Proof`.
- Existing product source: the production homepage and its pre-change Ask WitnessOps drawer.
- Matched source/implementation comparison: `/workspace/scratch/704377652655/ask-proof-deck-comparison.png`.
- Prompt-state capture: `/workspace/scratch/704377652655/ask-proof-desktop-prompt-final.jpg`.
- First result-state capture: `/workspace/scratch/704377652655/ask-proof-desktop-result-final.jpg`.
- Exact post-fix result and contact states were re-rendered in the cloud browser from the final standalone production build.

The final desktop browser viewport was 1363 × 936 CSS px. The drawer measured 520 × 760px at x=813, y=152. A separate 500 × 872 mobile browser pass confirmed the full-viewport treatment, focused input, visible paid offer and restored page state after dismissal. The checked-in UI proof additionally contracts the prompt, result and contact states at 390, 639, 640 and 1440px.

## Findings and iteration history

1. The original utility drawer did not carry the presentation's proof-object hierarchy. It was rebuilt as a black receipt chassis with a warm-paper fit signal, mono provenance labels, one orange commercial action, 1px rules and the existing homepage typography and tokens.
2. The primary paid action initially measured 40px. It now measures 44px and retains the full `Agent Risk & Control Review · From €1,500` context.
3. The provider-error branch initially looked like a fit result. It now states `PUBLIC GUIDE UNAVAILABLE / NO FIT CLAIM`, while the deterministic commercial classifier remains visibly bounded as `PUBLIC FIT SIGNAL / NO EVIDENCE REVIEWED`.
4. The first visual pass hid the human fallback and let a Workflow S request-shape label collide with the live offer. The fallback is restored, deterministic fallback suppresses that stale label, and AI-assisted success preserves the approved authority template without mutation.
5. The paid CTA was 6.8px below the result scroller's lower edge in the first production render. The final paper-body offset was reduced by 10px and a scroll-region assertion was added. On the exact final build at initial `scrollTop=0`, the CTA measured y=609.36–653.36, the scroll region ended at y=654.81, and `fullyVisible=true` with 1.45px clearance.

## Required fidelity surfaces

- Typography: existing Inter and IBM Plex Mono families remain in use; the deck's mono receipt labels and bold claim hierarchy are translated into the site's established scale.
- Layout: the drawer keeps the homepage's fixed desktop trigger and becomes a full-viewport panel on mobile. No homepage section or route was redesigned.
- Color and rules: site black, warm-white, orange and muted-rule tokens reproduce the presentation's restrained paper/ink system without gradients, glow or fake terminal chrome.
- Copy and boundaries: `NO EVIDENCE REVIEWED`, the fit-only disclaimer, source links and public-input warning remain explicit. No answer claims that evidence, safety, compliance, correctness or action outcome was verified.
- Conversion: the €1,500 offer appears before public guidance; its 44px CTA opens the on-page scope form without navigation or raw-prompt transfer.

## Interaction, responsive and accessibility checks

- Prompt → deterministic fit result → on-page work-email handoff works in the final standalone production build.
- The contact state visually hides the fit result, focuses the email input, stays at the homepage URL and does not submit without user input.
- Escape closes the drawer and restores focus to `Open Ask WitnessOps`.
- The close control, primary CTA and desktop trigger meet the 44px target contract; the input retains an accessible label and the drawer exposes named prompt/result/contact states for regression testing.
- The result starts at `scrollTop=0`; the paid action is visible before scrolling, while lower public guidance remains available in the same bounded scroller.
- Console inspection found no application error; only unrelated browser-extension metadata noise was present.

## Verification

- Final production build: passed across 173 routes.
- Web tests: 936 passed.
- Typecheck and lint: passed.
- Independent design/revenue review: passed with high confidence and no blocker.

## Evidence limits

- The local runner uses Node 24 while the repository pins Node 22; GitHub's pinned Node 22 and Chromium jobs remain the release-environment confirmation.
- The browser pass validates rendered layout, focus, keyboard dismissal and the conversion handoff; it does not submit a real contact request or establish screen-reader announcement quality.

final result: passed
