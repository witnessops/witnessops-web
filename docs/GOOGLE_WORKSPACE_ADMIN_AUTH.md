# Admin authentication boundary

Status: `PUBLIC_BOUNDARY_ONLY`

The WitnessOps Admin Console uses Google Workspace sign-in for authorized operators. Authentication is separate from application authorization, and Workspace membership alone does not grant operator access.

Public security boundary:

- Admin authentication is identity-provider based; legacy authentication paths are not part of the active production sign-in surface.
- Server-side client credentials, signing/session secrets, allowlists, credential files, and exact operator configuration belong in restricted runtime/operator custody.
- Real credential values must not be committed to Git, browser-visible configuration, fixtures, screenshots, logs, or public receipts.
- Admin authentication does not grant Gmail, Admin SDK, domain-wide delegation, or other Google privileges merely by existing.
- A successful mocked or local authentication test is not proof that a production identity-provider round trip succeeded.
- Authentication configuration changes and credential rotation are separately authorized operations, not incidental web deployments.

Detailed identity-provider configuration, callback validation, Gmail reconciliation credential handling, operator test steps, and rollback procedure are maintained in restricted operator custody.
