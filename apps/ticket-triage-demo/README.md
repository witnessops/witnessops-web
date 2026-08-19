# WitnessOps Ticket Triage Demo

Private, loopback-only implementation of the Company AI Workspace v0.1 MSP
Ticket Triage demonstration.

The app accepts synthetic fixtures, calls one explicitly configured model, and
returns an advisory triage draft that always requires human review. It has no
tools and cannot send messages or mutate external systems.

## Safety boundary

- The server refuses to start unless `TICKET_TRIAGE_DEMO_ENABLED=true`.
- It binds only to `127.0.0.1`.
- Live mode requires `TICKET_TRIAGE_PROVIDER=openai`, an `OPENAI_API_KEY`, and
  the pinned `TICKET_TRIAGE_MODEL=gpt-5.4-mini` model.
- Mock mode is accepted only when `NODE_ENV=test`.
- Input classification must be `synthetic_demo`.
- Attachment bytes are never accepted.
- Provider errors are converted to bounded failure envelopes.
- Provider prose is not returned to the interface. Validated enum
  classifications are rendered through server-owned advisory templates.
- No public WitnessOps route or navigation entry is added.
- Loopback binding is a host boundary, not per-user authentication. Do not run
  the demo on a shared or untrusted workstation.

## Provider and data boundary

Live mode sends the synthetic ticket fields to the configured OpenAI API
project. The request sets `store: false`, but that is not a zero-retention or
local-processing guarantee. OpenAI's abuse-monitoring and project data controls
still apply; see the current [OpenAI data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).

This demo therefore MUST NOT receive real customer, employee, credential, or
ticket data. A future customer deployment requires an explicit provider/data
boundary and customer-owned project before that boundary changes.

## Commands

```sh
pnpm --filter @witnessops/ticket-triage-demo test
pnpm --filter @witnessops/ticket-triage-demo typecheck
pnpm --filter @witnessops/ticket-triage-demo acceptance:mock
```

For a live synthetic acceptance run, load the approved API key into the process
environment without printing it, then run:

```sh
TICKET_TRIAGE_MODEL=gpt-5.4-mini \
  pnpm --filter @witnessops/ticket-triage-demo acceptance:live
```

To run the private interface:

```sh
TICKET_TRIAGE_DEMO_ENABLED=true \
TICKET_TRIAGE_PROVIDER=openai \
TICKET_TRIAGE_MODEL=gpt-5.4-mini \
  pnpm --filter @witnessops/ticket-triage-demo dev
```

Open `http://127.0.0.1:3025`. Do not proxy or expose it publicly.

`config.example.env` lists the complete non-secret runtime contract. It is an
example only; load the API key from the existing restricted secret store.

The frozen implementation contract is [SPECIFICATION.md](./SPECIFICATION.md).
