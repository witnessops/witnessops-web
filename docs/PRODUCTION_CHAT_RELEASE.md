# Public chat release scope

This source change publishes the Ask Sovereign launcher and the English and
Polish assistant pages in production. `POST /api/ask-witnessops` reaches its
existing validation, rate limit, policy and provider-configuration checks
instead of returning an unconditional 410. Production conversations always use
the API; the dedicated pages cannot fall back to simulated replies.

The existing server-side AI configuration and model allowlist remain in force.
Missing or disabled configuration and provider failures retain the unavailable
response and explicit retry. No credential, model selection or provider
permission is provisioned by this change. Requests to use stolen credentials
are rejected before a provider call, including when they appear in history.

Development simulations remain available only in development. Production
ignores `?sim=` parameters and keeps the internal review panel and draft-copy
notice hidden. Booking, voice, mailbox/calendar access and email delivery are
outside this release. The assistant pages remain `noindex`; the existing
analytics exclusion and conversation disclosure remain in place.

## Acceptance and deployment

Run `pnpm health`, then the production-build browser checks through
`pnpm ui-proof:hero:ci`. The production chat cases exercise desktop/mobile,
English/Polish, real API wiring with mocked responses, ignored simulation
parameters and retry. Production-mode route tests cover an offline provider
fixture, disabled/missing configuration, malformed input and refusal before
provider access. These checks use no live provider credentials and establish
neither live delivery nor production acceptance.

Merge, image publication and deployment remain separate operator decisions
under [deployment authority](DEPLOYMENT_AUTHORITY.md). After an approved
deployment, one separately approved synthetic chat request must return a
validated AI-assisted response before claiming end-to-end operation. Rollback
uses the separately approved retained image or a revert of this change; no
secret rotation is required by this source change.
