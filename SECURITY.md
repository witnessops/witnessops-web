# Security Policy

We take security issues in this repository seriously. This document describes
what is in scope, how to report a suspected vulnerability, and what to expect
from us in return.

## Scope

This repository contains the public web surface for WitnessOps:

- The Next.js application under `apps/witnessops-web`
- The `/verify` route
- The `/api/verify` route
- Public buyer, review, docs, support, pricing, library, legal, and security pages
- Public sample-case pages, including the AI Agent Action Proof Run sample surface
- Web-side sample artifact contracts and buyer-path smoke tests

It does **not** contain the WitnessOps control plane or any backend service.
Reports against systems outside this repository are out of scope here and
should be directed to the appropriate project or vendor.

## Supported surface

Only the current `main` branch of this repository is supported and receives
security fixes. Older branches, tags, and historical releases are not patched.

## Proof-surface reporting boundary

Reports about the public verifier, public sample pages, pinned artifact links,
claim-boundary text, route behavior, or buyer-path smoke coverage are in scope
for this repository when they affect this web surface.

This repository records and displays pinned external sample manifest provenance,
but it does not run the customer workflow, issue or sign receipts, operate the
control plane, or independently recompute external sample artifact bytes as part
of normal public verification. Reports that require control-plane evidence,
production customer evidence, signing-key custody, or source-system truth should
be routed to the owning repository or operational process.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through one of the following
channels:

- **Preferred:** GitHub Private Vulnerability Reporting —
  <https://github.com/witnessops/witnessops-web/security/advisories/new>
- **Alternative:** email <security@witnessops.com>

When reporting, please include:

- A description of the issue and its potential impact
- Steps to reproduce, or a proof of concept
- The affected route, file, or component if known
- Any relevant version, commit SHA, or environment details

> **Do not use public GitHub issues, discussions, or pull requests to report
> suspected vulnerabilities.** Public reports can put users at risk before a
> fix is available.

## Acknowledgment window

We will acknowledge receipt of your report within **5 business days**. That
acknowledgment confirms the report reached us; a full triage and impact
assessment will follow.

## Disclosure handling

We prefer **coordinated disclosure**:

- We will work with you to validate the issue, assess impact, and prepare a
  fix.
- We ask for a reasonable embargo period while a fix is being prepared and
  rolled out. The exact length depends on severity and complexity, and we will
  agree it with you.
- Once a fix is available, we will publish an advisory describing the issue
  and its resolution.
- Reporters will be credited in the advisory unless they ask to remain
  anonymous.

## Out of scope

The following are generally **not** considered reportable vulnerabilities for
this repository:

- Missing rate limiting on public marketing or informational routes
- Missing best-practice security headers without a demonstrated security
  impact
- Social-engineering attacks targeting maintainers or operators
- Denial-of-service via volumetric traffic flooding
- Vulnerabilities in third-party dependencies that are already tracked by
  Dependabot or an equivalent automated advisory feed
- Claims that a sample artifact proves production deployment, legal compliance,
  source-system truth, or complete AI governance when the page explicitly labels
  the sample boundary

If you believe one of the above has a concrete, demonstrable security impact
in this repository, please still report it through the private channels above
and explain the impact.
