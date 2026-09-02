# WitnessOps edge-change boundary

Status: `PUBLIC_BOUNDARY_ONLY`

Caddy/edge configuration is a separate production authority lane. This public repository does not publish the operator host commands, backup paths, reload procedure, log-inspection procedure, or rollback command sequence used for production edge changes.

Public contract:

- Preserve canonical HTTPS host behavior and documented public-route semantics.
- Validate a complete candidate edge configuration before applying it.
- Do not modify unrelated sites or directives as part of a WitnessOps-only edge change.
- Preserve path and query semantics for canonical redirects.
- Treat DNS/TLS/edge mutation as separately authorized from ordinary web content deployment.
- A source-controlled Caddy fragment is not proof that the live edge uses those exact bytes.

Detailed pre-change evidence, host backup/reload commands, acceptance matrix, and immediate rollback procedure are maintained in restricted operator custody.
