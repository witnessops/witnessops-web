# Ask WitnessOps authority set

`@witnessops/ask-authority` holds the promoted Ask WitnessOps V1 authority artifacts, their derived runtime projection, and deterministic validation tools.

## Boundary

This is a non-runtime, dependency-free, private workspace package. `private: true` prevents package publication; it does not make files private inside the public repository.

The package intentionally has:

- exactly one Node-only data export: `@witnessops/ask-authority/v1/authority-set.json`;
- no root, latest, wildcard, browser, import, require, or default export fallback;
- no runtime entrypoint;
- no application dependency;
- no API, classifier, router, or frontend integration;
- no model, retrieval, receipt-issuance, or storage behavior.

Repository promotion establishes source custody only. It does not authorize application consumption or execution.

## Derived runtime projection

`runtime/v1/authority-set.json` is a deterministic, non-authoritative projection of the canonical V1 manifest and five authority layers. It is exported only through the exact Node-only subpath above and is not currently used by an application.

The projection must be regenerated from the canonical artifacts. It may not be edited independently or used to widen source authority, claims, policy, response wording, or runtime behavior.

The export does not authorize application consumption. A separate server-only loader and client-boundary review must prove that the projection remains outside browser output before any application may depend on it.

## Layout

```text
artifacts/v1/
  question-classes.v1.json
  ask-context-pack.v1.json
  claim-boundary.v1.json
  policy-rules.v1.json
  response-templates.v1.json
  ask-authority-set.v1.manifest.json
  hashes/
  schemas/
tools/
  jcs.mjs
validators/
  schema-validator.mjs
  authority-validator.mjs
  runtime-projection-validator.mjs
scripts/
  validate.mjs
  generate-runtime-projection.mjs
runtime/v1/
  authority-set.json
  hashes/authority-set.json.sha256
  schemas/authority-set.schema.json
```

Noncanonical review renders and private creation or promotion receipts are deliberately excluded.

## Validate

With Node 22 and pnpm 9.15.4 active:

```bash
pnpm --filter @witnessops/ask-authority validate
```

The validator checks strict schemas, canonical bytes, detached hashes, dependency closure, exact counts, references, exclusions, route bindings, response-template revision closure, and byte-for-byte regeneration of the derived runtime projection.

Validation does not establish answer correctness, application readiness, production readiness, security posture, or runtime activation.
