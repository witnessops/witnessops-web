# Admin Console surface boundary

Status: `PUBLIC_BOUNDARY_ONLY`

`witnessops-web` contains an authenticated operator Admin Console and related application routes. The public repository source remains reviewable, but this document intentionally does not provide a curated map of operator routes, mutation endpoints, command names, or lifecycle actions.

Public boundary:

- Admin surfaces require authenticated operator access according to the application authentication/authorization contract.
- Public intake, claimant, and verification surfaces remain distinct from authenticated operator authority.
- The existence of a route in source is not evidence that an operator action was authorized or executed.
- Operator mutations should remain auditable through the application’s event/evidence mechanisms rather than being inferred from UI state.
- Detailed operator route/action inventory and reconciliation notes are maintained in restricted operator custody.

Changes to Admin semantics, authentication, lifecycle authority, or claimant boundaries require their normal tests and explicit review; reducing this public inventory does not change application behavior.
