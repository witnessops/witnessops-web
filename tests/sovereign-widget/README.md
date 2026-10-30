# Sovereign homepage widget acceptance

The homepage mounts Sovereign behind the development preview flag and uses the
existing `/api/ask-witnessops` request/response contract. The Sovereign character
is a draggable launcher. Clicking opens
the conversation; dragging does not. The desktop dialog has its own move handle.
Both surfaces stay within the visible viewport. Arrow keys move them, Shift
increases the step, and Home or Reset position returns them to the bottom right.
On narrow screens the pet remains movable and chat uses the full viewport.
Suggestions and the transcript option scroll with the conversation in the widget,
while the composer and preview disclosure stay visible when the keyboard opens.
Temporary viewport changes clamp the pet without forgetting its chosen position.

Closing preserves the draft, pending request and conversation in component memory
until page navigation/reload. On a wide screen, a press that starts and ends on
the dimmed page closes the chat. On a phone, a downward flick on the header
closes it. The close button and Escape still close it. A drag that starts
inside the chat does not. Position is not persisted. Normal questions send the
question and recent complete exchanges to the existing API. The transcript is not
automatically included in contact. Explicit development `?sim=` scenarios remain
simulated and make no API request; the dedicated assistant preview keeps its
simulation default. This widget does not change the production release gate.

The public Ask runtime accepts `WITNESSOPS_ASK_OPENAI_MODEL=gpt-6.1-terra`;
its existing default remains `gpt-5.4-mini`. Model selection is server-side and
does not change the separate docs-assistant model. Without an authorized API
configuration, an unavailable response stays an error with an explicit retry.

## Local checks

Use Node 22 and pnpm 9.15.4. Stop website dev before running this fixture; it owns
the website's `.next` directory and port 3012. Do not overlap it with a build.

```sh
CI=1 pnpm exec playwright test --config tests/sovereign-widget/playwright.config.ts
```

The default uses Playwright Chromium. An installed Chrome may be selected with
`PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`. Touch input is emulated by Chromium; this
does not claim testing on a physical phone. Public production acceptance remains
`tests/ui-proof/homepage-priorities.spec.ts`, using the build from `pnpm health`.
Keyboard regressions explicitly simulate a shrinking visual viewport while the
layout viewport stays unchanged, and cover delayed focus and position restoration.

The connection cases use browser-intercepted API fixtures. Unmocked requests in
those cases fail the test and receive a synthetic 503; external requests are
aborted. The separate `local-route.spec.ts` passes requests through to the real
local API route and checks its honest unavailable state and explicit retry.
Three distinct unanswered questions each keep their own error; only the latest
offers Retry, and retry does not duplicate the question or send unsuccessful
messages as history.
The fixture server sets `OPENAI_API_KEY` to an empty value so inherited
credentials cannot enable a provider. These tests do not establish a live
AI/provider connection.

Connection cases cover generated labels, canonical source links, EN/PL action routes,
validated recommendation terms and request links, bounded history of complete
exchanges, exclusion of refused exchanges, unsafe source rejection,
503/429/network retries, a success after an earlier failure, duplicate submissions,
and closing/reopening during a pending request. The timeout test checks that the
helper requests 20,000 ms, adapts only `AbortSignal.timeout` scheduling to the
Playwright clock, and fast-forwards a real abort signal to exercise fetch failure
and retry without a 20-second wait. Explicit error/handoff/slow/timeout/typing
simulation cases and the dedicated assistant preview without a sim flag verify
that none reaches the API.

## Polish domain move

Language and route prefix are separate component inputs. Today `/pl` mounts
`<AskSovereignWidget locale="pl" routePrefix="/pl" />`. When a Polish domain serves
Polish pages at `/`, mount `<AskSovereignWidget locale="pl" />` (empty prefix).
Then contact/docs action links use `/contact` and `/docs` on that origin. Returned
source citations retain the canonical page supplied by the answer. Assets are also
same-origin paths. No host detection, cross-domain storage, DNS, redirects,
canonical URLs, or deployment changes are part of this widget implementation.
