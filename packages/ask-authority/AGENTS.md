# Ask authority package instructions

## Scope

This subtree contains the promoted, non-runtime Ask WitnessOps V1 authority set.
It is a governed data and validation surface, not application behavior.

## Invariants

- Preserve canonical artifact bytes and recorded SHA-256 values exactly.
- Do not edit an approved V1 artifact in place. Use a separately governed superseding version.
- Treat `runtime/v1/authority-set.json` as a deterministic projection of the canonical artifacts, never as independently editable authority.
- Keep the runtime projection internal to this package until a separate export and application-consumption lane is approved.
- Keep `package.json` private and `exports` empty.
- Do not add a runtime entrypoint, browser bundle, application dependency, API route, classifier, router, or frontend import.
- Do not add private receipts, local paths, customer data, operational evidence, review renders, or runtime configuration.
- The validators are structure and dependency-closure checks. Their success is not a production, security, or answer-correctness claim.
- Approval of knowledge authority does not authorize execution authority.

## Validation

Use bounded Node 22 and run:

```bash
pnpm --filter @witnessops/ask-authority validate
```

Validation regenerates the runtime projection in an isolated temporary directory and requires byte-for-byte equality with the committed projection.

Application consumption requires a separate explicit authority lane.
