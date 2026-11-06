# Live fit-call scheduling (draft, disabled)

Mission ID: unregistered. Requester and coordinator: Website Watcher. Accountable implementer: Code Engineer. Reviewer: Security, before any merge or enable. Authority for this source draft: Karol's direct GO t115u in the Website Watcher chat on 2026-11-06 at 23:05 Europe/Warsaw, checked against that chat, in response to a calendar draft that was waiting for GO.

That authority covers this bounded coding change and a draft pull request. It does not cover merge, marking the pull request ready, deployment, live enablement, production changes, credential or access changes, real mail, real invitations, real calendar writes, or a new unattended workflow. Auto-merge stays off.

Base commit for the branch: `15511f44af8a6896aa9673df583ca7fe6fc55f64` (`#547`). `#548` is `61d8d6c2d2441b97c9d45de9bc1911a3b3166a0d` and is already an ancestor of that base. The draft head SHA is the branch tip, not this base.

This document is source and operator guidance for a later, separate enable decision. It is not evidence that scheduling is live.

## What this draft is

The fictional preview from the Sovereign booking work stays on `POST /api/sovereign-booking`. Production still returns `410 preview_closed` for that route, including when `NEXT_PUBLIC_WO_PREVIEW=1`. The preview still uses an in-memory calendar, the fixed code `314159`, and no mail. It is not a fallback for the live route.

`GET` and `POST /api/live-booking` are a separate server path.

- `WITNESSOPS_LIVE_BOOKING_ENABLED` must be the raw value `1`. Any other value, including whitespace around `1`, is not enabled and returns `410` with `not_enabled`. The flag is not trimmed.
- When the flag is `1` but configuration is incomplete, the route returns `503` with `unavailable`.
- Neither state calls Google, Resend, or the demo calendar.
- A ready route still refuses a request whose `Origin` and `Host` do not match `WITNESSOPS_LIVE_BOOKING_PUBLIC_ORIGIN`.

The public chat may read `GET /api/live-booking` after it opens. While the mode is not `ready`, that response is `disabled` or `unavailable` and the chat does not show a scheduling button. Static HTML does not advertise a booking. A ready mode is the only state that shows the scheduling control. A recorded calendar event, mail-provider acceptance, and inbox delivery are separate sentences. Inbox delivery is always `not_observed`.

## Calendar adapter

Runtime integration is HTTPS from the Node server to the Google Calendar API v3. It does not use a chat connector, an MCP token, the `gws` CLI, or a service account.

Auth flow: OAuth 2.0 refresh token for the mailbox owner.

1. An operator completes the OAuth consent screen as `engage@mail.witnessops.com` with offline access and the scopes below. This draft does not perform that consent.
2. The server posts `grant_type=refresh_token` to `https://oauth2.googleapis.com/token`.
3. Calendar calls use `Authorization: Bearer` on `https://www.googleapis.com/calendar/v3`. Redirects are rejected. Any other host is rejected before fetch.

Minimum scopes, both required on that refresh token:

- `https://www.googleapis.com/auth/calendar.events.owned` — see, create, change, and delete events on calendars the mailbox owns, including `events.insert`, `events.get`, `events.list`, and `events.patch`.
- `https://www.googleapis.com/auth/calendar.events.freebusy` — `freeBusy.query`.

`https://www.googleapis.com/auth/calendar` is intentionally not requested.

Calendar id must be exactly `engage@mail.witnessops.com`. Time zone must be exactly `Europe/Warsaw`. Slots are weekdays at 09:00, 12:00, and 15:00 Europe/Warsaw for 20 minutes, inside 14 days, and at least 4 hours ahead. DST gaps and repeated wall times are not offered. The server recomputes the instant from the slot id. The visitor's timezone is display only.

Event writes set `sendUpdates=none` and `reminders.useDefault=false`. They do not create a Meet conference. The event id is chosen by this server before the insert and is base32hex, so a lost response can be resolved with `events.get` on that id. `id` and `iCalUID` are not both sent on insert, because the Calendar API says only one should be supplied.

A service account was not used. The insert reference says a service account needs domain-wide delegation to populate attendees. That is a broader admin grant and is a rejected alternative for this draft.

### Mailbox and calendar prerequisites

- The Google user for the refresh token can create and cancel events on the primary calendar `engage@mail.witnessops.com`.
- That calendar remains in `Europe/Warsaw`. This code does not change calendar settings.
- The OAuth client is allowed to issue a refresh token for that user. An internal Workspace client avoids a public-app verification review; this draft does not create the client.
- The refresh token, client id, and client secret exist only in the app process environment. They are not in this repository.

### Google notification caveat

`sendUpdates=none` is what this code sends. The Calendar API still says some mail might be sent, and that `none` can keep an event from syncing to an external guest calendar. The guest path in this draft is the Resend invitation, not Google's notification. Do not switch to `sendUpdates=all` to "fix" sync: that would add a Google invitation beside the Resend invitation.

## Mail roles

Resend is required. `WITNESSOPS_MAIL_PROVIDER` must be `resend`. The file and Microsoft 365 providers are not accepted here. Google invitations are not a substitute.

| Role | Idempotency key | Attachment | Meaning |
| --- | --- | --- | --- |
| verification | `booking-verification/<id>` | none | One-time code. Does not hold a time or create an event. |
| confirmation | `booking-confirmation/<bookingId>` | none | Says a calendar event was recorded. Not the invitation. |
| invite | `booking-invite/<bookingId>` | `text/calendar` method `REQUEST` | The calendar invitation. |
| cancellation_notice | `booking-cancel-notice/<bookingId>` | none | Says cancellation was recorded. |
| cancellation_invite | `booking-cancel-invite/<bookingId>` | `text/calendar` method `CANCEL` | The calendar cancellation. |

The invite is sent only after the confirmation send is accepted. A retry uses the same Resend `Idempotency-Key`. Resend treats that key as a duplicate for about 24 hours when the payload matches. A `409` is treated as an unknown acceptance, not as success. Provider acceptance is not inbox delivery. No delivery webhook was added. Existing `/api/provider-events/*` routes are unchanged. A Cloudflare worker was not added; inbound mail is not required for this path.

`WITNESSOPS_LIVE_BOOKING_FROM_EMAIL` is required and is not defaulted to `engage@mail.witnessops.com`. Reply-To defaults to that public mailbox. Whether the From domain is verified at Resend is unresolved. This draft does not call Resend's domain API and does not claim `send.witnessops.com` or any other domain is verified. A `403` from Resend leaves mail `rejected` and does not relabel the calendar result.

## Store, concurrency, and ambiguous results

The store is a directory of JSON files plus a booking lock. It is not the admission store. The configured path must already exist, must be a real directory rather than a symlink, and its real path must not be the token store, the intake store, or a directory inside either. The process creates subfolders mode `0700` and writes files mode `0600`. It does not create the parent directory, allocate cloud storage, or run a migration.

The lock is held only around file changes. Calendar and Resend calls stay outside it. A booking write carries a revision. A stored cancellation is not replaced by a later `event_recorded` write. If an insert finishes after cancellation won, the server asks Google to cancel that event. If that cancel is itself unknown, the stored state stays unknown and no confirmation or invitation is sent. A confirmation already handed to the mail provider when cancellation wins is not stored as accepted and does not start the invitation. A live process is not removed from the lock because its file time was moved backward. Same-host process-id checks are not proof that a lock is safe on shared storage used by more than one machine.

Record folders and record files inside the store must not be symlinks. A symlink there is refused before a write. The store root and its real path still must not alias the token store or the intake store.

All mutations take one store lock. A hold is one file per slot. A second active hold for that slot is refused. Tests cover two callers in one process and two operating-system processes on a local temporary directory. That is not proof of a production volume. The lock is safe only on a shared POSIX filesystem with atomic exclusive create. NFS without that behavior, or object storage, is not an acceptable store. Multi-instance scheduling stays disabled until that shared directory is an accepted prerequisite.

There is no background worker and no reconciler loop. The booking file is the only outbox. `confirm` writes `insert_started` and the event id before calling Google. A retry with the same idempotency key reads that id, calls `events.get`, and inserts only when Google says the event is absent. Unknown `get` or `insert` responses stay `insert_started` and send no mail. A definite rejection releases the hold and sends no confirmation. After a known insert, `events.list` looks for another blocking event in that interval and ignores the next page rather than scanning forever. An overlap cancels our event with `sendUpdates=none` and does not send the invitation. If that list or cancel is unknown, the status stays unknown and is not described as completed.

Remaining limits, which keep this from being a claim of no double booking:

- Google free/busy data has no event id. A busy block that is not visible to `events.list` can still exist. Availability is only the primary calendar above, not every calendar the mailbox can see.
- An external edit can land after the free/busy read and before insert. The follow-up list reduces that window and does not remove it.
- The Calendar API says an event-id collision might not be detected at insert time. Ids are random 20-character base32hex values. A collision is unlikely and still possible.
- A crash can leave `insert_started` or unsent mail until the same browser session retries. After the session ends, nobody retries automatically.
- The cancellation code is returned once in the confirm response and stored only as a hash. It is not written into the booking file and it is not repeated by a later read. Mail templates do not include it. A leaked store still exposes the mailbox, name, and topic on the booking record, which the mail path needs. Verification files are removed when the code is accepted, rejected, or expired. Expired session files are removed on the next locked store operation. There is no background sweeper, so a quiet directory can keep an expired session until that next operation. An `insert_started` booking can still occupy its slot after the session ends when the provider result was lost and no event was found. That remains an operator cleanup, not an automatic success.
- Rate limits still record a hashed IP from the proxy header and a hashed mailbox. Those are not client identity. The per-mailbox cap and the store-wide cap of 30 verification sends per hour are reserved together, and only when a send will be attempted. A mailbox that is already at its cap does not burn the global counter. Code entry allows 5 attempts, then the code is spent. A session can request 3 codes. The fictional code `314159` is always rejected. Availability calls require a live session and stop at 12 per session per hour.
- Holds last 5 minutes and are ignored after expiry without a sweeper. Sessions slide for 20 minutes and end 45 minutes after creation.
- Stale lock recovery waits 30 minutes and also requires the recorded process id to be dead on this host. That is not a multi-machine lease. A crash can leave the lock until that window, or until an operator removes the lock file.
- Resend idempotency expires. A retry after that window can send another message if the local mail state was never marked accepted.

## Safe enable checklist

Do not enable from this draft alone. Security review, then a separate operator decision, are required. Enabling is changing process environment and restarting the already deployed app. This repository change does not do that.

1. Create an empty directory on storage that every app instance will share, with POSIX locking. Do not point it at the intake or token store.
2. Mint a refresh token for `engage@mail.witnessops.com` with only the two scopes above. Confirm the calendar id and time zone.
3. Choose a From address on a domain Resend has already verified for sending. This draft cannot see that verification.
4. Set `WITNESSOPS_MAIL_PROVIDER=resend` and provide the existing Resend API key to the app process through the normal secret path. Do not put the key in the repo.
5. Set the variables below. Leave `WITNESSOPS_LIVE_BOOKING_ENABLED` unset until the rest is present. A partial set stays unavailable.
6. Restart the app. `GET /api/live-booking` from the public origin should return `mode: ready`. A request without the flag should still return `not_enabled`. `POST /api/sovereign-booking` in production should still return `410`.
7. Run one synthetic booking only under a separate accepted test window. Confirm the event exists on the engage calendar, that Google was not relied on for the guest invitation, and that the UI text matches event versus mail. This draft did not do that.
8. Watch for `insert_started` and `overlap_unknown` records. They are not success. There is no worker to finish them.

Required environment names:

- `WITNESSOPS_LIVE_BOOKING_ENABLED` — exact `1` only when the decision to enable is real
- `WITNESSOPS_LIVE_BOOKING_STORE_DIR` — existing absolute directory
- `WITNESSOPS_LIVE_BOOKING_PUBLIC_ORIGIN` — exact `https` origin with no path
- `WITNESSOPS_LIVE_BOOKING_FROM_EMAIL` — Resend From address
- `WITNESSOPS_LIVE_BOOKING_CODE_PEPPER` — at least 32 characters, used only to hash codes and rate keys
- `WITNESSOPS_MAIL_PROVIDER` — `resend`
- `WITNESSOPS_RESEND_API_KEY`
- `WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_ID`
- `WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_SECRET`
- `WITNESSOPS_LIVE_BOOKING_GOOGLE_REFRESH_TOKEN`
- `WITNESSOPS_LIVE_BOOKING_CALENDAR_ID` — exact `engage@mail.witnessops.com`
- `WITNESSOPS_LIVE_BOOKING_TIME_ZONE` — exact `Europe/Warsaw`

Optional: `WITNESSOPS_LIVE_BOOKING_REPLY_TO`. Unset means `engage@mail.witnessops.com`.

## Rollback

Set `WITNESSOPS_LIVE_BOOKING_ENABLED` to any value other than `1`, or unset it, and restart the app process. The route returns `not_enabled` and stops provider calls. Do not delete booking files as part of rollback; they are the record of events that may already exist. Cancel any leftover Google events manually on the engage calendar. No schema migration needs to be reversed because none is run. The fictional preview flag is not part of rollback and must not be turned on in production to "keep booking working."

## Tests

Automated tests use Node 22, a temporary directory, synthetic addresses, and injected transports. They do not call Google or Resend. A global fetch that throws is installed for the disabled and unavailable route cases. Two OS processes share one local temporary directory for the hold lock. That is not a production volume and it is not proof of multi-instance safety on the real store.

From `apps/witnessops-web`:

```bash
NODE_ENV=test TSX_TSCONFIG_PATH=tsconfig.test.json node --import ./scripts/register-server-only-test-stub.mjs --import tsx --test \
      src/lib/server/live-booking/warsaw-time.test.ts \
      src/lib/server/live-booking/live-booking.test.ts \
      src/lib/server/live-booking/live-booking-security.test.ts \
  src/components/ask-sovereign/sovereign-live-booking.test.tsx \
  src/app/api/sovereign-booking/route.test.ts \
  src/lib/sovereign-booking-session.test.ts \
  src/components/ask-sovereign/demo-booking-calendar.test.ts \
  src/components/ask-sovereign/demo-booking-client.test.ts \
  src/lib/sovereign-release.test.ts \
  src/lib/server/api-contract.test.ts
```

Also run `pnpm --filter witnessops-web lint`, `pnpm --filter witnessops-web typecheck`, `pnpm --filter witnessops-web build`, and from the repo root `pnpm route-parity` after that build. Disabled behavior is covered by calling the handler with the flag unset. A local site smoke is not evidence that the route is safe to enable.
