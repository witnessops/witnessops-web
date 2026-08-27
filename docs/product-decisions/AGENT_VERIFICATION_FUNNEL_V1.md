# Agent verification funnel v1

Status: implementation contract for review

This document preserves the compact product and evidence contract for the WitnessOps agent-verification customer journey. The Grok artifact is a reconstructable design reference, not production code or production authority.

## Input authority

- Prototype classification: `PROTOTYPE_ACCEPTED_FOR_CODEX_HANDOFF`
- Grok archive SHA-256: `caba3bdbec74e2e33d431401be1660140bdae0d6ba7aec50a189142649608416`
- Handoff Markdown SHA-256: `fd3f477c350dde1abcb9fd822669933fbbecba5a4e330e6bd53241856cb5f40c`
- Prototype manifest SHA-256: `3e73678d47943edf102f8f50008386a3ce56382b392b5fbe5e908f64afcf6113`
- Starting WitnessOps base: `witnessops/witnessops-web@4af4af9d4b85259a65a56e8ea742287b00ab3aa2`
- Implementation branch: `wops/agent-verification-funnel-port-20260827`

The prototype URL and archive define accepted visual and interaction intent. They do not override the application repository, current product contracts, checker package, test results, or deployment authority.

## Public taxonomy and route mapping

| Public name | Canonical route | Production implementation |
| --- | --- | --- |
| WitnessOps homepage | `/` | Existing homepage with four linked journey steps |
| WitnessOps Skill Library | `/library` | Existing canonical Library route |
| Skill contract | `/library/[slug]` | Committed `SKILL.md`, exact-byte view/download/checker binding |
| Check a Skill | `/verify/skill` | Existing Aegis browser checker; no second policy engine |
| Run a witnessed action | `/review/sample-cases/witnessed-crm-status-change` | Recorded synthetic CRM replay |
| Signed API-key sample | `/review/sample-cases/ai-agent-action-proof-run` | Existing independently verifiable sample, unchanged |
| Doctrine | `/docs/how-it-works/proof-model` | Existing documentation route |
| Agent Risk & Control Review | `/review/request?productId=WORKFLOW-S` | Existing scoped intake with offer context |

`/catalog` remains the service catalogue. The production homepage remains `/`; the prototype Library root is not copied.

Customer-facing names do not include Palisade, wops-computer, or deskbot. `Aegis` and `bounded-computer` appear only as technical engine metadata.

## Four-step journey

1. Check the agent before it acts.
2. See one bounded action.
3. Inspect what happened.
4. Bring the real workflow.

The paid offer remains Agent Risk & Control Review. It is not Public Exposure Review, and this work does not change pricing.

## Checker authority and claims

- Engine: `aegis-deterministic@2.0.0-cleanroom.3`
- Aegis source: `VaultSovereign/Aegis@af967e166d44776675ed78e9fd68eda52c3d72ff`
- Vendored package SHA-256: `d438853a906de7949e3e476f7ca7c5589dcbd3d1f7d08e62b96d840900d046eb`
- Processing: the existing browser-bundled deterministic scanner
- Indexing: `/verify/skill` remains `noindex, nofollow` and excluded from the sitemap

Required public limitation:

> Aegis checks a SKILL.md against explicit deterministic policy rules. A pass means no governed pattern was detected under the selected policy; it does not prove the skill is safe.

Required local-processing claim:

> Paste or drop a SKILL.md. The scan runs locally in this browser. The skill is not uploaded, stored, or sent to a model.

The production acceptance test must inspect post-load request payloads for the submitted skill or sentinel. It must not generalize this claim to “zero network requests” unless that broader behavior is separately tested.

## Exact skill-byte contract

- Canonical source: `content/witnessops/skills/<slug>/SKILL.md`
- Encoding: committed UTF-8 bytes, with no invisible trimming or normalization
- Plain view: decoded from the canonical bytes
- Copy: copies the decoded canonical bytes exactly
- Download: returns the canonical bytes exactly
- Displayed SHA-256: computed from the canonical bytes
- Checker binding: server validates slug, version, and expected SHA-256 before prefilling those same bytes
- Editing or replacing the input visibly removes the exact-version binding
- Runtime image: the canonical public skill files are copied into the existing application image; no registry or remote fetch is introduced

The featured `governed-agent-verifier` production file currently hashes to:

`2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5`

This value must be recomputed from the committed file during tests. It is not trusted merely because the prototype recorded the same value.

## Recorded witnessed-action contract

Public stages:

1. Authority
2. Approval
3. Execution
4. Receipt

The page replays recorded data only. The visitor click is replay consent; it is not the authority for the original mutation and it authorizes no new execution.

Fixed task:

> Open Acme and change its status from NEW to REVIEWED.

Recorded command sequence:

`OPEN_CRM → OPEN_ACCOUNT → SELECT_STATUS → SAVE_STATUS → DONE`

Required state result:

- Acme: `NEW → REVIEWED`
- Globex: unchanged (`REVIEWED`)
- Initech: unchanged (`NEW`)
- Independent read-back occurs after the recorded terminal event and before the source verdict is accepted

The evidence surface keeps Declared, Observed, Verified, and Unresolved separate.

## Source provenance

- Source repository: `VaultSovereign/wops-computer`
- Exact source commit: `e7c8d1a354d44b9c0df3a2144c90b52dc66364e7`
- Workflow ID: `integration-acme-review`
- Workflow/engine version: `0.3.0`
- Engine public metadata: `bounded-computer@0.3.0`
- Source run ID: `2026-08-27T04-45-09-827Z_506c1f1e`
- Source artifact directory: `receipts/computer/2026-08-27T04-45-09-827Z_506c1f1e/`
- Source test result: `73 pass / 0 fail`
- Source verification: fresh before/after CRM API snapshots compared with the task contract, server save telemetry, and deterministic executor trace; planner claims and browser DOM were not trusted as application-state evidence

Reproduction command from the source repository:

```sh
printf '%s\n' '{"taskId":"integration-acme-review","instruction":"Open Acme and change its status from NEW to REVIEWED.","target":{"kind":"deskbot-local-crm"},"mode":"mutation","maxSteps":12}' | npm run --silent computer:run
```

The source run used a local planner behind a fixed task catalogue and deterministic authorization/execution boundary. The public website performs no planning, model call, CRM request, or new action; it bundles only the bounded recorded specimen.

Source artifact SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| `actions.jsonl` | `c9411871eee961f368807ce964b05437b07535fe707cf266e5fd14b1a67bac80` |
| `before-state.json` | `b520ffd0c14ef3eeb7c6508c6d94ff65573dab576b549e336103b9904e13efb9` |
| `after-state.json` | `0696b7154c2e881fc19f9c4a04561b6b919f560bf6ef55acb7722be7b7c8134e` |
| `verification.json` | `e31a01f23e03be078f88d52af03efb8c1bc5e4170661134f2539e3eb4d9e81bf` |
| `result.json` | `7f565666db4bf01ea869e3e02ad82049c4dfe3ad7865ea8aca5f9600d7731caa` |
| `task.json` | `4f697eee43d4de982ef4939ee536a8963ac057a3eb0ed7fb9f789f5f578edc03` |

Published website specimen:

- Schema: `witnessops.demo-specimen.v1`
- Path: `/samples/witnessed-crm-status-change/v1/specimen.json`
- SHA-256: `f015aca60433d6839f59beae6a1817781c5753c73e6d43a8850a3c27b482f6cb`

## Receipt contract

- Schema: `witnessops.demo-receipt.v1`
- Format: JSON UTF-8
- `signed: false`
- `noNewExecution: true`
- Replay consent authorizes neither execution nor mutation
- No self-referential receipt hash is embedded
- The displayed digest is SHA-256 of the exact string used to construct the download Blob
- “Verify generated receipt bytes” hashes those prepared bytes; it does not read the saved disk file
- Browser acceptance separately downloads the file and reproduces the displayed digest with `sha256sum`

Digest limitation:

> The digest lets you confirm that the downloaded receipt has not changed relative to this published specimen. It does not authenticate the publisher or prove the underlying event independently.

## Known unknowns and release boundary

- The final WitnessOps feature SHA is unknown until the review branch is committed and, in a later authorized phase, merged.
- Production behavior is unknown until a separate deployment authorization and live acceptance run.
- This port makes no production-ready, certified, safe, externally verified, or signed-receipt claim.
- This implementation does not merge, deploy, announce the surface, change DNS, or change infrastructure.
