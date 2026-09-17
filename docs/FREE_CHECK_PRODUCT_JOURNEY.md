# Free check, saved history and paid follow-up

Founder decision, 2026-09-17: prioritize a useful free check, a normal workspace
experience and a clearly scoped paid review. Early Access describes release
availability; a trial/contribution flow is not a launch prerequisite. Recurring
product pricing remains undecided.

## Customer path

| Step | Current implementation | Boundary |
| --- | --- | --- |
| Check | `/check`: ten bounded public hostname observations, no account required | The visitor must own or be authorized to check the hostname. |
| Keep the free result | PDF and source JSON actions directly on the result | The public result is transient; download before leaving. No account import is claimed. |
| Open a workspace | Configured app link from the result; `/early-access` explains access and the journey | The existing route is retained. The app remains invitation-only; login alone grants no access. |
| Save a baseline | Activate an existing invitation, create/open a workspace, add the hostname, explicitly authorize a new observation | Adding a hostname does not collect. The saved run is a new observation, not the earlier public snapshot. |
| Return | Open the same asset or saved report; manually authorize another run and compare | Existing history, source preservation, comparison and export mechanisms are reused. No schedule or alert promise. |
| Buy help | Existing External Attack Surface Review scope and catalog price | A separately agreed service. A link click is not a purchase; no new subscription or checkout is introduced. |

## Preserve existing contracts

- PR #384 (one-seat Early Access admission) is paused as a draft.
- Further contribution checkout, day-eight billing and plan-specific retention
  implementation are paused. Do not activate them as part of this journey.
- Merged migrations, accepted policy versions, consent records, existing
  enrollment limits and saved evidence remain unchanged. Do not infer that there
  are no accepted plans merely because customer checkout is absent.
- Cohort admission, workspace membership, owner/viewer permissions, collection
  authorization, throttles and storage boundaries continue to apply.
- The existing `WITNESSOPS_EARLY_ACCESS_APP_URL` deployment setting controls public
  app links. No hostname, snapshot, email or authorization is transferred by the
  link. Without a configured destination, the result links to access information.
- Public signup, migration execution, production publication and deployment are
  outside this change. Passing source tests does not establish a live release.

## Next acceptance check

Use a separately authorized real participant and hostname through the existing
admission process: free result → downloaded copy → workspace baseline → leave →
return → second explicitly requested check → comparison → review-scope page.
Record where help was needed and whether the result was useful. Distinguish
downloads, repeat use, a request for a quote and an actual payment. Keep private
participant records and evidence outside this public repository.

Automated browser cases cover the public handoff, source-download fidelity,
invitation states, saved-run UI, report export and repeat-run comparison using
fixtures. They do not demonstrate production admission, customer demand or a sale.
