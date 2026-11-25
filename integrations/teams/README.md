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
