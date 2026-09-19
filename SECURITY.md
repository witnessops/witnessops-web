# Security Policy

We take security issues in this repository seriously. This document describes
what is in scope, how to report a suspected vulnerability, and what to expect
from us in return.

## Scope

This repository contains source for the following WitnessOps surfaces:

- The Next.js application under `apps/witnessops-web`
- The `/verify` route
- The `/api/verify` route
- Public buyer, review, docs, support, pricing, library, legal, and security pages
- Public sample-case pages, including the AI Agent Action Proof Run sample surface
- Web-side sample artifact contracts and buyer-path smoke tests
- The authenticated app under `apps/witnessops-app`: WorkOS signup/session
  integration, workspaces, Owner/Contributor/Viewer membership, authorized
  hostname checks, Linux imports, saved evidence, reports and recipient sharing
- Workspace sandbox Checkout/Portal and seat-entitlement reconciliation
- CLI source under `packages/wops-cli`, app-mediated CLI authorization and the
  separately scoped server-check capture/finalization implementation
- Shared packages and repository build/test tooling supporting these surfaces

These are source-scope statements, not claims that each feature is enabled or
accepted in production. They do not authorize testing a deployed target,
collecting customer data, sending email or activating live billing.

Separate private control-plane, mesh and OffSec systems are not brought into
scope merely because this repository references them. Reports about defects in
systems outside this repository should be directed to their owning project or
vendor. Defects in this repository's authentication, workspace isolation,
evidence handling, recipient access or billing integration remain in scope.

## Supported surface

Only the current `main` branch of this repository is supported and receives
security fixes. Older branches, tags, and historical releases are not patched.

## Proof-surface reporting boundary

Reports about the public verifier, public sample pages, pinned artifact links,
claim-boundary text, route behavior, or buyer-path smoke coverage are in scope
for this repository when they affect this web surface.

The public `/verify` and `/api/verify` paths are receipt-only. Normal receipt
verification does not accept proof-bundle uploads or caller-supplied trust inputs,
run customer workflows, issue or sign production receipts, or persist customer
evidence. Public samples are examples unless a specific sample verification path
states its mechanism and scope; they do not establish source-system truth or
production signing-key custody.

That boundary is distinct from the authenticated app's authorized imports,
persisted evidence, report sharing and separately scoped server-check/finalization
paths. Security reports about those implementations are in scope here; their
existence does not widen the public receipt verifier. Reports requiring private
operational evidence must use the agreed handling process rather than publishing
that evidence in this repository.

## Identifier and secret exposure reports

Reports about exposed secrets, private environment files, customer data,
private operator receipts, non-public infrastructure topology, private hostnames,
or unintended personal or company identifiers are in scope when they affect this
repository or its public artifacts.

Please make the first report non-secret. Do not include raw secrets,
credentials, private keys, bearer tokens, MFA codes, customer data, raw logs,
screenshots, full evidence bundles, private mesh topology, raw DNS/provider
exports, or private operational receipts. Send the affected path, the class of
exposure, and enough redacted context for us to locate the issue without
reproducing sensitive data. Raw evidence or customer data should only be shared
after scope and handling are agreed.

Maintainers must keep production secrets, local `.env` files, private evidence
bundles, internal operator receipts, raw DNS/provider exports, and private mesh
topology out of this public repository. Internal leak indexes and redaction
receipts should remain in private operational storage unless a sanitized summary
is explicitly approved for publication.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through one of the following
channels:

- **Primary:** email <security@witnessops.com>
- **Secondary:** GitHub Private Vulnerability Reporting, if available for this
  repository —
  <https://github.com/witnessops/witnessops-web/security/advisories/new>

Do not send passwords, private keys, API keys, recovery codes, session tokens, or other secrets.

When reporting, please include:

- A description of the issue and its potential impact
- Redacted steps to reproduce, or a non-secret proof of concept
- The affected route, file, or component if known
- Any relevant version, commit SHA, or environment details

> **Do not use public GitHub issues, discussions, or pull requests to report
> suspected vulnerabilities.** Public reports can put users at risk before a
> fix is available.

## Acknowledgment window

WitnessOps aims to acknowledge security reports within **72 hours**. That
acknowledgment confirms the report reached us; a full triage and impact
assessment may take longer.

## Disclosure handling

We prefer **coordinated disclosure**:

- We aim to work with you to validate the issue, assess impact, and prepare a
  fix.
- We ask for a reasonable embargo period while a fix is being prepared and
  rolled out. The exact length depends on severity and complexity, and we will
  agree it with you.
- We may publish an advisory when appropriate.
- We may credit reporters when appropriate and permitted.

## Bounty and reward boundary

No bounty, reward, or compensation is implied unless a separate WitnessOps
bounty program is explicitly announced.

## Out of scope

The following are generally **not** considered reportable vulnerabilities for
this repository:

- Missing rate limiting on public marketing or informational routes
- Missing best-practice security headers without a demonstrated security
  impact
- Social-engineering attacks targeting maintainers or operators
- Denial-of-service via volumetric traffic flooding
- Destructive testing, physical attacks, credential stuffing, spam, or automated
  abuse
- Reports about private infrastructure, private mesh, internal receipts,
  customer evidence, or non-public control planes, unless the issue affects an
  implementation in this repository (including its evidence handling and access
  controls) or accidental exposure through this repository or its public artifacts
- Vulnerabilities in third-party dependencies that are already tracked by
  Dependabot or an equivalent automated advisory feed
- Claims that a sample artifact proves production deployment, legal compliance,
  source-system truth, or complete AI governance when the page explicitly labels
  the sample boundary

If you believe one of the above has a concrete, demonstrable security impact
in this repository, please still report it through the private channels above
and explain the impact.
