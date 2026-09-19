# WitnessOps Web and App

Source for the WitnessOps public website, authenticated product app, CLI and
shared packages. Source presence, passing tests and a merge are not evidence
that a feature is enabled or accepted in production.

## Repository map

| Source | Role and starting point |
| --- | --- |
| [`apps/witnessops-web/`](./apps/witnessops-web/) | Public website, receipt-only `/verify` and `/api/verify`, buyer/docs/support pages, samples and public MCP. Read its [subtree instructions](./apps/witnessops-web/AGENTS.md). |
| [`apps/witnessops-app/`](./apps/witnessops-app/README.md) | Authenticated accounts/workspaces, team membership, saved checks/imports, reports, sharing, Help and opt-in sandbox seat billing. Its README covers setup, limits and acceptance. |
| [`packages/wops-cli/`](./packages/wops-cli/) | CLI source and app-mediated authorization. Package presence is not an npm distribution or collection-authority claim. |
| [`packages/`](./packages/) | Shared proof, content, catalogue, configuration and UI packages; their individual contracts still apply. |
| [`content/witnessops/docs/`](./content/witnessops/docs/) and [`docs/`](./docs/README.md) | Public site documentation and repository-local maintenance/decision records, respectively. |
| [`deploy/app/`](./deploy/app/) | App-specific build/lifecycle source, distinct from public-website release commands. No deployment authority is granted by this map. |

The app's [API contract](./apps/witnessops-app/src/lib/api-contract.ts) identifies
its workspace, recipient and provider-callback boundaries. Configured free signup
can create a workspace without a card; membership and explicit collection
permissions remain separate. Sandbox subscriptions control seat capacity, not
comparison, Share, Linux imports or export access. No live pricing is activated
by this source description.

## Public website functionality

- Shows the public WitnessOps pages.
- Lets anyone check receipt JSON through `/verify`.
- Exposes the same receipt-only verification path through `/api/verify` for programmatic use.
- Exposes public WitnessOps documentation and bounded guidance to ChatGPT and
  other MCP clients through the stateless Streamable HTTP `/mcp` endpoint.
- Returns deterministic verification results for the same receipt input.
- Provides buyer-facing proof-run, sample-case, docs, support, pricing, library, and legal/security surfaces.
- Presents the AI Agent Action Proof Run sample with pinned artifact links, manifest provenance, visible artifact digests, and buyer-path smoke coverage.

## Separate surface boundaries

- Public `/verify` and `/api/verify` remain receipt-only. They do not issue or sign customer or production receipts/proof bundles, execute customer workflows or store customer evidence as part of normal receipt verification.
- The authenticated app has separate authorized import, storage, report-sharing and server-check/finalization paths. Read the [app contract](./apps/witnessops-app/README.md) and [finalizer contract](./deploy/app/FINALIZER_RUNTIME.md); these paths do not widen the receipt-only endpoints or authorize arbitrary workflows.
- A CI canary workflow emits and keyless-signs a public-manifest diff to test repository release evidence. That is not customer proof issuance or production acceptance.
- Public samples and their source relationships do not establish production deployment, legal compliance, source-system truth or complete AI governance coverage.
- Separate private control-plane and mesh systems are not made part of this repository by documentation references.
- Public positioning category (working): bounded independent verification of consequential AI and security work—one activity reconstructed (authorized, executed, observed, unresolved); not a whole-environment or GRC replacement.
- Retired cloud deployment material is not active authority.

## Product governance

All user-facing workflows follow the
[Usability-First Invisible-Proof Principle](./docs/product-decisions/WITNESSOPS_USABILITY_FIRST_INVISIBLE_PROOF_PRINCIPLE_V1.md):
**Easy in the foreground. Reconstructable in the background.** The linked
decision record is the canonical authority for this product rule.

## Deployment boundary

This public repository intentionally states only the deployment boundary needed
for contributors and buyers:

- merge does **not** itself authorize or perform a production deployment;
- production publication and deployment require a separate, explicit operator action;
- deployment credentials, host identity, topology, rollback details, and operator procedures are not part of the public product documentation contract;
- archived deployment material is historical reference only and is not rollback or production authority.

Do not infer production state from repository prose alone. A production claim
requires separately captured deployment/runtime evidence for the exact release.

## Verify a receipt

Open <https://witnessops.com/verify>, upload a supported receipt `.json` or paste
the JSON, and read the result. The current example is `indeterminate`: the
receipt-only checks run, but required artifact bytes are not independently
checked. Receipts using the legacy-named `public_exposure_review` profile also remain `indeterminate` while the
full evidence, workflow, signature, and production trust checks are incomplete.

Programmatic callers can post the same receipt to `/api/verify` and receive the
same verification path and result shape. Proof-bundle uploads and caller-supplied
trust inputs are not accepted by these receipt-only endpoints. Supported Linux
Proofpack imports and saved-source verification belong to the separate
authenticated app; see its [README](./apps/witnessops-app/README.md).

## Public ChatGPT / MCP integration

The public MCP endpoint is designed to be `https://witnessops.com/mcp`; this is
not the authenticated workspace app.
It exposes three public, read-only tools:

- `search` — find public WitnessOps documentation.
- `fetch` — retrieve a selected document with its canonical citation URL.
- `ask_witnessops` — return bounded deterministic guidance without claiming
  that a private system, customer evidence, or receipt was verified.

Run locally with `pnpm dev`, then connect MCP Inspector to
`http://127.0.0.1:3001/mcp`. Production exposure and ChatGPT app connection
remain separate explicit apply steps.

## Public proof-surface contract

The AI Agent Action Proof Run sample lives at:

```text
apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/
```

The local web-side artifact contract is:

```text
sample-artifact-contract.ts
```

That contract records the pinned external sample identity, manifest provenance,
artifact names, artifact URLs, displayed digests, and displayed-vs-manifest-hashed
artifact relationship. The page and source tests should read from that contract
rather than duplicating commits, digests, or sample URLs.

Current boundary: this repository records and displays pinned external manifest
provenance for the sample, but a separate cross-repo verification lane is needed
before claiming that `witnessops-web` independently recomputes the external
sample artifact bytes.

## Security

For vulnerability disclosure, see [`SECURITY.md`](./SECURITY.md).

## Contributors

- Local validation: `pnpm health` (build, lint, typecheck, tests, route parity, receipt smoke, buyer-path smoke). Browser installation is not required by this health command.
- Separate A4 PDF pagination gate: install Chromium with `pnpm exec playwright install chromium --with-deps`, then run `pnpm build && pnpm test:pdf-pagination`. The dedicated **PDF Pagination Gate** CI workflow builds the app and runs the same four fixture-based cases. Playwright starts the built app on loopback port 3019, refuses an already-running server, and stops its server after success or failure. No public hostname collection is performed. This browser gate is separate from `pnpm health`.
- App database and Chromium/WebKit browser suites are separate from `pnpm health`; use the explicit commands and prerequisites in the [app README](./apps/witnessops-app/README.md). Provider-backed and deployment acceptance remain separate.
- Public buyer/proof-surface validation: `pnpm smoke:buyer-path:test`.
- Frozen command contract: [`commands.md`](./commands.md).
- Repository-local docs index: [`docs/README.md`](./docs/README.md).
- Root/subtree authority-file inventory and stale-file deletion gate: [`docs/ROOT_SURFACE_INVENTORY.md`](./docs/ROOT_SURFACE_INVENTORY.md).
- Agent instructions: [`AGENTS.md`](./AGENTS.md) and [`apps/witnessops-web/AGENTS.md`](./apps/witnessops-web/AGENTS.md).
