# Early Access plan policy and consent

This is the first backend step of the approved demo reuse plan's commercial phase.
It establishes a durable policy and contribution-choice record. It does not enable
enrollment, collect payments, enforce allowances, grant access, or expire evidence.
There is no new HTTP endpoint or customer-facing checkout in this change.

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

The cap values are policy data in this foundation, not enforced behavior. Existing
cohort admission, execution throttles, storage limits and immutable source custody
continue to govern the current app. Public claims must describe implemented behavior.

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

## Remaining commercial implementation

The following work is required before publishing the complete one-plan flow:

1. Define hostname monthly reset and failed-run accounting; reserve usage atomically
   alongside run admission, preserving bounded collection controls.
2. Define a Linux import source and its lifecycle. The reuse map recommends counting
   distinct registered sources, with later packages for that source using the same slot.
3. Define one-seat enrollment and migration of existing multi-member workspaces.
4. Add the customer consent/checkout flow, including a complete EUR 0 path and an
   authorized recurring-payment integration for positive choices. Contribution updates
   must preserve the trial and clearly state when the new amount applies.
5. Define retention scope across hostname snapshots, Linux sources, reports, comparison
   baselines and exports. Implement deliberate expiry while preserving immutability
   during the retained lifetime; production expiry requires its own operator activation.
6. Reconcile existing total-run and storage limits with the monthly allowance and
   retained history. Then publish pricing, settings, Ask and docs from the same policy.

## Validation

Unit checks cover explicit consent, exact day-eight boundaries, EUR 0 feature/cap
parity, elapsed time through daylight-saving/leap boundaries, and malformed input.
The isolated PostgreSQL suite exercises reconnect, concurrent/idempotent choices,
stale updates, actor/workspace authorization, rollback and immutable history.
The populated migration upgrade verifies that existing evidence and admission survive
and that no existing workspace is silently enrolled.

Use the repository's Node 22 `pnpm health`, app database tests and populated upgrade
gate. Migration is explicit; application startup does not apply it. Merge alone is
not authority to deploy, collect contributions or delete retained evidence.
