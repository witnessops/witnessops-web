# Admin queue surface inventory (Phase 1)

Scope: admin surfaces, queue-adjacent public entrypoints, and Phase 2 boundary surfaces only.

## Surface inventory
| surface | control | route / endpoint | phase status | route status (intake-only) | source of truth | label status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /contact | Redirect to /review/request | GET /contact | phase1-authoritative | n/a | Next.js redirect | approved | permanentRedirect to /review/request |
| /review/request | Review request form (name/org/email/scope + Request review) | GET /review/request | phase1-authoritative | n/a | ContactForm + review request page | approved | Posts to /api/contact for email-only follow-up |
| /api/review/request | Review intake submission | POST /api/review/request | phase1-authoritative | authoritative | handleReviewRequestIntake + token issuance | approved | Canonical intake entrypoint |
| /api/engage | Intake alias endpoint | POST /api/engage | phase1-authoritative | alias | handleReviewRequestIntake + token issuance | approved | Alias for /api/review/request |
| /api/contact | Direct review request email | POST /api/contact | phase1-authoritative | n/a | sendMail (file/resend/m365) | approved | Email-only path to engage@witnessops.com; does not write queue state |
| /api/support/message | Direct support request email | POST /api/support/message | phase1-authoritative | n/a | sendMail (file/resend/m365) | approved | Email-only path to support@witnessops.com; does not write queue state |
| /api/intake | Intake stub endpoint | POST /api/intake | legacy-transitional | stub/inactive | stub log only | deprecated | Does not write intake/issuance records |
| /api/verify-token | Verify mailbox token | GET /api/verify-token, POST /api/verify-token | phase2-boundary | n/a | verifyIssuedToken + issuance store | approved | GET redirects to /assessment/{issuanceId} (or /support); Phase 2 boundary dependency |
| /admin/login | OIDC sign-in | GET /api/admin/oidc/start | phase1-authoritative | n/a | OIDC session issuance | approved | Callback at /api/admin/oidc/callback |
| /admin/login | Legacy key authenticate | POST /api/admin/auth | legacy-transitional | n/a | admin session cookie | approved | Key file/paste path |
| /api/admin/oidc/callback | OIDC callback | GET /api/admin/oidc/callback | phase1-authoritative | n/a | admin session cookie | approved | Completes admin login |
| /admin | Overview filter cards (Ready, Pending, Divergent, Stale Accepted, Cust. Accepted, Cust. Rejected) | /admin/queue?filter=... | phase1-authoritative | n/a | admission queue view + lifecycle | vague | See rename backlog for label cleanup |
| /admin/queue | Worklist tabs (All, My Work, Unassigned, Pending Review, Clarification, Scope Drafting, Scope Approved, Responded) | /admin/queue?filter=... | phase1-authoritative | n/a | queue projection | approved | Tabs derive counts from projection |
| /admin/queue | Secondary filter pills (Ready, Pending, Divergent, Stale Accepted, Awaiting Response, Evidence Conflict, Closed: Provider, Closed: Mailbox, Reconciled, Customer: Accepted/Rejected, Provider: <name>) | /admin/queue?filter=... | phase1-authoritative | n/a | queue projection + reconciliation + lifecycle | vague | Projection-derived counts only |
| /admin/queue | Ownership actions (Claim, Assign, Reassign, Unassign, Override assign) | POST /api/admin/queue/command | phase1-authoritative | n/a | queue command executor + event ledger | approved | Commands: queue.claim/assign/reassign/unassign/override_assign |
| /admin/queue | Priority action (Set priority) | POST /api/admin/queue/command | phase1-authoritative | n/a | queue command executor + event ledger | approved | Command: queue.set_priority |
| /admin/queue | Clarification actions (Request clarification, Clear clarification) | POST /api/admin/queue/command | phase1-authoritative | n/a | queue command executor + event ledger | approved | Commands: queue.request_clarification/queue.clear_clarification |
| /admin/queue | Scope contract actions (Start scope draft, Approve scope contract, Supersede, Withdraw) | POST /api/admin/queue/command | phase1-authoritative | n/a | queue command executor + scope contracts | approved | Commands: queue.start_scope_draft/approve/supersede/withdraw |
| /admin/queue | Queue response action (Record queue response) | POST /api/admin/queue/command | phase1-authoritative | n/a | queue command executor + response record | approved | Command: queue.record_response |
| /admin/queue | Verify projection | POST /api/admin/queue/verify-projection | phase1-authoritative | n/a | queue ledger rebuild vs snapshot | approved | Read-only verification plane |
| /admin/queue | Legacy reply (Reply / Send Reply) | POST /api/admin/intake/respond | legacy-transitional | n/a | intake ledger + provider delivery | vague | Legacy intake action surface |
| /admin/queue | Legacy operator actions (Reject intake, Request clarification, Rescind rejection) | POST /api/admin/intake/reject, /api/admin/intake/request-clarification, /api/admin/intake/rescind-rejection | legacy-transitional | n/a | intake ledger | approved | Legacy intake action surface |
| /admin/queue | Legacy reconcile (Reconcile / Record Reconciliation) | POST /api/admin/intake/reconcile | legacy-transitional | n/a | reconciliation ledger | vague | Legacy intake action surface |
| /admin/queue | Post-approval retry request | POST /api/admin/lifecycle/{runId}/retry-request | external-read-only | n/a | control-plane lifecycle | approved | Local intent only; does not mutate queue state |
| /admin/queue | Post-approval authorize / start | POST /api/admin/lifecycle/{runId}/authorize | external-read-only | n/a | control-plane lifecycle | approved | Control-plane action; queue remains read-only |
| /admin/reports | Download reconciliation report | GET /api/admin/intake/reconciliation-report | legacy-transitional | n/a | reconciliation report (admission queue view) | approved | Export JSON |
| /admin/reports | Copy report URL | GET /api/admin/intake/reconciliation-report | legacy-transitional | n/a | reconciliation report (admission queue view) | approved | Client-side copy |
| /admin/system | End Session | POST /api/admin/logout | phase1-authoritative | n/a | admin session cookie | approved | Returns to /admin/login |
| /admin/system | Knowledge Base link | GET <hub>/knowledge-base | external-read-only | n/a | hub surface config | approved | External resource |
| /assessment/[issuanceId] | Scope approval (Approve scope and start recon) | POST /api/assessment/{issuanceId}/approve | phase2-boundary | n/a | issuance + control-plane handoff | approved | Claimant surface |
| /assessment/[issuanceId] | Claimant actions (Amend scope, Retract engagement, Disagree with scope) | POST /api/assessment/{issuanceId}/amend, /retract, /disagree | phase2-boundary | n/a | claimant action records | approved | Claimant surface |
| /assessment/[issuanceId] | Reopen engagement | POST /api/assessment/{issuanceId}/reopen | phase2-boundary | n/a | claimant action records | approved | Claimant surface |
| /assessment/[issuanceId] | Assessment status poll | GET /api/assessment/{issuanceId}?email=... | phase2-boundary | n/a | issuance + assessment service | approved | Read-only status |
| /package/[issuanceId] | Package disposition (Accept package / Reject package) | POST /api/package/{issuanceId}/disposition | phase2-boundary | n/a | control-plane acceptance | approved | Claimant surface |

## Rename backlog (vague labels)
| label | surface/control | proposed label | action | notes |
| --- | --- | --- | --- | --- |
| Reply | /admin/queue legacy reply | Send operator reply (legacy) | rename now | Clarify legacy action intent |
| Reconcile | /admin/queue legacy reconcile | Record reconciliation (legacy) | rename now | Clarify audit-recorded intent |
| Ready | /admin/queue filter pill | Queue ready | rename now | Specify queue-ready meaning |
| Pending | /admin/queue filter pill | Reconciliation pending | rename now | Disambiguate pending type |
| Closed: Provider | /admin/queue filter pill | Closed by provider evidence | rename now | Clarify closure source |
| Closed: Mailbox | /admin/queue filter pill | Closed by mailbox receipt | rename now | Clarify closure source |
| Reconciled | /admin/queue filter pill | Closed by manual reconciliation | rename now | Clarify closure source |
| Cust. Accepted | /admin overview stat card | Customer accepted | keep for compatibility | Expand abbreviation when revisited |
| Cust. Rejected | /admin overview stat card | Customer rejected | keep for compatibility | Expand abbreviation when revisited |
