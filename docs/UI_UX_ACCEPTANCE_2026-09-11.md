# Current app UI/UX acceptance — 2026-09-11

## EXECUTIVE VERDICT

**ALMOST READY; hold unassisted external use of the combined product until P0/P1 below.**
External Exposure has a usable result/evidence journey. One Server Security Check
has working saved results but still assumes an operator has already supplied its
artifacts. This is a presentation and onboarding gap, not a request for a runner,
new proof format, schema, trust system or redesign.

Product code reviewed: `809efdd6eb11fd687bb769c8b736023aec380a1a` on
`feat/witnessops-app-foundation`. Checkout at review start:
`337905b2a25e2b80fe24ef5ca39255bc896bb3e8`, clean; only the preceding acceptance
document differs from the product head. Actual authenticated local runtime,
current source, DOM and fresh screenshots were used. Historical prototype and
pilot results were not substituted for this audit's visual evidence.

### Evidence and limits

Desktop: approximately 1280×720 CSS viewport; responsive checks: 390×844.
Screenshots were saved and visually inspected, retained privately outside Git.
The image gallery accompanies this audit in operator custody; IDs below are its
numbered screenshot filenames, not public artifact links.

| Step / evidence | Surface and health |
| --- | --- |
| 01 | Authenticated overview: misleading unscoped attention summary |
| 02 | EE add/ten checks: clear preview, no collection started |
| 03 | Linux add: inherited EE copy contradicts execution model |
| 04, 09 | Linux import/history desktop/mobile: usable inputs, missing acquisition guidance |
| 05 | First live run: opens; no-baseline panel unnecessarily complex |
| 06 | Second live run: comparison opens, results below technical header |
| 07, 22 | Linux report/provenance desktop/mobile: readable report and wrapping hashes |
| 08 (PNG) | Mobile Linux saved run: no horizontal overflow, result too far below actions |
| 10 | EE asset: strong explicit unknowns, visible rerun affordance |
| 11 | EE first saved baseline: clear reason to return |
| 12 | EE comparison/feedback: understandable split, repetitive uncertainty text |
| 13, 14 | EE evidence desktop/mobile: sound structure, weak diagnostic recovery language |
| 15 | Reports index: EE first; Linux appended oldest-first and links to run route |
| 16, 17 | EE report/print-media layout: source boundary intact; count/status terminology confusing |
| 18 | Settings: incorrect blanket unsigned statement and EE-only collection description |
| 19 | Members: clear role display; intentionally no invitations |
| 20 | Existing-session `/login` handoff returns overview; not a fresh-login capture |
| 21 | Nonexistent run: safe not-found with recovery link |

Both existing Linux runs reopened through normal UI. No collection, import,
source download, signing, feedback submission, membership edit or new asset was
performed. Normal page-view/print-request telemetry may be recorded by the app.
Both PDF buttons were clicked; print-media presentation was inspected. No saved
PDF, pagination completeness or native print-dialog usability is claimed here.
Viewport/print emulation was restored after review.

Fresh WorkOS login, multi-workspace selection, empty workspace/empty Linux asset,
Viewer/revoked sessions, forced invalid upload, DB outage and forced 429 were
**source-reviewed only**. The available account already had one workspace and
saved runs; `/login` returned to it. No auth bypass or runtime failure injection
was used to manufacture screens. These are follow-up visual acceptance gaps,
not reported as passing browser tests. Actual not-found and EE unknown states
were inspected. No full accessibility compliance claim is made.

## WHAT TO KEEP

1. **KEEP K1:** EE outcome counts plus explicit “Clear ... not an overall security
   grade” and named Undetermined links (10). Unknown is not presented as secure.
2. **KEEP K2:** Ten-check preview and separate authorization checkbox before EE
   collection; adding an asset does not collect (02, source `RunControl`).
3. **KEEP K3:** Evidence detail order: observed → meaning → next step → unknowns;
   raw source/provenance are expandable (13/14).
4. **KEEP K4:** Environment/Coverage separation, explicit gaps, stable baseline
   link and immutable history explanation (06/11/12).
5. **KEEP K5:** Existing buyer report, source download distinction, package checks
   versus host security, and explicit partial update limitations (05/07/16/22).

## P0 FIXES

**FIX F1 — Overview scope is misleading (01; `Overview` in `product-app.tsx`).**
“Assets 3” counts both products, but “Need attention None” and change metrics use
only `exposureAssets`. The Linux source has recorded high/medium findings which
are not included. The surrounding workspace/asset presentation makes the metric
look broader than it is. This is a security-sensitive summary ambiguity, not a
newly discovered evidence or authorization defect.

Smallest correction: explicitly label the block **“External Exposure summary”**,
use **“Public assets”** for its denominator and **“Public assets needing attention”**
for its count. Keep a separate neutral total if useful. Linux row should link to
its latest saved check; do not combine severity with EE attention into a new score.
A mixed-workspace fixture must prove Linux omissions cannot read as “nothing
needs attention across this workspace.”

## P1 FIXES

- **ADD A1 — Explain how to obtain the Linux files before asking for them** (04).
  Add a short operator-assisted start panel: “Don't have a Proofpack? Arrange your
  first One Server Security Check with WitnessOps.” Explain that the authorized
  operator runs the accepted local read-only procedure and returns the ZIP plus
  matching signature; the app does not connect to the server. Link the existing
  contact channel and approved instructions when available. Do not invent a
  self-service download, signing service or credential workflow.
- **FIX F2 — Make add-asset and shared product copy type-specific** (03/18).
  Linux currently shows public-domain examples and “You will authorize collection
  separately on the asset page.” That next page imports only. Use “Add a Linux
  server”, placeholder `server-01`, and “Enter the hostname recorded in your
  signed Local Audit package. This can be a local hostname. Adding it does not
  connect to the server. Next, import the ZIP and matching signature.” Keep EE
  public-target validation unchanged. CTA: “Add Linux server”. Fix “an signed”.
- **FIX F3 — Correct source-signature/data explanation** (18).
  Replace “Reports and sources are unsigned” with “External Exposure observations
  are unsigned. Local Audit imports retain their signed source package. Reports
  are derived presentations.” Settings must describe both execution models,
  without changing trust, data retention or storage behavior.
- **FIX F4 — Clarify EE report outcomes without changing values** (16/17).
  The page reports five determined results; report says “Observations completed
  6/10” beside “Undetermined 5”. These measure collected data versus determined
  outcomes, not bad arithmetic: redirect evidence exists but its outcome is
  undetermined. Say “Checks with collected evidence: 6/10” and “Checks with a
  determined outcome: 5/10” or explain this distinction beside the existing
  metrics. Keep raw counts unchanged. Present CAA as “Informational observation;
  severity not assessed” rather than leading with an unassessed-severity finding
  that appears more concerning than its status. Do not assign severity.

These are the strict P0/P1 list. History polish, badges, spacing and technical
appendix cleanup are not promoted into blockers. The Linux assisted route must
exist before an unassisted invite; founder narration during an audit is not UI.

## P2 / POLISH

- **FIX F5:** Linux history is oldest-first in the inspected runtime; EE is newest
  first. `LinuxHistory` maps the provided array without sorting. Sort a copy by
  existing import ordering, latest first; label observed and imported times
  consistently with timezone. Do not change baseline-selection logic.
- **FIX F6:** Linux `/runs/:id` and `/reports/:id` render the same wrapper, so “Open
  report” is a self-link on the report route. Hide that link there; report index
  Linux entries should point directly to the report route. No new report system.
- **FIX F7:** Move the compact result/priority findings before export/provenance
  and comparison boilerplate. Keep one primary “View report”/print action and
  place exact-source downloads in secondary provenance controls. Mobile currently
  spends the first screen on actions/qualification before results (08).
- **FIX F8:** Replace Linux first-run three-column comparison with “First saved
  check. Import a later check for this server to compare. This run remains saved.”
  “No additional collection uncertainty reported” under no baseline can be read
  as a collection conclusion despite the run being partial (05).
- **FIX F9:** Add dates to Linux baseline/current comparison header, and explain
  “collection gap” as “Some evidence is unavailable; comparison is limited.”
  Retain detailed identity qualification in expandable context (06).
- **FIX F10:** `tls_error`, `normal_tls_budget`, “separately scoped follow-up”,
  snake_case section names and raw JSON need plain-language summaries before
  technical details. Do not infer the cause of a TLS failure (13/14).
- **FIX F11:** Space Linux import headings/paragraphs like EE cards. Several
  consecutive paragraphs and headings have zero margin from global reset (04).
- **FIX F12:** Replace the two app login-method CTAs with one “Continue to sign in”
  plus “Choose Google or email on the next screen”, unless actual method-specific
  links are supported. Both currently point to `/login` (source only).
- **FIX F13:** Keep neutral “WitnessOps / Early Access” navigation on mixed-product
  pages; “External Exposure” everywhere makes Linux feel bolted on (01/03/18).

## MISSING BUT NECESSARY

| Classification | Missing element | Minimal completion |
| --- | --- | --- |
| ADD A1 / P1 | Linux artifact-acquisition step | Operator-assisted instructions/contact before upload; no runner |
| ADD A2 / P2 | Linux empty-history guidance | “No saved checks yet. Import your first signed package above.” |
| ADD A3 / P2 | Error recovery actions | Retry where safe, Back to asset, contact help; preserve terminal denials |
| ADD A4 / P2 | Dated Linux comparison/next check | Current/baseline observed dates and “Import another check” linking to existing asset form |
| ADD A5 / P2 | Linux feedback route | Existing contact link with product context; do not assume EE feedback API accepts Linux runs |

No separate display-name schema is required for these fixes. The current app
requires recorded hostname and assigns an asset UUID; describe this honestly.

## REMOVE / HIDE

- **REMOVE/HIDE R1:** `App run <UUID>` from the primary Linux subtitle; retain in
  provenance. Move `linux_baseline_v1`, verifier/registry identifiers and schema
  versions out of history/main result copy.
- **REMOVE/HIDE R2:** Duplicate “Open report” on its own route; repeated paragraphs
  that describe the same unknown twice. Preserve the underlying limitation once.
- **REMOVE/HIDE R3:** “PostgreSQL” and “WorkOS AuthKit” as normal settings facts;
  replace with what the user can do and what remains saved. No behavior change.
- **REMOVE/HIDE R4:** “Owner decision: Not recorded” as a prominent KPI when no
  owner-decision workflow exists. Keep the non-approval boundary in limitations;
  do not build an approval system to fill the card.
- **REMOVE/HIDE R5:** EE-only recommended checks on generic settings; keep on EE
  creation/asset pages. Dev Tools badge is local Next chrome, not a production
  product defect; do not redesign around it.

## DEFER

1. **DEFER D1:** Scheduler, monitoring notifications and Watch. Existing manual
   rerun/import can explain return value without implying automation.
2. **DEFER D2:** Update/patching/reboot workflows. Recommendations are not execution.
3. **DEFER D3:** SSH/remote runner, credentials, daemon, agent/chat. Missing Linux
   onboarding calls for instructions/operator handoff first.
4. **DEFER D4:** Windows/cloud/new collectors/MSP hierarchy. No observed screen gap
   requires broader target support to finish the current products.
5. **DEFER D5:** Custom analytics/admin dashboards, advanced sharing and billing.
   Keep existing report/print/source and contact paths; do not build a platform
   to resolve navigation/copy issues. Linux native feedback persistence can wait
   if an existing contact channel is clearly available.

## EXTERNAL EXPOSURE REVIEW

| Screen | User job / next action | Boundary, missing item or noise | Disposition |
| --- | --- | --- | --- |
| Entry | Sign in, choose workspace | Landing copy explains EE only; both method links same target. Fresh auth not exercised | FIX F12/F13 |
| Empty assets | Reach first value through Add asset | Source promises public-hostname-only start; fails to introduce Linux choice | FIX F13; retain EE-specific explanation after choice |
| Add asset (02) | Know scope before saving | Ten named checks, no collection on add, public hostname examples useful; “without scanning” introduces extra term | KEEP K2; FIX CTA to “Add hostname” |
| Asset (10) | See latest outcome, authorize rerun | Unknowns visible; two rerun links are anchor plus actual submission, not duplicate execution | KEEP K1/K2 |
| First saved run (11) | Understand baseline and return value | Clear baseline wording. Fresh empty/pre-execution asset not present in account | KEEP K4; source-reviewed empty path |
| Saved result/comparison (12) | Assess changes without raw JSON | Environment/Coverage explained; Not comparable is EE's uncertainty heading, unlike Linux | KEEP split; FIX F9/F10 naming for consistency |
| Evidence (13/14) | Understand fact, limit, next action | Strong hierarchy; terse error enum and generic follow-up fail to tell user what to do | KEEP K3; FIX F10 |
| Report (16/17) | Send readable result to recipient | Unsigned boundary clear, but count bases and informational severity framing obscure interpretation | KEEP K5; FIX F4 |
| Feedback (12) | Say whether useful | Optional Yes/Not really, comment after selection, no interruption; no submit performed | KEEP; do not add NPS |

“External Exposure Check” should appear in product selection and EE pages;
“observation” remains useful for describing a saved point-in-time result, not as
an unexplained alternative product name. One run's ten public checks are clear.
Clear can sound like secure in isolation, but current per-check disclaimer is
appropriately adjacent. Unknowns are sufficiently prominent on run pages. A
returning user can compare snapshots, but cannot know exactly when a change
occurred between them; keep that limitation. The next step for substantive
findings is available in detail; unknown error recovery is the weak spot.

## ONE SERVER SECURITY CHECK REVIEW

| Screen | User job / next action | Boundary, missing item or noise | Disposition |
| --- | --- | --- | --- |
| Product/add (03) | Register correct server hostname | Public examples and collection promise conflict with import-only path | FIX F2 |
| Import (04/09) | Supply existing signed result | Two file controls work structurally; no explanation where files come from, supported platform or matching signature | ADD A1; keep two-artifact contract |
| History (04/15) | Open latest check | Oldest first; dense profile/admission text, “Recorded” differs from “Live server check” | FIX F5; REMOVE/HIDE R1 |
| First run (05) | See result, understand no comparison yet | Live label correct; technical no-baseline panel dominates first result | KEEP label; FIX F7/F8 |
| Second run (06/08) | Answer what changed | No comparable value change, no coverage change, persistent update gap are explicit; dates missing | KEEP split; FIX F9 |
| Findings/report (07) | Prioritize next investigation | Severity, observed facts, recommendations and limits present; listener observation is raw JSON | KEEP K5; FIX F10 formatting only |
| Provenance (22) | Retain independently checkable source | Hashes wrap; retained ZIP/signature separate from report. “Local browser verifier” is misleading in app server verification context | KEEP artifacts; FIX location label without changing verifier |

A normal technical user cannot currently obtain a supported signed Proofpack
from app guidance alone. ZIP plus signature is reasonable once explained as two
files delivered together; it is premature as the first instruction. No bundled
upload redesign is necessary. “Package checks Passed” is qualified and does not
say server secure. Partial appears as 10/11 complete and named updates gap, so it
is not a failed-server verdict, but explain this nearer the title/history.
Listeners remain needs-review with no public-reachability inference. Suggested
next steps are present in the report. Recheck value is visible through comparison,
but an explicit return-to-import action would remove a navigation guess.

## FIRST-RUN JOURNEY

1. **Entry (source-only fresh state):** two login-method links both lead to one
   hosted chooser; workspace creation asks only a name, correctly not ownership
   proof. One available workspace auto-opens. No new workspace needed for audit.
2. **EE:** Add hostname → preview ten checks → save → authorization → Run
   observation → saved result/evidence/report. Data needed is one public hostname
   and explicit authority. Existing empty-history copy says nothing collected.
   KEEP this sequence; use one consistent Check/observation vocabulary.
3. **Linux:** choose Linux → exact recorded hostname → save → two file upload.
   Missing step occurs before hostname: “How do I obtain the files?” ADD A1 and
   FIX F2 are required. Current supported pilot is one Ubuntu host; do not imply
   all Linux distributions are supported merely through generic copy.
4. **Data explanation:** say original imported files stay saved privately in the
   workspace and report is derived; give existing contact path for retention
   questions. Do not promise automated deletion (F3).
5. **First value:** prioritize result/findings, not an empty comparison or UUID.
   Never create a fake baseline or change collection semantics to simplify UX.

## RETURNING-USER JOURNEY

- EE latest asset and newest-first history answer when checked; rerun copy names
  after-change/customer-review use cases. KEEP.
- Linux latest comparison exists below import/history, but oldest-first rows and
  date-free baseline link require extra reading. FIX F5/F9.
- Both reports retain source and observation times. Mark older opened runs with
  “Historical check” plus “View latest check” using existing history; this is P2,
  not a claim that evidence expires after an arbitrary duration.
- Comparison identifies recorded differences, not time/cause of real changes.
  Keep Environment/Coverage/Uncertainty separate; prefer “Not comparable” as a
  plain explanatory sublabel rather than silently dropping that category.
- Linux report route repeats saved-run comparison while its single-run report
  correctly says it does not establish a before/after. Clarify “App comparison”
  versus “Report for this check”; do not create a comparison PDF.

## COPY / TERMINOLOGY

| Term / observed usage | Decision and exact direction |
| --- | --- |
| verified / valid / Passed | KEEP scoped “Package checks passed”; avoid “verified server”. In EE say “Source data checks passed”, not generic verified |
| secure | KEEP negations/non-claims; none of the inspected report copy claims secure |
| Clear / passed | KEEP Clear with adjacent scope; display “matched expected conditions”, avoid switching to “passed” for the same EE outcome |
| failed / partial | FIX recovery wording to distinguish request failure from incomplete evidence; “Partial collection: 10 of 11 areas complete” |
| synthetic / live / Recorded | KEEP actual flag-based label; FIX history to “Live server check”/“Synthetic check” consistently |
| proof / Proofpack | KEEP Local Audit signed package usage; explain matching ZIP/signature once. EE source is unsigned observations |
| evidence / source / report | KEEP exact files as source, report derived; FIX blanket unsigned data note |
| check / observation / scan / audit / review | FIX primary product labels and CTA “Add hostname”; reserve Local Audit for producer identity, review for human follow-up. Do not rewrite source metadata |
| ExternalSnapshotV1 / LinuxServerSnapshotV1 | First appears only advanced EE detail; KEEP in advanced provenance. No Linux schema name seen in main UI; do not introduce one |
| workflow_class / source-type enums | Not seen in normal app chrome; HIDE from ordinary summaries, keep exact raw source |
| proof_run_id / UUID | MOVE to advanced provenance except support reference when needed |
| registry digest / collector fingerprint / method IDs | KEEP full exact values in provenance/source; HIDE from history/main result. Never remove from authoritative artifacts |
| `proofpack-report/1.4`, `external-demo-v0.1` | Preserve exact identifiers in appendix; MOVE out of repeated buyer-facing footers when possible; never rename recorded method |
| “Owner decision: Not recorded” | REMOVE prominent card; keep non-approval statement |

## CTA REVIEW

| Current CTA | Grade | Exact proposed behavior/copy |
| --- | --- | --- |
| Add asset | GOOD | Keep global entry; neutral product choice |
| Add without scanning | UNCLEAR | “Add hostname” / “Add Linux server”; supporting no-execution line |
| Run observation | UNCLEAR naming, sound behavior | “Run External Exposure Check”; authorization remains required |
| Run again | GOOD | Keep; target and authorization visible |
| Import Security Check | GOOD after guidance | Keep, add “ZIP and matching signature supplied by your operator” |
| How do I get a Proofpack? | MISSING | “Arrange your first server check” via existing contact path |
| View report | GOOD | Keep near outcome |
| Open report on report route | DUPLICATE | Hide self-link; index targets `/reports/:id` |
| Save report as PDF | UNCLEAR delivery | “Print / Save PDF”; say browser dialog opens, no stored PDF promised |
| Download original ZIP / detached signature | GOOD technical utility | Secondary source/provenance group; retain both files |
| Download source JSON | GOOD | Keep EE advanced/result report action |
| Inspect evidence | GOOD | Keep on EE observations; Linux structured finding evidence link/anchor is P2 |
| Open comparison baseline | UNCLEAR date | “View previous check — [observed date]” |
| Import another check | MISSING | Link existing Linux asset upload form; no capture launched |
| Send feedback / Not now | GOOD | Keep optional and separate from evidence |
| Retry saved check | MISSING | Bounded new user-initiated reopen after failure; no auth/verification bypass |
| Continue with Google / email | UNCLEAR source behavior | One chooser CTA unless methods actually preselected |

## ERROR STATES

Except noted, these were inspected in source, not manufactured in the live account.

| State | Current presentation | Recovery recommendation / classification |
| --- | --- | --- |
| Stale dev singleton | Can produce stale validation error; no tailored UI | DEFER dev follow-up: restart dev runtime, do not expose Symbol name to users |
| Missing migrations / workspace 500 | “The workspace could not be loaded.” with sign-in surface | FIX P2: “Workspace temporarily unavailable. Retry or contact WitnessOps.” No DB/stack details |
| Verification busy 429 | “Verification is busy. Retrying…”; explicit code only, max three retries | KEEP; source-confirmed, not forced in this audit |
| Retry exhausted / reverify failed | “This saved check could not be accessed or reverified.” | ADD Back to asset/Retry/support. Do not claim source corruption without evidence |
| Invalid package / wrong signer or purpose | “Local Audit package verification did not pass. No run was admitted.” | KEEP bounded denial; ADD “Check the original ZIP and its matching signature, or contact your operator.” Never suggest arbitrary registry upload |
| Hostname mismatch | “The package hostname does not match this Linux server asset.” | KEEP; ADD choose correct existing asset; do not auto-substitute hostname |
| Viewer import | “Viewer access · Only an Owner can import a check.” | KEEP role explanation; no fake enabled import button |
| Foreign/missing run (21) | “Run not found. This item is not in the current workspace.” + Back | KEEP non-disclosing behavior; this audit tested nonexistent, not foreign session |
| Revoked member | Access denied through workspace handling | KEEP denial; improve same generic recovery without confirming foreign data |
| Partial collection (05/06/07) | Partial history, 10/11 report, named gap | KEEP evidence, FIX proximity/plain wording; not a failed host |
| No baseline (05/11) | EE clear first baseline; Linux empty columns | FIX F8; no invented comparisons |
| Source download fails | “Original source could not be reopened and verified.” | ADD safe retry/back; downloader does not use busy retry helper, so concurrent downloads can show terminal wording (source-based risk, not reproduced) |
| Capacity/size | “Workspace import capacity reached” / unaccepted size | ADD supported limits near upload and contact path; do not raise backend limits |

Loading: main Linux page has a status message and cancels stale requests on
navigation. `LinuxChangesLoader` on asset page is initially blank until result or
busy state; ADD “Loading comparison…” as P2. Main workspace initially renders
sign-in heading while loading even for an existing session (observed in first
DOM read); use neutral “Loading workspace…” without implying sign-out. Reopens
in this audit succeeded; absence of a forced 429 is not retry-storm testing.

## MOBILE / DESKTOP

- KEEP responsive single-column comparison, wrapped buttons, labelled native file
  controls and long digest wrapping. Mobile report/evidence/import inspected at
  390×844; sampled document width did not exceed viewport.
- FIX priority/length, not a visual-system replacement: first Linux result is far
  below the fold after UUID, three export controls and comparison disclaimers.
- No horizontal clipping or inaccessible primary control was confirmed in the
  sampled views. Long finding JSON and dense history remain hard to scan.
- Menu opened with `aria-expanded` and navigation worked. Source has skip link,
  visible focus styling, labelled inputs and disabled authorization actions.
  Keyboard-only full journey, screen-reader behavior, zoom 200%, all contrast
  pairs and actual narrow native upload/print dialogs remain untested.
- Quiet 11–12px copy is visually small; P2 readability review, not an unsupported
  WCAG failure claim. Multiple H1s in Linux wrapper + report may complicate heading
  navigation; test and choose one route-level heading without rebuilding report.
- Print-media screenshot excludes app navigation. Screen capture is not proof of
  all PDF pages, page breaks, saved bytes or recipient rendering.

## VISUAL CONSISTENCY

KEEP the dark app language, restrained primary button and report's existing
editorial styling. EE uses better grouped result cards and paragraph spacing;
Linux has dense ungrouped prose and native select/file controls. FIX spacing and
shared action priority using existing CSS/components. Do not add more badges,
new navigation hierarchy, animations or a second report renderer. Report chapter
contrast is intentional, not by itself an inconsistency to redesign.

## EXTERNAL-USER READINESS

P0 F1 and P1 A1/F2/F3/F4 should be closed before unassisted mixed-product use.
The evidence does not establish a broken verifier, data loss, bad import or mobile
layout blocker. Actual technical users should then try the flow without coaching.
Do not mistake the accepted operator pilot for comprehension/demand evidence.
Fresh sign-in, empty-state, Viewer and error recovery visual checks still need
controlled acceptance. No DB migration or new feature is justified by this audit.

## RECOMMENDED IMPLEMENTATION ORDER

All are proposals only; no product code changed in this pass. Prefixes below are
relative to `apps/witnessops-app/` unless explicitly web report paths.

| Order / priority | Screen, exact issue and desired change | Likely files | Required test |
| --- | --- | --- | --- |
| 1 / P0 FIX F1 | Overview: scope EE-only attention/change metrics and denominator explicitly | `src/components/product-app.tsx` | Mixed EE/Linux workspace with Linux high finding never implies workspace-wide None |
| 2 / P1 FIX F2/F3 | Linux add/settings/access: correct execution and signed-source copy; neutral shared shell | `src/components/product-app.tsx`, `src/components/early-access.tsx`, `src/lib/early-access.ts` | Both selected products, live/synthetic labels, EE validation unchanged |
| 3 / P1 ADD A1 | Import: operator-assisted acquisition/help before files, explicit supported scope | `src/components/linux-check.tsx`, approved existing help/contact content | New user can identify how to obtain both files; no credential/runner or signing CTA |
| 4 / P1 FIX F4 | EE report: collected versus determined; informational CAA wording | web `src/components/proofpack/buyer-report.tsx`, existing EE report adapter if necessary | Exact counts/statuses unchanged; partial redirect, CAA informational, report/print regressions |
| 5 / P2 FIX F5/F6/F8/F9 | History/latest-first, direct report links, first baseline and dated comparison | `src/components/linux-check.tsx`, `product-app.tsx` | Two-run order, exact baseline unchanged, no self-link, first-run gap not misrepresented |
| 6 / P2 FIX F7/F10/F11 + ADD A2/A4 | Result first, readable evidence, empty history, next-import link, spacing | same components, `src/app/globals.css`; shared report only narrowly | Desktop/390px, all findings and full provenance retained, no PDF semantic changes |
| 7 / P2 ADD A3/A5 + FIX F12 | Safe recovery and existing contact feedback; honest sign-in chooser | `linux-check.tsx`, `product-app.tsx`, existing contact utility | 401/403/404/invalid remain terminal; explicit busy retry bounded; no new feedback API |
| 8 / acceptance | Fresh-user, empty, Viewer, invalid/busy and saved-PDF visual pass | Existing browser tests/fixtures only | No live collection/import/signing required for UI fixtures; no source mutation |

Run focused browser/component checks for each authorized patch, then app/report
regressions and relevant security diff review before commit. Do not implement
this plan until a separate patch slice is selected. NO PUSH / MERGE / DEPLOYMENT.

## P0/P1 implementation status — 2026-09-11

This addendum supersedes only the P0/P1 status above; the original audit remains
an account of the reviewed baseline. Implementation started at `8fd5ee9b7ccfd20ee3a09ae7b92c1f94e5605d56`.

| Item | Status | Correction |
| --- | --- | --- |
| P0 F1 | Resolved | Overview labels all four metrics External Exposure and counts only public assets; Linux remains separately accessible. No cross-product severity aggregation. |
| P1 F2 | Resolved | Linux creation explains recorded hostname, no network scan and subsequent signed-package import; EE instructions and validation unchanged. |
| P1 F3 | Resolved | Data note distinguishes unsigned EE snapshots from signed Local Audit packages and pinned trust; reports remain derived and signatures do not prove source truth. |
| P1 A1 | Resolved | Before upload, three operator-assisted steps explain local collection, off-host finalization/signing and import. Existing contact email reused; no installer, credential flow or new support URL. |
| P1 F4 | Resolved | EE report says “Checks with collected evidence”, separately counts determined outcomes and labels informational-only observations as context, not attention flags. Source counts, null severity and unknowns unchanged. |

Focused validation: app unit tests 54/54; shared report tests 59/59; existing app
browser cases 53/53 and four new desktop/mobile cases 4/4 across Chromium/WebKit.
The first browser pass exposed test-harness assumptions about view-event POSTs
and duplicate screen/print DOM; corrected without product behavior changes.
The shared unassessed-report assertion now expects the informational label while
still requiring null severity and original disposition. Three existing saved-EE
PDF fixture cases pass (clean, attention, long evidence).

Visual review: all six affected surfaces inspected at laptop and 390px widths,
including the authenticated local workspace and existing records. No horizontal
overflow or new competing primary CTA; acquisition guidance precedes upload.
Screenshots retained privately outside Git. No real asset/run was created or
imported, and no collection or signing occurred. Normal view telemetry may occur.

P2 remains deferred and untouched: history sorting, report self-link, dated
comparison, next-import CTA, feedback, empty states, diagnostics, result hierarchy
and recovery behavior. No DB, authorization, verifier, trust or snapshot changes.

Full Node 22 `pnpm health`: PASS, including both builds, lint/typecheck, app and
web tests, buyer smoke, route parity and documentation checks. Four public EE
report screen/print regressions also pass across Chromium/WebKit. Existing EE
label assertions were updated to the new collected-evidence wording; numerical
assertions remain unchanged. `git diff --check`: PASS. Security diff review found
no new findings; original scan snapshot and later test/docs addenda were reviewed
separately. This records local acceptance only, not deployment or customer validation.

## Post-P0/P1 Recheck

**READY FOR DISCOVERY.** Rechecked clean product HEAD
`2257215f80b1a5bc98b957c36f90bb84f9b5604c` in the authenticated local runtime.
No new P0/P1 regression found. This permits the next discovery decision, not
implementation, deployment or a claim of externally validated demand.

| Original item | Running UI result |
| --- | --- |
| P0 F1 overview scope | RESOLVED: attention, denominator and change labels explicitly say External Exposure; Linux remains a separate asset/check path. |
| P1 F2 Linux creation | RESOLVED: recorded-hostname examples, no network scan, next step import. EE public-hostname instructions and ten-check preview remain. |
| P1 F3 source/trust copy | RESOLVED: unsigned EE, signed Local Audit under pinned policy, derived reports and no host-security/source-truth inference. |
| P1 A1 acquisition | RESOLVED: operator-assisted local capture and off-host signing explained before upload; existing contact link present; no fictional installer. |
| P1 F4 report wording | RESOLVED: actual EE report shows 6/10 collected versus 5 determined, 1 informational and 5 undetermined; informational is explicitly context, not an attention flag. |

First-run check: EE **OK** (add hostname → preview → explicit observation);
Linux **OK for the stated assisted workflow** (record hostname → obtain signed
files with operator help → import). Purpose, first CTA, execution difference and
next step are visible. No new asset/import/collection was performed. Fresh
WorkOS sign-in and full empty-workspace onboarding were not repeated.

Saved-run check: EE **OK**, with reachable report/evidence and named unknowns;
Linux **P2 only**, with correct Live server check, reachable report, explicit
collection gap and unknown security-update count. Existing first Linux run says
no baseline; second run references the first and separates Environment/Coverage/
Uncertainty. No fabricated comparison or positive conclusion from partial data.

| Known polish | Classification after recheck |
| --- | --- |
| History ordering | STILL P2 |
| Report self-links | STILL P2 |
| Comparison headings / no-baseline phrasing | STILL P2 |
| Feedback placement | STILL P2 |
| Empty states | STILL P2 (source/fixture spot-check; no new empty workspace) |
| Raw diagnostic language | STILL P2 |
| Result hierarchy | STILL P2 |
| Recovery copy | STILL P2 |

Error spot-check: actual missing run returns scoped not-found plus recovery link;
actual no-baseline and partial Linux states remain explicit. Deterministic browser
fixtures confirm verification-busy retry succeeds and budget exhaustion becomes
terminal; unit tests retain no-retry behavior for access/verification failures.
No forced real membership changes, malformed upload or production error injection.

Desktop and 390px review: no new overflow, clipped action, unreadable count or
competing primary action; Linux guidance wraps before upload. Fresh screenshots
remain outside Git. Browser fixtures cover all six affected screens at both widths.

Fresh checks on Node 22: `pnpm app:test` **54/54**; `pnpm test:app-browser
ux-p0-p1.spec.ts linux-check.spec.ts` **20/20** across Chromium/WebKit; web report
and EE adapter tests (`report*.test.tsx`, `external-exposure/adapter.test.tsx`)
**91/91**; `pnpm --filter @witnessops/app typecheck` **PASS**;
`git diff --check` **PASS**. No shared code changed, so full health was not rerun.
Only this short audit addendum changed. Discovery/onboarding implementation and
all P2 work remain unstarted. No push, merge or deployment.
