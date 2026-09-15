# Early Access cohort: learn before the next build

Early Access infrastructure is ready. Product discovery and next-phase development continue.

## Purpose and boundaries

Admit 3–5 named external users with a real public hostname they are authorized to
observe. Prefer technical founders, small SaaS operators, infrastructure leads,
MSPs, consultants or agencies. Record company type and intended job before
admission. No anonymous cohort, broad promotion, unrestricted product signup,
new collectors, billing wiring or other feature expansion in this observation
window. Do not choose a next product from one enthusiastic user.

Use the existing [access model](../apps/witnessops-app/README.md#early-access-cohort)
and [launch runbook](EARLY_ACCESS_LAUNCH.md) for operations. This document adds no
admin endpoint, identity mechanism, infrastructure or membership authority.

## Manual admission and pause

1. Founder selects the intended person, confirms company/use case and authorized
   hostname, and records a contact/invitation date in a private research record.
   Send only a personally approved message to that named recipient. No automated
   invitation system or domain-based enrollment exists.
2. Ask the person to sign in at `https://app.witnessops.com/login`. A new identity
   has no Early Access entitlement. Match the resulting internal UUID and WorkOS
   provider/issuer/subject with the intended person through the approved operator
   channel. Email is a contact/verification snapshot, never the durable key.
3. Through the existing restricted production operator database path, inspect the
   exact identity mapping and current access state. Set only that verified user's
   state to `invited`, using a transaction and parameterized values. Require one
   returned row before COMMIT; otherwise ROLLBACK and investigate. Record the date,
   internal reference and operator decision privately. Never bulk-enroll accounts.
4. The invited user explicitly activates access in the product, then creates their
   own workspace (atomic Owner membership) or opens an existing authorized one.
   Record the resulting workspace UUID. Do not manually fabricate memberships or
   upgrade a Viewer as part of admission. Recheck the intended user/workspace.
5. To pause, set only the verified user's state to `paused`; confirm subsequent
   product access is denied. This does not delete evidence. Membership revocation
   is a separate existing authorization control. Re-admission requires a new
   explicit operator decision; use `invited` again, not an automatic grant.

Production operator SQL shape (bind all values; not a copy/paste live enrollment):

```sql
UPDATE users u SET early_access_state=$2, updated_at=now()
WHERE u.id=$1 AND u.status='active' AND $2 IN ('invited','paused')
  AND EXISTS (SELECT 1 FROM identity_mappings i WHERE i.user_id=u.id
              AND i.provider=$3 AND i.issuer=$4 AND i.subject=$5)
RETURNING u.id, u.early_access_state;
```

Allowed operator states here: `invited` or `paused`. The existing
`early-access.mjs` helper is **local-development only**; do not repoint its
configuration at production. Provider authentication alone is not product access.
An active entitlement alone never grants workspace membership or Owner writes.

## Activation and observed use

**Product activation = successful sign-in + an asset added + first completed
saved observation.** Signup and the `early_access_activated` entitlement event
alone do not count. Track invited → signed in → asset added → first run separately.

Let users attempt the existing journey without coaching: sign in → workspace →
hostname → ten recommended checks → explicit observation → result → evidence →
report/export → leave → return → rerun → comparison. Help only when blocked;
record where help was needed. Adding a hostname must not collect automatically.

| Question | Existing evidence and limitation |
| --- | --- |
| Invited / signed in | Private admission record; first mapped identity confirms first sign-in, not every login. No dedicated sign-in event exists. |
| Entitlement active | `users.early_access_state`; `early_access_activated` event is not product activation. |
| Asset added | `asset_added` plus workspace asset confirmation. Events are best-effort; absence is not proof of no action. |
| First run | Completed `runs` row attributed to the user/workspace; not merely `observation_started`. |
| Evidence / report | `evidence_opened`, `report_opened`; opening is not proof of understanding/value. |
| PDF | `pdf_export_requested` records print intent. Confirm a saved PDF or actual sharing with the user; no `pdf_exported` event exists. |
| Source download | `source_json_downloaded`; no claim about later use. |
| Rerun / second completion | `rerun_started` and a second completed run for the same asset. Separate started from completed. |
| Comparison | `comparison_viewed`; viewport entry, not comprehension. |
| Feedback / deeper review | `feedback_submitted`, `product_feedback`, `deeper_review_clicked`. Clicks are not purchases. |
| Returned | Founder confirmation or a later-day action; deduped views cannot prove every return/session. |

Events are bounded, deduped adoption records, not click totals or security
evidence. Preserve unknowns when best-effort telemetry is missing. Use explicit
cohort UUIDs and workspace UUIDs; exclude operator/synthetic fixtures and all
pre-admission activity. Compare user-level counts, not raw event totals.

## Feedback and founder loop

Existing optional prompts remain unchanged:

- After the first saved baseline: “Did this result tell you something useful?”
  Yes / Not really; “What was useful or missing?”
- After comparison: “Was this comparison useful?” Yes / Not really;
  “What would you want WitnessOps to check next?”

One response or dismissal per user/workspace/surface; do not repeatedly prompt.
Feedback failures must not block use. Treat comments as untrusted text and product
research, never as saved-run evidence. Do not copy source JSON, secrets or private
customer evidence into research records. Limit internal access to the founder
and explicitly authorized researchers; handle deletion through the existing
operator process. No automated research retention period is promised.

After sign-in check for blockers without interfering. After first run inspect
completion, evidence/report use and feedback. After a second run inspect whether
comparison mattered. After 3–7 days send one personally approved follow-up:
“What would make you come back to WitnessOps?” This is a manual cadence, not a
scheduled automation created by this slice.

After use, select a few questions conversationally; do not front-load a survey:

1. What did you think WitnessOps was doing?
2. Which result did you care about most?
3. Was anything unclear?
4. Would you rerun this later? Why?
5. Who would you send this report to?
6. What would you expect WitnessOps to check next?
7. What do you currently use for this job?
8. What would make this worth paying for?
9. If this disappeared tomorrow, what would you miss?
10. Would you pay €49 for a one-time deeper check of this asset?

Record stated intent separately from demonstrated behavior. The existing €49
one-time offer is a research prompt, not payment integration or a sale. Do not
wire Stripe, initiate checkout or infer willingness to pay from report views.

## Private per-user record and weekly summary

Keep actual records outside the public repository. One small row/note per user:

```text
user_ref; workspace_ref; company_type; use_case; invited_at; admitted_at;
signed_in_confirmed_at; asset_added_confirmed_at; activation_status;
first_run_at; second_same_asset_run_at; returned_at_and_basis;
evidence_opened; report_opened; pdf_requested; export_or_sharing_confirmed;
comparison_viewed; feedback_summary; requested_next_capability;
willingness_to_pay_signal (stated vs observed); friction_severity; founder_notes
```

Weekly, report counts and denominators for the **named cohort only**:

```text
Window / cohort size / days of exposure:
Invited | Signed in | Activated | First run | Evidence opened
PDF requested | PDF saved/shared confirmed | Returned | Second run
Comparison viewed | Feedback answered | Next capability requested
Asked about payment | Requested deeper review
Top 3 activation frictions (user refs, severity, evidence):
Top 3 reasons users cared (behavior vs quote):
Top 3 requested next capabilities (distinct users and jobs):
Top 3 commercial signals (intent vs concrete action):
Unknowns / missing telemetry / help provided:
Next experiment or build decision / evidence still needed:
```

Activation conversion = activated / invited; second-run rate = users completing a
second same-asset run / users with first completed run. PDF-request and comparison
rates use activated users as denominator. Show `n/N`, not percentages alone;
zero denominator is N/A. Separate this week's activity from cumulative conversion
and users who have not yet had 3–7 days to return. Feedback dismissals are not
answers. A requested capability is coded from feedback/interview, not an invented
telemetry event.

## Read-only operator queries

Use the approved administrative read path; never expose an analytics API to
customers. The following query is runnable unchanged and intentionally returns
zero rows. Replace its empty `cohort` CTE with the privately reviewed UUID pairs
and invitation dates. Keep those populated queries/results outside this repo.
Run in `BEGIN READ ONLY` / `ROLLBACK`. No source snapshots are selected.

```sql
WITH cohort AS (
  SELECT NULL::uuid user_id, NULL::uuid workspace_id, NULL::timestamptz invited_at
  WHERE false
), completed AS (
  SELECT c.user_id,c.workspace_id,r.asset_id,r.finished_at,
         row_number() OVER (PARTITION BY c.user_id,c.workspace_id,r.asset_id
                            ORDER BY r.finished_at,r.id) AS asset_run_number
  FROM cohort c JOIN runs r ON r.initiated_by=c.user_id
    AND r.workspace_id=c.workspace_id AND r.status='completed'
    AND r.started_at>=c.invited_at
), run_summary AS (
  SELECT user_id,workspace_id,min(finished_at) AS first_run_at,
    min(finished_at) FILTER (WHERE asset_run_number=2) AS second_same_asset_run_at
  FROM completed GROUP BY user_id,workspace_id
), events AS (
  SELECT c.user_id,c.workspace_id,
    bool_or(e.name='asset_added') AS asset_added_event,
    bool_or(e.name='evidence_opened') AS evidence_opened,
    bool_or(e.name='report_opened') AS report_opened,
    bool_or(e.name='pdf_export_requested') AS pdf_requested,
    bool_or(e.name='source_json_downloaded') AS source_downloaded,
    bool_or(e.name='rerun_started') AS rerun_started,
    bool_or(e.name='comparison_viewed') AS comparison_viewed,
    bool_or(e.name='deeper_review_clicked') AS deeper_review_clicked
  FROM cohort c LEFT JOIN product_events e ON e.user_id=c.user_id
    AND e.workspace_id=c.workspace_id AND e.created_at>=c.invited_at
  GROUP BY c.user_id,c.workspace_id
), feedback AS (
  SELECT c.user_id,c.workspace_id,f.surface,f.response,count(*) AS responses
  FROM cohort c JOIN product_feedback f ON f.user_id=c.user_id
    AND f.workspace_id=c.workspace_id AND f.created_at>=c.invited_at
  GROUP BY c.user_id,c.workspace_id,f.surface,f.response
)
SELECT c.*,u.early_access_state,r.first_run_at,r.second_same_asset_run_at,
       e.asset_added_event,e.evidence_opened,e.report_opened,e.pdf_requested,
       e.source_downloaded,e.rerun_started,e.comparison_viewed,e.deeper_review_clicked,
       f.surface,f.response,f.responses
FROM cohort c JOIN users u ON u.id=c.user_id
LEFT JOIN run_summary r USING(user_id,workspace_id)
LEFT JOIN events e USING(user_id,workspace_id)
LEFT JOIN feedback f USING(user_id,workspace_id);
```

This output has one row per feedback grouping: deduplicate user/workspace pairs
before funnel counts. Null events mean no recorded signal, not a definitive no.
Combine with confirmed sign-in/asset-add research fields for product activation;
never count `early_access_state='active'` as sufficient. Read optional comments
separately with the same cohort/user/workspace/time predicates, rendering as plain
text. No automatic “next capability” classification is claimed.

## Triage, operations and stop conditions

| Priority | Examples | Action |
| --- | --- | --- |
| P0 security/data integrity | Tenancy/session leak, wrong target, mutable or corrupt evidence, secret leakage | Pause admissions immediately; contain access/execution through the existing runbook, preserve DB/log evidence and investigate. |
| P1 activation blocker | Cannot sign in/add asset/complete run/use report or PDF | Triage promptly, pause affected admissions if blocked; a bounded fix may be justified. |
| P2 friction | Unclear copy/status/navigation/explanation | Accumulate independent examples before coding. |
| P3 request | Collector, scheduling, server check, AI investigation | Record the job and demand; not a bug or implementation authorization. |

Founder checks existing operational signals daily during the small cohort: one
app process, app/DB health, disk, latest successful off-host backup, auth/run
failures and unexpected restarts. Check certificate expiry weekly and arrange
operator-assisted renewal well before expiry (start at 30 days remaining).
Record this manual renewal dependency as operational debt, not automation.

Stop new admissions on cross-workspace access, session replay regression,
unexpected digest/source mutation, repeated failed/stale backups, multiple app
instances, weakened target validation, leaked secrets or report/source mismatch.
For a live P0, stop execution/access as needed; do not merely pause invitations.
Preserve evidence, name the owner of investigation and require a verified repair
before resuming. Never rerun a customer target to diagnose without authorization.

## Next-phase decision brief

After 3–5 users have had 3–7 days and a chance to return, compare distinct-user
behavior, quotes, workarounds, desired recipient and commercial intent. Prefer
corroboration from at least two independent users; this tiny sample is directional,
not statistical proof. If evidence is weak, state “insufficient evidence” and run
one narrow learning experiment rather than choose a large build.

| Direction | Evidence that would justify a bounded next proposal |
| --- | --- |
| Improve current External Exposure | Repeated comprehension or activation failure before value is reached. |
| Richer External Exposure / public asset discovery | Multiple users name the same missing public check or cannot establish which public assets matter. Bound scope explicitly. |
| Scheduling / notifications / Linux Server Watch | Users demonstrate repeat value but miss returns, or need repeated server-state evidence. Separate reminder need from continuous collection. |
| Linux Server Check / Windows Server Check | Concrete before/after maintenance evidence jobs; choose OS from actual user environments (including MSP/Intune needs). |
| Investigate This Change | Repeat comparisons lead to the same unanswered interpretation/investigation job. |
| €49 paid check / deeper governed review | Users understand current value and request deeper analysis, a customer deliverable or payment; test stated intent before integrating checkout. |
| Controlled update / patch verification later | Repeated consequential maintenance jobs with clear authority/evidence needs; execution requires its own future design and authorization. |

Brief: strongest job, supporting users/actions, contradictory evidence, willingness
to pay, smallest proposed build/experiment, success criterion and explicit deferred
scope. No winner is selected now. Admission count alone is not success.
