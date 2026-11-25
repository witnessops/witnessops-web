# Lesson 1: shared conversation practice

The **Report or evidence?** conversation is a three-step fictional backup review.
It starts with an agent's completion claim, presents a job log and manifest, asks
the learner to judge the evidence, offers one further verification action, then
asks for a closure decision. Feedback follows the learner's choice. There is no
model API, infrastructure execution, formal grade or award in this exercise.

## One lesson, two interfaces

The website at `/academy/learn/report-or-evidence/chat` and the Academy MCP tools
use `src/lesson-chat-engine.mjs` and `src/lesson-chat-store.mjs`. The definition's
public lesson ID is `report-or-evidence`, revision `backup-review-v1`.

Both interfaces resolve the existing Academy `(issuer, subject)` identity and
recheck current pilot admission. The browser uses its existing server session;
MCP uses its existing validated OAuth token. Neither accepts a learner identifier
in lesson arguments. The same learner can begin on one interface and resume on
the other. The source does not create another account system or database.

Progress uses the existing `academy_lesson_drafts` table with the internally
selected lesson key `report-or-evidence-chat-v1`. This keeps the original
worksheet answer under `report-or-evidence` intact. No migration, grant change,
automatic enrollment or production data rewrite is needed.

Only validated choice events are stored. The engine reconstructs feedback and
completion; clients cannot submit a score, completion flag or verification
result. Practice completion keeps backup creation **SUPPORTED**, recovery
**UNVERIFIED**, and task closure **BLOCKED**. Selecting a controlled restore
proposes the required next action; this simulation does not execute the restore
or supply its result.

## Website contract

| Route | Method | Purpose |
| --- | --- | --- |
| `/academy/learn/report-or-evidence/chat` | GET, HEAD | Conversation shell; no saved work is embedded in HTML |
| `/academy/api/lessons/report-or-evidence/chat` | GET | Current learner's progress, or the unsaved initial step |
| `/academy/api/lessons/report-or-evidence/chat/decision` | POST | Save one explicitly selected choice |
| `/academy/static/lesson-chat.js` | GET, HEAD | Conversation controller |
| `/academy/static/lesson-chat.css` | GET, HEAD | Conversation styles |

The decision body has exactly five fields:

```json
{
  "lesson_id": "report-or-evidence",
  "step_id": "judgment",
  "option_id": "created_recovery_unverified",
  "expected_version": 0,
  "request_id": "10000000-0000-4000-8000-000000000001"
}
```

The UUID above is a synthetic documentation example. A client generates a new
UUID for each new choice, using the version and allowed options it last read.
An uncertain save is retried only with the identical request. Database
compare-and-set prevents concurrent choices from overwriting each other. A
conflict requires reloading and asking the learner again. Reusing an accepted
request UUID for another choice is rejected. Unknown saved formats are retained
and never replaced automatically.

Writes require the current session, admission, exact Origin and CSRF token.
Decision bodies are bounded to 2 KiB. Saved progress is returned with `no-store`;
learner choices do not enter URLs, local/session storage or logs. The browser
clears private content on session loss, logout and page suspension, and
revalidates a browser-cache return. Login seals only the exact lesson/chat mode
and returns to a fixed route.

## MCP contract

The existing Streamable HTTP MCP service is reused. Its intended public address
is `https://academy.witnessops.com/mcp`; the source link is not evidence of a live
or accepted connection.

| Tool | Effect |
| --- | --- |
| `list_lessons` | Lists available curriculum and the shared chat revision |
| `start_lesson` | Reads the initial or existing step; does not reset or save |
| `inspect_evidence` | Reads the fictional evidence and current step |
| `submit_decision` | Saves the learner's selected choice with version and UUID |
| `resume_lesson` | Reads the same saved choices and coaching as the website |
| `get_progress` | Reads current progress and any practice completion summary |

The original `get_lesson`, `get_my_answer` and `save_answer` worksheet tools
remain available and cannot overwrite the separate conversation progress. All
nine tools retain the existing per-invocation access check. An unavailable or
revoked grant fails closed. Strict schemas reject owner or extra fields.

ChatGPT uses the native conversation and these tools. No custom embedded widget
is included. The learner must choose before `submit_decision` is invoked. This
feature does not grant an assistant authority to select answers or perform a
real backup operation.

## Validation and release

Use Node 22 and pnpm 9.15.4. `pnpm academy:test` includes deterministic engine,
save/replay, schema, admission, HTTP and client regressions. The browser and
PostgreSQL integration runners document their separate fixture opt-ins at the
top of each runner. Unit fixtures do not prove hosted identity-provider behavior.
`pnpm health` remains the full repository gate.

The loopback browser runner uses the real page, controller, HTTP handler and
shared lesson modules with synthetic identity/admission and a memory database.
It is an interface acceptance check, not a live ChatGPT or OAuth acceptance.
The PostgreSQL runner separately checks actual database concurrency and existing
runtime-role privileges with disposable data.

```sh
# Uses the workspace's installed Playwright browser, or the optional selected binary.
ACADEMY_CHAT_BROWSER=1 node apps/witnessops-academy-server/test/lesson-chat-browser-e2e.mjs

# Starts and removes its own unprivileged, loopback-only PostgreSQL 17 cluster.
ACADEMY_CHAT_POSTGRES=1 ACADEMY_CHAT_POSTGRES_TRANSPORT=tcp \
  ACADEMY_TEST_POSTGRES_BIN=/absolute/path/to/postgresql-17/bin \
  node apps/witnessops-academy-server/test/lesson-chat-postgres-e2e.mjs
```

The Academy CI workflow runs the conversation browser check after installing its
Playwright browser. This is a required source check in that job; adding the step
does not mean the job has run or passed for an unpublished candidate.

Ship the Academy public assets, lesson-server source and MCP source at the same
revision. MCP imports the shared engine/store from its sibling lesson-server
package; a bundle containing only the MCP package is incomplete. Restart the
services because browser assets are snapshotted at startup. The complete
unapplied proxy candidate under `deploy/academy/` contains the exact new paths
and methods. It must be integrated and accepted under a separately authorized
release, alongside the existing sites.

Final hosted acceptance must complete the exercise in the website, use a real
ChatGPT connection with the same learner, resume in both directions, confirm a
second learner cannot read that progress, and verify logout/revocation. Local
tests, a source merge and a connection link do not establish those observations.

Rollback restores the prior coordinated application/proxy/static release.
The additive chat rows can remain stored: the prior release does not read their
internal lesson key, and the original worksheet rows are unchanged. No delete
or destructive migration is part of this feature.
