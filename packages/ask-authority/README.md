# Ask WitnessOps authority set

`@witnessops/ask-authority` holds the promoted Ask WitnessOps V1 authority artifacts and their deterministic validation tools.

## Boundary

This is a non-runtime, dependency-free, private workspace package. `private: true` prevents package publication; it does not make files private inside the public repository.

The package intentionally has:

- no exports;
- no runtime entrypoint;
- no application dependency;
- no API, classifier, router, or frontend integration;
- no model, retrieval, receipt-issuance, or storage behavior.

Repository promotion establishes source custody only. It does not authorize application consumption or execution.

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
scripts/
  validate.mjs
```

Noncanonical review renders and private creation or promotion receipts are deliberately excluded.

## Validate

With Node 22 and pnpm 9.15.4 active:

```bash
pnpm --filter @witnessops/ask-authority validate
```

The validator checks strict schemas, canonical bytes, detached hashes, dependency closure, exact counts, references, exclusions, route bindings, and response-template revision closure.

Validation does not establish answer correctness, application readiness, production readiness, security posture, or runtime activation.
