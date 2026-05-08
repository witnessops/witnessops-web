# Docs Assistant Corpus Manifest Runbook

## Status

This runbook governs the seed-only corpus manifest and deterministic local eval stub for the future WitnessOps Docs Assistant.

Current lane status is seed-only. No corpus has been collected, generated, uploaded, indexed, or attached to a runtime.

## Authority boundary

The source manifest seed is an authority inventory only. It records which public sources may be considered in a later collection lane.

It does not prove:

- source freshness
- source custody
- source hash correctness
- answer correctness
- assistant safety
- production readiness
- artifact verification
- proof-bundle verification
- security posture
- compliance correctness
- source-system truth

`witnessops-contracts` remains the schema authority for durable Docs Assistant answer, source-manifest, and eval-result schemas. The TypeScript files in `witnessops-web` are local runtime-adjacent shapes only.

## Seed source policy

The seed manifest may include only:

- public WitnessOps docs or public WitnessOps pages approved for future Docs Assistant answers
- named approved public repository docs

The seed manifest must exclude:

- customer data
- CRM or mailbox data
- internal receipts
- Azure or runtime logs
- secrets
- old positioning files
- unreviewed drafts
- private workflow details
- tokens
- emails
- customer names

## Seed-only collection rule

Every seed entry remains uncollected until a later explicit collection lane.

Required seed-only fields:

- `hash_status: "not_collected"`
- `sha256: null`
- `commit_sha: null`
- `crawl_timestamp: null`

Do not fabricate hashes, commit anchors, or crawl timestamps. A source is not fresh or hash-bound merely because it appears in the seed manifest.

## Local eval stub boundary

The local eval stub is deterministic and structural only. It validates fixture shape and expected boundaries. It does not answer questions.

The local eval stub must not:

- call a model
- retrieve sources
- fetch external content
- crawl public pages
- upload files
- create or use a vector store
- use an OpenAI SDK or API key
- change `/docs/assistant`
- change `/api/docs-assistant/ask`
- enable public assistant behavior

Supported-style eval fixtures may be marked `not_executable_until_corpus_collected`. That status is a future-work marker, not evidence that an answer is currently supported.

Unsupported and boundary eval fixtures should fail closed with `cannot_claim` expectations.

## Future lane separation

Future work should remain separated into explicit lanes:

1. deterministic corpus builder, still no upload
2. key custody and platform setup, still no public enablement
3. vector-store upload with receipt, still no public enablement
4. staging retrieval integration behind an internal or disabled gate
5. public release decision

Do not combine source authority, collection, upload, runtime behavior, and public enablement in one lane.

## Closure meaning

The closure phrase for this lane is:

`docs_assistant_corpus_manifest_and_local_eval_stub_green_no_upload_no_model_no_secret_no_public_enablement`

If green, it means only:

- approved source seed exists
- excluded source classes are blocked
- local eval fixture shape exists
- local eval runner has no model, network, or upload path
- disabled page/API behavior remains unchanged
- no secret, runtime, or public enablement was added

It does not mean:

- corpus collected
- sources fresh
- vector store created
- retrieval configured
- assistant answers correct
- assistant safe
- assistant production-ready
- proof bundles verified
- artifacts verified
- security posture verified
- compliance verified
- public release approved
