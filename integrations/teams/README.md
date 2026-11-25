# WitnessOps Academy — Microsoft Teams source-only adapter

Status: **TESTED locally, NOT INSTALLED, NOT DEPLOYED, NOT TENANT-ACCEPTED** (25 November 2026).

This first slice creates an Adaptive Card announcement for one of Academy's two existing pilot cases. The card contains a fixed, public scenario teaser and an explicit `Action.OpenUrl` to the existing Academy lesson route. It does not move the lesson into Teams or authenticate a learner in Teams. The opened Academy page applies existing Keycloak sessions, approved-pilot admission, ownership and saved-progress checks; the card itself grants nothing.

## Source and test

```sh
node --test integrations/teams/test/academy-case-card.test.mjs
node --input-type=module -e "import { academyCaseCard } from './integrations/teams/academy-case-card.mjs'; console.log(JSON.stringify(academyCaseCard('report-or-evidence'), null, 2))"
```

The generator returns only a message payload. **It never sends or schedules a message.** One authorised bot or Teams Workflow would be required to distribute this card; no bot, workflow, tenant app or webhook was created.

The adapter deliberately maintains one progress authority. It contains no Teams identifier mapping, learner answer, assessment result, new data store or grading. Learners authenticate directly with Academy if they follow the link. This is not evidence that the linked production route is accessible or that the invitation can be redeemed by the current audience.

## What makes an actual in-Teams personal tab possible

Microsoft Teams tabs are embedded webpages. Current Academy source uses `frame-ancestors 'none'`, `X-Frame-Options: DENY` and `SameSite=Lax` cookies, so the current authenticated page cannot simply be embedded in a Teams iframe. Do **not** widen the existing Academy response's frame policy as a quick fix, change shared cookie settings or equate an untrusted Teams context ID with a Keycloak subject.

An embedded, saved, authenticated tab needs more than an identity map: every
data operation must also prove current Academy authorization, recheck the Academy
grant, retain owner/version/idempotency controls, and use restrictive tab-only
browser policy. This branch implements only the independently reviewed token
verification and explicit identity-link foundation. It deliberately does not add
Teams draft reads or writes. Support for an arbitrary outside tenant is not
assumed. A tenant-installed bot or app is a separate Microsoft permission and
approval gate. The first data-access acceptance must cover two synthetic users,
denied access without an Academy grant, case save/reload, no cross-user read, and
no leakage of private answers to channel messages.

## Boundaries and next acceptance

- This branch is **source-only**; it does not enable public signup, payment, general Academy admission, provider configuration or a production release.
- Cards can be generated from approved case identifiers only. Titles, prompts and links are fixed at source; no arbitrary caller URL, query parameters or bearer tokens.
- No Teams organisation was contacted; no message sent. Do not claim installation or Teams-host rendering from Node tests.
- Existing saved Academy case records remain the one authoritative source. The creator/community/Teams distribution paths must not create competing learner ledgers.

The private Teams application and single-tenant Entra registration are maintained
outside this public source. The next acceptance gate is an attended, isolated
test-host configuration and founder-user link check. That is not a production
deployment, shared-Team installation or authorization for lesson data inside the
tab.

References:
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/tab-requirements
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference

## Private Teams personal-tab package (25 November 2026)

Added a Teams launch page at `/academy/teams/launch`. With the bridge disabled
(the default), it remains a public-only launcher: TeamsJS initializes, two fixed
cases open the existing protected Academy lessons in a new browser window, and no
token is requested. When the bridge is explicitly configured, the same page adds
the user-initiated identity-link action described below. Neither mode reads or
writes learner progress inside Teams.

Only that public page has Teams-specific `frame-ancestors` and omits `X-Frame-Options`. All other Academy pages retain their existing `DENY` and `SameSite=Lax` controls. The route is currently **source-only** and not live at academy.witnessops.com.

`integrations/teams/manifest.json` is a local test *Teams app package identifier*, **not an Entra application registration or consent receipt**. Its personal tab targets the source-only route.

Build a private test ZIP using standard-library Python:

```sh
python3 integrations/teams/build-package.py --out ./academy-teams-private-preview.zip
```

The ZIP contains `manifest.json`, `color.png`, and `outline.png` only. Keep it private until the source route is independently deployed to a suitable test host, the manifest's actual endpoint is validated, and a named tenant/user has custom-app upload rights. Do **not** install this package yet against the current undeployed URL.

Focused source checks: `node --test integrations/teams/test/academy-case-card.test.mjs apps/witnessops-academy-server/test/teams-launch.test.mjs` (10/10 passed under Node 24 on ops-laptop-03 on 25 November). Full Node 22 CI, preview-host CSP/frame inspection, Microsoft Teams rendering and Entra SSO acceptance remain pending.

One private smoke message was sent to the authenticated Teams user's **self-chat** and read back; no shared team/channel communication or app installation occurred. That message checks Teams delivery, **not** Adaptive Card rendering or a registered Teams app.

### Optional private Teams SSO manifest binding

The package builder can embed a separately verified Entra app registration without adding that app/tenant identifier to public Git source:

```sh
python3 integrations/teams/build-package.py \
  --entra-app-id <SINGLE_TENANT_APP_ID> \
  --out ./academy-teams-private-sso-staged.zip
```

This adds `webApplicationInfo.id` and `webApplicationInfo.resource` (`api://academy.witnessops.com/<SINGLE_TENANT_APP_ID>`) to the private ZIP. The helper rejects malformed app IDs, refuses alternate lesson origins, and does not register an application or request access tokens. The tenant-specific manifest is an **operator-held build artifact** and must not be committed to the public repository.

An Entra scope or Teams client pre-authorization alone only enables a token
exchange. The Academy server now contains an off-by-default, source-only identity
link bridge. When explicitly configured, the tab asks for a Teams token only on
the user's Link action. The server verifies its signature, exact single tenant,
API audience, v2 issuer, lifetime, immutable user claims, delegated
`access_as_user` scope and allowlisted Teams client. It then issues a five-minute,
one-use link intent whose raw value is never stored.

The user must finish the link in a top-level Academy page backed by the existing
Keycloak session and explicitly confirm with Academy's CSRF control. The resulting
record maps immutable Entra `(tenant, object, subject)` claims to the existing
Academy identity UUID. It does not create an Academy account, session, pilot
grant, lesson record or parallel progress store. Unlinking revokes only the map
and preserves the Keycloak account, admission state and saved drafts. Email,
display name, UPN and Teams context identifiers are never used to select an
Academy owner. Unreferenced intents are purged in bounded batches after they have
been expired for 24 hours; confirmed link audit rows retain their originating
intent metadata but never the raw Teams bearer or one-time token.

The feature remains disabled unless all of
`ACADEMY_TEAMS_IDENTITY_BRIDGE=true`, `ACADEMY_TEAMS_TENANT_ID`,
`ACADEMY_TEAMS_APP_ID` and migration `005_academy_teams_identity_links` are
present. No private tenant/application value is committed here. This source slice
does not add Teams lesson read/write APIs: a link is not a second Academy login,
and existing protected routes still require Keycloak plus the Academy grant and
owner checks. It also does not deploy the route, change Entra/tenant policy or
install the app. The package remains installation-incomplete while its configured
endpoint returns 404; live token shape, iframe behavior and YubiKey-backed sign-in
require a separate attended test.
