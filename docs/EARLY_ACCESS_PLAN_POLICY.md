# Early Access plan policy and consent

**Current direction (2026-09-17):** further commercial-plan work is paused in favor
of the [free-check product journey](FREE_CHECK_PRODUCT_JOURNEY.md). PR #384 remains
an unmerged draft. This document describes the preserved implementation and
versioned terms, not the current launch offer. Existing accepted terms, consent
records and enforcement are unchanged; do not enroll new workspaces implicitly.

This implements the durable policy, contribution-choice record, hostname usage
and Linux source admission for the approved demo reuse plan's commercial phase.
Workspaces with a recorded plan use the monthly hostname allowance and Linux
source limit through the existing asset, run and import endpoints.
There is no customer-facing enrollment/checkout endpoint yet. This does not collect
payments, grant access, enforce seat limits, or expire evidence.

## Accepted policy

Version: `early-access-2026-09-17`. One plan: `early-access`.

| Term | Value |
| --- | --- |
| Free period | First 168 elapsed hours from initial explicit plan consent |
| Day eight | The same plan continues at the explicitly chosen monthly contribution, including EUR 0 |
| Suggested contribution | EUR 49/month; never an implicit default |
| Feature access | Full, subject to the same plan caps at every contribution amount |
| Hostname checks | 25/month |
| Linux import sources | 3 |
| Snapshot retention | 90 days |
| Seats | 1 |
| Future pricing | Requires new explicit acceptance |

The hostname allowance and Linux source cap are enforced for explicitly enrolled
workspaces. Retention and seat caps remain policy data awaiting implementation. Current cohort
admission, execution throttles, storage limits and immutable source custody continue
to apply. Public claims must describe implemented behavior.

## Persistence contract

`src/lib/plan-policy.ts` defines the versioned terms, input validation and day-eight
calculation. Migration `0011_early_access_plans.sql` saves the same immutable policy;
the database suite checks correspondence. Future policies need distinct versions,
and readers must retain the versions that existing customers accepted.

`EarlyAccessPlanStore` is an internal server persistence boundary. It requires a
currently active Early Access Owner of the selected workspace for both reads and
writes. Contribution records do not activate a user, authorize payment, or replace
membership checks. Migration does not enroll existing workspaces or infer consent.

The initial explicit choice supplies a UUID request ID, `expectedRevision: 0`, the
current terms version, an integer number of euro cents, and `accepted: true`.
The database supplies the actor-bound consent time and the immutable trial dates.
Subsequent choices supply the last read revision. Workspace locking serializes
concurrent choices; a stale revision is rejected instead of overwriting another
choice. An identical request retry does not create a second consent or restart the
trial. Reusing its ID for different input is rejected. A delayed retry returns the
current plan without restoring the old contribution.

Each successful choice adds an immutable consent row. The plan advances one revision
and retains its original identity and trial dates. Database constraints require a
corresponding consent for the current revision; triggers reject rewriting terms,
rewriting consent, resetting the trial, or deleting its record to obtain a new trial.
Existing evidence retention and immutability triggers are untouched.

Consent scope is `contribution_choice`. It records a commercial choice, **not a
payment mandate, successful checkout, paid invoice or active subscription**. Both
zero and positive choices can be stored and tested internally. A payment integration
must obtain the applicable payment authorization and reconcile provider state before
presenting a recurring payment as configured. The integer upper bound is a storage
limit, not a payment-provider capability or recommended amount.

## Hostname allowance

`WorkspaceStore.beginRun` enforces 25 checks per workspace per UTC calendar month
after current Owner, cohort and asset authorization. This applies to both hostname
and domain assets, from the first recorded plan choice, throughout the trial and
after day eight, at every contribution amount. The first partial month receives
the same cap. A contribution revision does not reset usage. This follows the demo's
UTC calendar-month convention; it is separate from contribution billing dates.

Admission holds the existing workspace advisory transaction lock, shared by all
app instances and plan-consent writes. It resolves the accepted policy version,
checks current usage, and atomically inserts the pending run and an immutable
`hostname_check_usage` record. Unsupported or mismatched terms fail closed. The
database supplies admission time after lock acquisition; neither client time nor
snapshot time chooses the usage month. Enrolled runs use that same instant for
their stored start/creation timestamps. Each record binds one run to its workspace,
accepted consent revision and UTC month. Migration `0012_hostname_check_usage.sql`
does not enroll workspaces or assign usage to historical runs.

| Run state | Allowance effect |
| --- | --- |
| Running | Reserves one slot before collection starts |
| Completed with saved snapshot | Consumes that slot, including unknown/error observations within a valid saved snapshot |
| Failed without a saved snapshot | Releases the slot; the admission record remains |
| Reopened, reported, exported, or completed again | No new slot; completed source remains immutable |

Completion after a month boundary stays in the admission month. A new month gets
its own allowance without rewriting old counters or evidence. At capacity the
existing run API returns HTTP 429 with the next UTC reset date before invoking the
collector. Rejected admission refunds its temporary process throttle reservation;
actual collection attempts keep their cooldown even when collection fails. Cleanup
is idempotent and can still mark an unfinished run failed after
membership revocation; it cannot refund or erase an already completed snapshot.
An interrupted process can leave a running reservation until it is marked failed
or its UTC month ends. This change does not infer failure from elapsed time or
introduce an automatic cleanup worker.

Enrolled hostname admission replaces the legacy 32-run lifetime count with the
monthly allowance. The 8 MiB workspace snapshot capacity, 1 MiB per-source limit,
20-asset capacity and collection throttles remain independent technical safeguards.
They can reject work before the monthly allowance is exhausted. Unenrolled cohort
workspaces retain their existing admission, including the 32-run limit. Linux
imports use the source admission described below, with their own custody limit.

## Linux import sources

One source is one registered `linux_server` asset in a workspace, identified by its
existing asset UUID and normalized hostname. Registration consumes a slot even
before the first package is imported. This is a workspace registration, not proof
of unique hardware identity, ownership or continuity. Existing signed-source
verification and comparison identity rules still determine what a package proves.

The plan allows three registered sources during the trial and after day eight,
at EUR 0 and positive contributions. Hostname/domain assets do not consume these
slots. Adding a fourth source returns HTTP 409 through the existing asset endpoint.
Later valid packages for an existing source use the same slot; invalid uploads,
reopening, comparison and export do not change the source count. Contribution
changes do not reset the count. There is no calendar reset, source deletion or
archive/replacement operation in this slice; a future source lifecycle requires
an explicit policy and implementation rather than deleting retained evidence.

`WorkspaceStore.addAsset`, CLI server-check authorization, plan enrollment and `LinuxCheckStore.importWithin`
serialize on the same canonical workspace UUID advisory lock. The server reads
the registered assets and exact accepted terms inside that transaction. Concurrent
registrations across app instances cannot add a fourth source, including when
workspace UUID casing differs. The CLI's create-by-hostname path counts the same
registered sources and rejects a fourth with `linux_source_capacity` before issuing
new collection authority. Existing-source authorization and identical retries keep
their existing behavior inside the cap. Normal upload and server-check finalization
share the import boundary. Unsupported/mismatched accepted terms fail closed for new
Linux writes; authorized access to saved evidence remains available.

Existing registered sources count when a workspace explicitly enrolls. Enrollment
with more than three sources is rejected atomically, preserving its legacy access,
sources and absence of a plan. Source reconciliation for such a workspace requires
a separate migration decision. If an already enrolled workspace was over the cap
before enforcement, new source registrations, server-check authorizations and imports are rejected; saved reads,
exports and contribution updates remain available. No migration chooses sources,
enrolls a workspace or removes its records.

Enrolled Linux admission replaces the 32-run lifetime ceiling and the CLI's
32-authorization ceiling with this source limit. Repeated packages, CLI checks and
retained hostname history therefore do not exhaust a Linux source allowance. The
existing 200 MiB Linux custody and CLI capture-storage caps, per-package limits,
20-asset workspace cap, verification concurrency and other server-check safeguards
still apply and can bind before plan capacity. Unenrolled workspaces retain their
existing 32-run, 32-authorization and storage admission. Linux imports do not consume
hostname monthly slots.
No new schema or usage ledger is needed: registered assets are already durable and
workspace-scoped; accepted policy loading is shared with hostname admission.

## Remaining commercial implementation

The following work is required before publishing the complete one-plan flow:

1. Define one-seat enrollment and migration of existing multi-member workspaces.
2. Add the customer consent/checkout flow, including a complete EUR 0 path and an
   authorized recurring-payment integration for positive choices. Contribution updates
   must preserve the trial and clearly state when the new amount applies.
3. Define retention scope across hostname snapshots, Linux sources, reports, comparison
   baselines and exports. Implement deliberate expiry while preserving immutability
   during the retained lifetime; production expiry requires its own operator activation.
4. Reconcile technical storage capacity with the intended retained history and
   define any source replacement/migration flow. Then publish pricing, settings,
   Ask and docs from the same policy.

## Validation

Unit checks cover explicit consent, exact day-eight boundaries, EUR 0 feature/cap
parity, elapsed time through daylight-saving/leap boundaries, and malformed input.
The isolated PostgreSQL suite exercises reconnect, concurrent/idempotent choices,
stale updates, actor/workspace authorization, rollback and immutable history. Usage
tests cover concurrent admissions from independent pools, failure recovery, amount
changes, month rollover, non-UTC sessions, retained history beyond 32 runs, legacy
admission, atomic reservation rollback, unsupported policies and HTTP rejection
before execution. Linux source cases cover concurrent registration, contribution
parity, enrollment races, legacy over-cap workspaces, failed/unauthorized writes,
the HTTP limit, mixed browser/CLI registrations, existing-source CLI finalization,
repeated verified imports beyond 32 retained runs, independent
hostname usage, original-byte reopen and unsupported policy rejection.
There is no new API route or collector contract.
The populated migration upgrade verifies that existing evidence and admission survive
and that no existing workspace is silently enrolled.

Use the repository's Node 22 `pnpm health`, app database tests and populated upgrade
gate. Migration is explicit; application startup does not apply it. Merge alone is
not authority to deploy, collect contributions or delete retained evidence.
