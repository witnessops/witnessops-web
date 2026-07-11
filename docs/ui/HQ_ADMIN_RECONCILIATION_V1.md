# WitnessOps HQ visual reconciliation — Admin Console v1

Status: `EXISTING_ADMIN_RESTYLED_HQ_REFERENCE_ONLY_NO_DUPLICATE_RUNTIME`

This change keeps `witnessops-web` as the only operational Admin Console. The
`witnessops-hq` repository and PR #1 were used only as a visual and interaction
reference. Its Vite runtime, synthetic records, fixture data, and business
logic were not copied or connected.

## Discovery summary

The existing Admin Console already owns:

- authenticated Admin routing and Founder authorization;
- queue, intake, lifecycle, customer, product contract, proof-run, delivery,
  receipt, health, and audit projections;
- server actions and APIs for operator transitions;
- Ask WitnessOps public/admin boundaries;
- exact search and current bilingual public-route separation.

PR #220 was inspected but not cherry-picked. Its branch is based on an older
divergent tree and removes current Admin Core, Gmail, and server-record files.
Only its bounded Wiz presentation/model and supplied Wiz visual assets were
reused.

## Reconciliation table

| HQ reference | Classification | Existing `witnessops-web` surface | Result |
| --- | --- | --- | --- |
| Dark navigation rail | `RESTYLE_EXISTING_COMPONENT` | `admin-sidebar.tsx`, `admin.module.css` | Preserved existing routes; added Canonical V1 mark and mobile toggle. |
| Overview metric cards | `RESTYLE_EXISTING_COMPONENT` | `admin-core-dashboard.tsx` | Existing dashboard counts remain authoritative. |
| “What needs attention” queue | `RESTYLE_EXISTING_COMPONENT` | `/admin/queue`, `admin-admission-queue.tsx` | Existing filters, selection, and actions remain authoritative. |
| Request inspector | `RESTYLE_EXISTING_COMPONENT` | `/admin/queue?selected=…` | Existing evidence, lifecycle, scope, and action panels retained. |
| Proof-run view | `RESTYLE_EXISTING_COMPONENT` | `/admin/proof-runs`, `/admin/proof-runs/[id]` | Existing pinned contract and evidence state retained. |
| Deliveries | `RESTYLE_EXISTING_COMPONENT` | `/admin/deliveries`, `/admin/deliveries/[id]` | Existing readiness, receipt linkage, and send boundaries retained. |
| Receipts | `RESTYLE_EXISTING_COMPONENT` | `/admin/receipts`, `/admin/receipts/[id]` | Existing receipt authority and supersession data retained. |
| Settings / health | `RESTYLE_EXISTING_COMPONENT` | `/admin/settings` | Existing integration state remains the source of truth. |
| Exact global search | `RESTYLE_EXISTING_COMPONENT` | `admin-sidebar.tsx`, `/admin/search` | Existing bounded exact search retained. |
| Wiz operator brief | `REUSE_EXISTING_ADMIN_COMPONENT` | New presentation model adjacent to Admin Core | Derived only from current admission summary; links only to existing queue filters. |
| Wiz reply/note drafts | `DEFER` | PR #220 reference only | No draft editor or generated content was added in this slice. |
| HQ synthetic fixture records | `REJECT_AS_DUPLICATE` | None | No fixture data entered production code or stores. |
| HQ Vite runtime | `REJECT_AS_DUPLICATE` | None | No second runtime, API, auth, or deployment was introduced. |
| Canonical V1 monochrome mark | `RESTYLE_EXISTING_COMPONENT` | Admin brand asset path | Reused only in the Admin rail; public EN/PL routes were not changed. |
| Responsive mobile navigation | `RESTYLE_EXISTING_COMPONENT` | Admin console shell | Added a presentation-only menu toggle; no authority or lifecycle behavior changed. |

No item was classified `REQUIRES_NEW_OPERATIONAL_CAPABILITY`.

## Preserved boundaries

- Existing Admin authentication and authorization semantics are unchanged.
- Wiz has no fetch, POST, mail, lifecycle, proof-run, evidence, receipt, or
  package-release action.
- Wiz text is visibly marked as an operator brief and says that execution is
  not automatic.
- Public Ask WitnessOps remains separate from Admin authority.
- Product contracts, statuses, receipt schemas, verifier behavior, Gmail,
  OIDC, Resend, DNS, Caddy, and public bilingual routes are unchanged.

## Evidence

Local visual evidence was captured without copying live or synthetic records:

- Desktop: `/Users/ops/WitnessOps/var/tmp/witnessops-admin-hq-ui-qa-desktop.png`
- Mobile 390 px: `/Users/ops/WitnessOps/var/tmp/witnessops-admin-hq-ui-qa-mobile.png`

## Validation

Passed:

- focused Wiz model and non-mutation tests: 4/4;
- changed-file ESLint: passed;
- local Admin desktop render: passed;
- local Admin 390 px render: passed;
- mobile navigation open/close: passed;
- zero horizontal overflow: passed;
- no browser console errors: passed;
- proof package tests: passed.

Known clean-base limitations:

- full app suite: 458/466 passed; 8 pre-existing Ask WitnessOps failures;
- full typecheck/build: blocked by the same pre-existing Ask failures;
- route parity: blocked by the clean-base frozen route/build manifest mismatch;
- no production deployment was performed.

## Rollback

Revert the reconciliation commit or close the draft PR. No runtime or external
configuration rollback is required because this branch was not deployed.
