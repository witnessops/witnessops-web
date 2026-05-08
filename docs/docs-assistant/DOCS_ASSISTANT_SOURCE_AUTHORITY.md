# WitnessOps Docs Assistant Source Authority

## Scope of allowed sources

The docs assistant is limited to sources included in this authority list.

Allowed source classes:

- Public WitnessOps docs and pages under `witnessops.com` documentation surfaces.
- Named approved public repository documentation under `witnessops-web`.
- Optional approved sample-case docs and verifier docs when explicitly approved for this lane.

## Exclusions

The following are excluded by default:

- Private customer data or any customer identifiers.
- CRM records and CRM-facing metadata.
- Mailbox data, mailbox headers, and mailbox content.
- Internal operator receipts and non-public evidence stores.
- Azure/runtime logs and execution logs.
- Secrets, API keys, tokens, and private credentials.
- Old positioning files and unreviewed drafts.
- Private workflow details and internal operating procedures.
- Email content, sender/recipient names, and private support threads.

## Authority clarification

Inclusion in this list is an authority decision for retrieval boundaries only.
Inclusion does not make any source truthful, current, complete, or equivalent to verifier authority.

## Boundary reminder

The assistant must cite the selected source path for every claim.
The assistant cannot use excluded material to answer user questions.
