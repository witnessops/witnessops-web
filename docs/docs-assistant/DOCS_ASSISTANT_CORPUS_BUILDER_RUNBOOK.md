# Docs Assistant Deterministic Corpus Builder Runbook

## Status

This lane adds a deterministic local corpus-plan builder only.

It does not collect source content, crawl pages, fetch external content, upload artifacts, call a model, create a vector store, add runtime secrets, change route behavior, enable `/docs/assistant`, or make a public assistant claim.

## Inputs

The builder consumes only the existing seed manifest:

```text
apps/witnessops-web/src/lib/docs-assistant/fixtures/source-manifest.seed.json
```

The seed manifest remains the authority inventory for this lane. It is not evidence that source content has been collected, hashed, refreshed, or approved for runtime retrieval.

## Output shape

The builder emits a deterministic `docs-assistant.corpus-plan.v1` object.

Each source record remains:

```text
collection_status: not_collected
content_body: null
content_sha256: null
source_sha256: null
```

The corpus plan contains no upload receipt and no vector-store identifier. It may be written only to a caller-supplied temporary or ignored directory as:

```text
CORPUS_PLAN.json
MANIFEST.sha256
```

Do not commit generated corpus output in this lane.

## Determinism rules

The builder must:

- validate the seed manifest before building a plan
- refuse disallowed source classes
- refuse non-public classifications
- refuse fake hash or freshness fields
- refuse any `hash_status` other than `not_collected`
- sort source records by source reference
- emit stable JSON with sorted object keys
- avoid timestamps and machine-local paths in committed fixtures

## Boundary checks

This lane must not add:

- OpenAI SDK usage
- API key usage
- environment variables
- Responses API calls
- vector stores
- source upload behavior
- external fetch or crawl behavior
- model calls
- source collection
- route behavior changes
- UI enablement
- nav or sitemap changes
- deployment wiring
- public assistant claims

## Relationship to disabled web skeleton

The disabled `/docs/assistant` page and fail-closed `/api/docs-assistant/ask` route must remain unchanged.

The corpus builder is not reachable from the public route or API route in this lane.

## Closure phrase

```text
docs_assistant_deterministic_corpus_builder_green_no_upload_no_model_no_secret_no_public_enablement
```

## Closure meaning

If green, this lane means only:

- deterministic local corpus builder exists
- builder consumes the approved seed manifest
- builder emits a local corpus plan only
- no source collection was performed
- no upload was performed
- no model-call path was added
- no runtime secret was added
- no public enablement was added

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
