# MSP Ticket Triage Demo — Validation Record

- **Final validation date:** 2026-08-19
- **Branch base:** `3fe543a781612f0e4ace1a315f1becd223cc18a4`
- **Runtime:** Node.js `v22.23.1`, pnpm `9.15.4`
- **Live model:** `gpt-5.4-mini`

## Final checks

| Mechanism | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass; 10 workspace projects |
| `pnpm health` | Pass |
| Next.js static generation | 157/157 |
| Existing web tests | 723/723 |
| Proof tests | 46/46 |
| Ticket-triage tests | 37/37 |
| Route parity | 2/2 |
| Receipt smoke | 3/3 |
| Buyer-smoke unit tests | 5/5 |
| SEO XML tests | 1/1 |
| Docs and signals validation | Pass |
| Mock acceptance | 4/4 fixtures |
| Live synthetic acceptance | 4/4 fixtures |
| `git diff --check` | Pass |

The live acceptance runner retained only fixture ID, pass/fail, provider/model,
and duration. It did not retain raw prompts or responses.

Earlier development runs did not all pass: the recorded intermediate outcomes
included three 3/4 runs and two 2/4 runs. Those failures exposed model wording
and valid queue variance, an over-broad generated-text guard, and a
topic-template mismatch. They were not relabelled as passes. The final
server-materialized contract passed 4/4 with the mock provider and 4/4 with the
pinned live model.

## Security remediation evidence

The initial diff scan (`3c5a5a81-7b3a-4a35-be18-5f85d7a72a1c`) reported three
bounded Low findings. A first post-fix scan
(`7cfe29b1-0a53-4f21-9d58-46cef7105258`) closed malformed-target process
termination but found two residual Low paths in generated-text handling and
monotonic escalation. The final implementation changes the trust boundary
rather than relying on phrase enumeration alone:

- provider-generated prose is discarded before output; validated enum
  classifications are rendered through server-owned advisory templates;
- acceptance requires the exact reconstructable materialized form;
- known unsafe phrases are caught by the local final-output guard, while an
  unlisted equivalent phrase was also proven absent from returned output;
- P1/P2 priority and structured security signals prevent bounded-recovery
  downgrade, and contradictory compromise fields normalize to security/P2;
- normalized security disposition takes precedence over phone-recovery topic
  templates, so compromise cases retain security-owned questions and actions;
- link-related guidance uses evidence-neutral source/content language and does
  not infer that a website link came from a message;
- materialized facts identify submitted classifications and unverified ticket
  wording without inventing whether a link was opened or credentials entered;
- malformed raw `GET //[` returned 400 and the same Node 22 process then
  returned 200 from `/health`.

No live security scan, intrusive traffic, public form submission, or external
action was performed. The live model calls used only the four owned synthetic
fixtures.

## Loopback execution

The app was started with the explicit enable flag, pinned model, and existing
mode-`600` API-key file. The key value was neither printed nor copied.

Observed HTTP contract:

- `GET /health` → 200 with loopback/provider/model/no-action markers.
- `GET /?fixture=DEMO-002` → 200 with synthetic attachment metadata.
- Foreign `Origin` → 403.
- Alternate `Host` → 403.
- Synthetic `POST /api/triage` → 200 with advisory/no-action controls.
- Body larger than 64 KiB → 413.
- Synthetic local form flow → 200, P2 security queue, human review required.

Browser QA at 1280 px and 390 px found no horizontal overflow. The mobile form
collapsed to one column and retained a visible action control.

## Preserved boundaries and unknowns

- Only synthetic fixtures were sent to the model provider.
- One local synthetic demo form was submitted; no public or customer form was
  submitted.
- No customer data, credential material, attachment bytes, or external-action
  tools were available to the model.
- No public route, navigation item, production application, Caddy rule, DNS
  record, or Kubernetes deployment was changed.
- The existing private n8n runtime was read only; no workflow or credential was
  created or imported.
- The loopback server has no user login. Other local processes can reach it, so
  it must not run on a shared or untrusted workstation.
- `store: false` is set, but provider data controls still apply; this is not a
  zero-retention or local-processing claim.
- The synthetic-data label is an operator boundary, not a detector that can
  prove pasted text contains no real data.
- Any future customer deployment still requires customer-owned provider and
  access decisions, an explicit data boundary, and a separately authorised
  deployment lane.
