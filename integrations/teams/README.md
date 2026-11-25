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

An embedded, saved, authenticated tab needs a separately approved and independently reviewed identity bridge: Teams / Microsoft Entra SSO token validation (issuer, audience, signature, tenant, replay/expiry, subject), explicit account link to the existing Academy identity, Academy's existing grant check per action, restrictive tab-only CSP/frame ancestors, safe cookie/token handling, and a protected logout/revocation path. Support for an arbitrary outside tenant is not assumed. A tenant-installed bot or app is a separate Microsoft permission/approval gate. The first real acceptance must cover two synthetic users, denied access without an Academy grant, case save/reload, no cross-user read, and no leakage of private answers to channel messages.

## Boundaries and next acceptance

- This branch is **source-only**; it does not enable public signup, payment, general Academy admission, provider configuration or a production release.
- Cards can be generated from approved case identifiers only. Titles, prompts and links are fixed at source; no arbitrary caller URL, query parameters or bearer tokens.
- No Teams organisation was contacted; no message sent. Do not claim installation or Teams-host rendering from Node tests.
- Existing saved Academy case records remain the one authoritative source. The creator/community/Teams distribution paths must not create competing learner ledgers.

For an actual inside-Teams pilot, the next action-specific approval is to register or select a **private test Teams app** in a named tenant and configure its Entra identity bridge. That action is **not** performed here.

References:
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/tab-requirements
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference

## Private Teams personal-tab package (25 November 2026)

Added a **public-only Teams launch page** at `/academy/teams/launch`. It uses TeamsJS `app.initialize()`, shows two fixed Academy cases, and opens the existing protected Academy lessons in a new browser window. It is not a sign-in bridge and never reads or writes learner progress. This is a stricter and safer intermediate design than embedding the existing protected Academy pages.

Only that public page has Teams-specific `frame-ancestors` and omits `X-Frame-Options`. All other Academy pages retain their existing `DENY` and `SameSite=Lax` controls. The route is currently **source-only** and not live at academy.witnessops.com.

`integrations/teams/manifest.json` is a local test *Teams app package identifier*, **not an Entra application registration or consent receipt**. Its personal tab targets the source-only route.

Build a private test ZIP using standard-library Python:

```sh
python3 integrations/teams/build-package.py --out ./academy-teams-private-preview.zip
```

The ZIP contains `manifest.json`, `color.png`, and `outline.png` only. Keep it private until the source route is independently deployed to a suitable test host, the manifest's actual endpoint is validated, and a named tenant/user has custom-app upload rights. Do **not** install this package yet against the current undeployed URL.

Focused source checks: `node --test integrations/teams/test/academy-case-card.test.mjs apps/witnessops-academy-server/test/teams-launch.test.mjs` (10/10 passed under Node 24 on ops-laptop-03 on 25 November). Full Node 22 CI, preview-host CSP/frame inspection, Microsoft Teams rendering and Entra SSO acceptance remain pending.

One private smoke message was sent to the authenticated Teams user's **self-chat** and read back; no shared team/channel communication or app installation occurred. That message checks Teams delivery, **not** Adaptive Card rendering or a registered Teams app.
