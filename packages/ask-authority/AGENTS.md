# Ask authority package instructions

## Scope

This subtree contains the promoted, non-runtime Ask WitnessOps V1 authority set.
It is a governed data and validation surface, not application behavior.

## Invariants

- Preserve canonical artifact bytes and recorded SHA-256 values exactly.
- Do not edit an approved V1 artifact in place. Use a separately governed superseding version.
- Treat `runtime/v1/authority-set.json` as a deterministic projection of the canonical artifacts, never as independently editable authority.
- Keep the runtime projection export limited to the exact Node-only subpath `@witnessops/ask-authority/v1/authority-set.json`.
- Do not add a root, latest, wildcard, browser, import, require, or default export fallback.
- Keep `package.json` private and preserve exactly the one approved Node-only export.
- Admit exactly one `@witnessops/ask-authority: workspace:*` dependency in `apps/witnessops-web` and exactly one production projection importer at `apps/witnessops-web/src/lib/server/ask-witnessops/authority-loader.ts`.
- Require the approved loader to begin with `import "server-only";` and expose only its eight governed synchronous query functions.
- Do not add any other package or loader importer, direct internal path, raw collection interface, runtime consumer, API route, classifier, policy executor, middleware, or frontend import.
- Keep the standalone positive and negative build probe mandatory; static validation alone does not prove browser-bundle exclusion.
- Do not add a runtime entrypoint or browser bundle.
- Do not add private receipts, local paths, customer data, operational evidence, review renders, or runtime configuration.
- The validators are structure and dependency-closure checks. Their success is not a production, security, or answer-correctness claim.
- Approval of knowledge authority does not authorize execution authority.

## Validation

Use bounded Node 22 and run:

```bash
pnpm --filter @witnessops/ask-authority validate
```

Validation regenerates the runtime projection in an isolated temporary directory and requires byte-for-byte equality with the committed projection.

Any consumer of the approved server-only loader requires a separate explicit authority lane.
