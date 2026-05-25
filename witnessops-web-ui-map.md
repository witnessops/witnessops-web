# witnessops-web UI Map

Status: regenerated from current source
Generated: 2026-05-25
Repo: `/Users/sovereign/WitnessOps/repos/witnessops-web`
Branch observed: `main`
Head observed: `845fd3c`

This file is an authored UI and route inventory for the current `witnessops-web`
source tree. It is not proof authority, verifier authority, deployment
authority, or a release receipt.

## Source Basis

This map was regenerated from:

- `apps/witnessops-web/src/app/**`
- `apps/witnessops-web/src/components/**`
- `apps/witnessops-web/src/lib/server/api-contract.ts`
- `apps/witnessops-web/src/lib/docs-assistant/runtime-config.ts`
- `apps/witnessops-web/src/middleware.ts`
- `apps/witnessops-web/src/app/layout.tsx`

Observed source counts:

- App page files: 43 `page.tsx`
- API route files: 33 `route.ts`
- API contract entries: declared in `DECLARED_API_ENDPOINTS`

## App Shell

Root shell:

- File: `apps/witnessops-web/src/app/layout.tsx`
- Global navigation: `Navbar`
- Global footer: `Footer`
- Scroll behavior: `RouteScrollReset`
- Dev-only docs assistant widget: `DocsAssistantWidget`, rendered only when `NODE_ENV === "development"`
- Metadata default: `WITNESSOPS - Bounded Proof Packs for Technical Trust`

Middleware:

- File: `apps/witnessops-web/src/middleware.ts`
- Protects `/admin/**` except `/admin/login`
- Uses `isLocalAdminRequest()` only for explicit local dev bypass
- Falls back to signed `witnessops-admin-session` cookie for admin access
- Performs docs-host routing and docs-prefix rewrite/redirect behavior
- Excludes API routes and static assets from middleware matcher

## Public Marketing And Product Routes

Primary public routes:

| Route | Source | Current behavior |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Home page built from home content registry and marketing components. |
| `/why-witnessops` | `src/app/why-witnessops/page.tsx` | Public explanatory page. |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` | Public pricing page. |
| `/library` | `src/app/(library)/library/page.tsx` | Library surface under `(library)` layout. |
| `/review` | `src/app/review/page.tsx` | Review/product path landing page. |
| `/review/request` | `src/app/review/request/page.tsx` | Public request form path. |
| `/review/request/confirmed` | `src/app/review/request/confirmed/page.tsx` | Confirmation page. |
| `/review/sample-cases` | `src/app/review/sample-cases/page.tsx` | Sample cases index. |
| `/review/sample-cases/ai-agent-action-proof-run` | `src/app/review/sample-cases/ai-agent-action-proof-run/page.tsx` | Public sample proof-run page backed by `sample-artifact-contract.ts`. |
| `/review/sample-cases/approval-gated-containment` | `src/app/review/sample-cases/approval-gated-containment/page.tsx` | Secondary sample case. |
| `/review/sample-cases/privileged-access-grant` | `src/app/review/sample-cases/privileged-access-grant/page.tsx` | Secondary sample case. |
| `/review/sample-report` | `src/app/review/sample-report/page.tsx` | Sample report presentation. |
| `/verify` | `src/app/verify/page.tsx` | Public receipt-first verification UI. |
| `/verify-ui` | `src/app/verify-ui/page.tsx` | UI proof/presentation surface for verifier rendering. |
| `/verify-token` | `src/app/verify-token/page.tsx` | Claimant token verification form. |
| `/assessment/[issuanceId]` | `src/app/assessment/[issuanceId]/page.tsx` | Claimant assessment/status page. |
| `/package/[issuanceId]` | `src/app/package/[issuanceId]/page.tsx` | Customer proof package view and disposition surface. |
| `/support` | `src/app/support/page.tsx` | Support page and support-intake surface when configured. |
| `/support/[slug]` | `src/app/support/[slug]/page.tsx` | Support content page. |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy content page when source content exists. |
| `/terms` | `src/app/terms/page.tsx` | Terms content page when source content exists. |
| `/security` | `src/app/security/page.tsx` | Security content page when source content exists. |
| `/signals` | `src/app/signals/page.tsx` | Public signals page. |
| `/runner-loop` | `src/app/runner-loop/page.tsx` | Noindex operational diagram surface. |
| `/access-change-proof-run` | `src/app/access-change-proof-run/page.tsx` | Public proof-run presentation page. |
| `/proof-backed-security-systems` | `src/app/proof-backed-security-systems/page.tsx` | Proof-backed systems page. |

Redirect routes:

| Route | Destination |
| --- | --- |
| `/contact` | `/review/request` |
| `/governed-execution` | `/proof-backed-security-systems` |
| `/receipts` | `/verify` |
| `/execution` | `/proof-backed-security-systems` |
| `/execution/[receiptId]` | `/proof-backed-security-systems` |
| `/status` | configured status surface |
| `/operators` | configured hub surface |
| `/runbooks` | configured hub runbooks surface |

## Docs Routes

Docs index:

- Route: `/docs`
- File: `apps/witnessops-web/src/app/docs/page.tsx`
- Current role: docs entry page with page contract, start paths, proof/evidence paths, authority/approval paths, and security education paths.
- Dev-only inline assistant: `DocsAssistantInline`, rendered only when `NODE_ENV === "development"`.

Docs content:

- Route: `/docs/[...slug]`
- File: `apps/witnessops-web/src/app/docs/[...slug]/page.tsx`
- Source authority: `@witnessops/content/docs`
- Handles docs redirects and `notFound()` for unavailable docs.

Docs assistant page:

- Route: `/docs/assistant`
- File: `apps/witnessops-web/src/app/docs/assistant/page.tsx`
- Metadata: `robots: { index: false, follow: false }`
- Development: renders `DocsAssistantPage`
- Non-development: renders disabled skeleton with no answer/retrieval/model claim

Docs manual page:

- Route: `/docs/man/witnessops`
- File: `apps/witnessops-web/src/app/docs/man/witnessops/page.tsx`

Docs shell components:

- `components/docs/docs-navbar.tsx`
- `components/docs/docs-sidebar.tsx`
- `components/docs/docs-search.tsx`
- `components/docs/doc-audio-player.tsx`
- `components/docs/doc-proof-strip.tsx`
- `components/docs/page-answer.tsx`
- `components/docs/quick-action-frame.tsx`
- `components/docs/verify-first-verifier-flow.tsx`

## Docs Assistant Surfaces

Current component names:

- `DocsAssistantInline`
- `DocsAssistantPage`
- `DocsAssistantWidget`
- `formatDocsAssistantResponse`

Files:

- `apps/witnessops-web/src/components/docs-assistant/docs-assistant-inline.tsx`
- `apps/witnessops-web/src/components/docs-assistant/docs-assistant-page.tsx`
- `apps/witnessops-web/src/components/docs-assistant/docs-assistant-widget.tsx`
- `apps/witnessops-web/src/components/docs-assistant/docs-assistant-response.ts`
- `apps/witnessops-web/src/app/api/docs-assistant/ask/route.ts`
- `apps/witnessops-web/src/lib/docs-assistant/runtime-config.ts`
- `apps/witnessops-web/src/lib/docs-assistant/server-runtime.ts`
- `apps/witnessops-web/src/lib/docs-assistant/refusal-policy.ts`
- `apps/witnessops-web/src/lib/docs-assistant/answer-normalizer.ts`
- `apps/witnessops-web/src/lib/docs-assistant/citation-normalizer.ts`

Runtime gate:

- Development path:
  - `NODE_ENV === "development"`
  - requires `OPENAI_API_KEY`
  - uses hardcoded allowed vector store and model constants
- Non-development path:
  - requires `WITNESSOPS_DOCS_ASSISTANT_ENABLED === "true"`
  - requires `WITNESSOPS_DOCS_ASSISTANT_STAGE === "staging"`
  - requires exact allowed vector store ID
  - requires exact allowed model
  - requires `OPENAI_API_KEY`

Important boundary:

- The dev-only UI is a local developer surface.
- The assistant does not become proof authority, corpus authority, verifier authority, or public enablement.
- Refusal policy remains separate from environment gating.

## Admin UI

Admin route group:

- Root layout: `apps/witnessops-web/src/app/admin/layout.tsx`
- Console layout: `apps/witnessops-web/src/app/admin/(console)/layout.tsx`
- Login layout/page: `apps/witnessops-web/src/app/admin/login/layout.tsx`, `apps/witnessops-web/src/app/admin/login/page.tsx`

Admin pages:

| Route | Source | Role |
| --- | --- | --- |
| `/admin` | `src/app/admin/(console)/page.tsx` | Admin console overview. |
| `/admin/queue` | `src/app/admin/(console)/queue/page.tsx` | Admission queue and operator workflow surface. |
| `/admin/reports` | `src/app/admin/(console)/reports/page.tsx` | Operator reports, including reconciliation reporting. |
| `/admin/system` | `src/app/admin/(console)/system/page.tsx` | Admin/system status surface. |
| `/admin/login` | `src/app/admin/login/page.tsx` | Admin login surface. |

Admin components:

- `admin-sidebar`
- `admin-admission-queue`
- `admin-alert-bell`
- `admin-alert-panel`
- `admin-auth-info`
- `admin-authorize-run-action`
- `admin-copy-report`
- `admin-empty-state`
- `admin-kb-link`
- `admin-nav-link`
- `admin-operator-actions-form`
- `admin-overview-grid`
- `admin-queue-action-rail`
- `admin-queue-filtered-list`
- `admin-queue-verify-projection`
- `admin-reconcile-intake-form`
- `admin-respond-intake-form`
- `admin-system`
- `reconciliation-report-view`

Admin boundary:

- Admin page routes are protected in middleware.
- Admin API routes use `getVerifiedAdminSession()` except login/logout/OIDC auth-flow endpoints.
- Local admin bypass ignores `x-forwarded-host` for the trust decision and is dev/env-flag gated.
- Route-level regression coverage exists in `local-bypass-route-guard.test.ts`.

## Public Claimant And Package UI

Claimant-visible components:

- `assessment/[issuanceId]/assessment-poller.tsx`
- `assessment/[issuanceId]/claimant-actions-form.tsx`
- `assessment/[issuanceId]/scope-approval-form.tsx`
- `package/[issuanceId]/customer-disposition-form.tsx`
- `verify-token/verify-token-form.tsx`
- `components/assessment-terminal-notice.tsx`
- `components/post-approval-lifecycle.tsx`
- `components/customer-proof-package.tsx`

Key claimant routes:

- `/review/request`
- `/review/request/confirmed`
- `/verify-token`
- `/assessment/[issuanceId]`
- `/package/[issuanceId]`

## API Surface Summary

The current API inventory is declared in `apps/witnessops-web/src/lib/server/api-contract.ts`.

Categories:

- `public-utility`
- `public-claimant`
- `operator`
- `provider-webhook`

Public utility endpoints:

- `POST /api/contact`
- `POST /api/docs-assistant/ask`
- `POST /api/support`
- `POST /api/support/message`
- `GET /api/receipts`

Public claimant endpoints:

- `POST /api/engage`
- `POST /api/review/request`
- `POST /api/intake`
- `POST /api/verify`
- `GET|POST /api/verify-token`
- `GET /api/assessment/[issuanceId]`
- `POST /api/assessment/[issuanceId]/approve`
- `POST /api/assessment/[issuanceId]/amend`
- `POST /api/assessment/[issuanceId]/retract`
- `POST /api/assessment/[issuanceId]/disagree`
- `POST /api/assessment/[issuanceId]/reopen`
- `POST /api/package/[issuanceId]/disposition`

Operator endpoints:

- `POST /api/admin/auth`
- `POST /api/admin/logout`
- `GET /api/admin/oidc/start`
- `GET /api/admin/oidc/callback`
- `POST /api/admin/intake/respond`
- `POST /api/admin/intake/reconcile`
- `GET /api/admin/intake/reconciliation-report`
- `POST /api/admin/intake/reject`
- `POST /api/admin/intake/request-clarification`
- `POST /api/admin/intake/rescind-rejection`
- `POST /api/admin/queue/command`
- `POST /api/admin/queue/verify-projection`
- `POST /api/admin/lifecycle/[runId]/retry-request`
- `POST /api/admin/lifecycle/[runId]/authorize`

Provider webhook endpoints:

- `POST /api/provider-events/mailbox-receipt`
- `POST /api/provider-events/response-outcome`

## Verification And Proof UI Boundaries

Verifier-facing UI:

- `/verify`
- `/verify-ui`
- `components/verify/verify-console.tsx`
- `components/verify/verification-result.tsx`

Execution/proof presentation:

- `/review/sample-cases/ai-agent-action-proof-run`
- `/review/sample-cases/approval-gated-containment`
- `/review/sample-cases/privileged-access-grant`
- `/review/sample-report`
- `/access-change-proof-run`
- `/proof-backed-security-systems`

Boundary:

- `witnessops-web` presents receipt and proof-package information.
- Public verifier behavior is receipt-first.
- This web surface does not become canonical bundle verification authority, proof issuance authority, or corpus authority.

## Tests That Guard This Map's Main Boundaries

Representative tests:

- `src/lib/server/api-contract.test.ts`
- `src/app/api/admin/local-bypass-route-guard.test.ts`
- `src/lib/server/admin-session.test.ts`
- `src/app/api/docs-assistant/ask/route.test.ts`
- `src/app/docs/assistant/docs-assistant-disabled-page.test.tsx`
- `src/lib/docs-assistant/__tests__/runtime-config.test.ts`
- `src/app/api/verify/route.test.ts`
- `src/app/verify-ui/verify-ui-boundary.test.ts`
- `src/app/public-claim-boundary.test.ts`
- `src/app/admin/(console)/admin-console-boundary.test.ts`
- `src/app/admin/login/admin-login-boundary.test.ts`
- `src/app/package/[issuanceId]/package-route-boundary.test.ts`
- `src/app/assessment/[issuanceId]/assessment-route-boundary.test.ts`

## Validation Commands For Changes Touching These Surfaces

Repo-local commands:

- `pnpm --filter witnessops-web typecheck`
- `pnpm --filter witnessops-web test`
- `pnpm --filter witnessops-web build`

Repo contract also names:

- `pnpm health`
- route parity against the frozen baseline captured at slice start
- `pnpm smoke:buyer-path:test` when public buyer or proof-surface copy changes

## Known Deferred Cleanup

- Several older local `codex/*` branches remain and are unrelated to this map.
- This map is source-derived documentation. It should be regenerated after route, page, assistant, admin, or verifier UI changes.
- This map does not replace the API contract test or any proof/verifier artifact.

