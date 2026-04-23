/**
 * Declarative HTTP-route contract for witnessops-web (WEB-008).
 *
 * This file is the single source of truth for which Next.js API route
 * files exist in `apps/witnessops-web/src/app/api/`. Every committed
 * `route.ts` MUST have a matching entry here, and every entry here
 * MUST have a matching file on disk. Drift in either direction is
 * caught at test time by `api-contract.test.ts`.
 *
 * The point is to close the same class of silent route/contract drift
 * that the control-plane parity test (`test_phase7_openapi_parity.py`)
 * already catches there. The witnessops-web side previously had no
 * such guard, so every new route added since WEB-003 went in without
 * any structural check that someone could find it.
 *
 * Why a TypeScript module instead of OpenAPI YAML/JSON:
 *  - The lane scope explicitly forbade a full OpenAPI rollout unless
 *    the audit proved it was required. The audit did not.
 *  - Every endpoint here is internal-to-witnessops; no external
 *    consumer is reading any contract today.
 *  - A TS module gives type-safe declarations, zero new tooling, zero
 *    generator step, and the parity test reads it directly.
 *  - A future explicit lane that wants OpenAPI can transcribe from
 *    this declarative source easily.
 *
 * Editing rules:
 *  - When you add a new `route.ts` file under `app/api/`, add a
 *    matching entry here in the same PR. The parity test will fail
 *    at CI time if you forget.
 *  - When you delete a `route.ts` file, remove its entry here in
 *    the same PR. Same reason.
 *  - The `note` field is for human observations that the parity
 *    test does not act on (e.g. flagging two endpoints that look
 *    like a co-existing legacy/canonical pair). Notes never affect
 *    test behavior.
 */

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type EndpointCategory =
  | "public-claimant"
  | "public-utility"
  | "operator"
  | "provider-webhook";

export interface DeclaredEndpoint {
  /**
   * Canonical URL path with `[param]` segments preserved verbatim
   * from the filesystem layout.
   */
  path: string;
  /**
   * The HTTP verbs that the underlying `route.ts` exports as
   * top-level handler functions.
   */
  methods: ReadonlyArray<HttpMethod>;
  category: EndpointCategory;
  /**
   * One-line purpose description. Required so the file doubles
   * as readable inventory.
   */
  summary: string;
  /**
   * Optional human observation. The parity test does not act on
   * this; it exists only as a discoverable signal for future
   * cleanup decisions.
   */
  note?: string;
}

export const DECLARED_API_ENDPOINTS: ReadonlyArray<DeclaredEndpoint> = [
  // -------------------------------------------------------------------------
  // public-utility
  // -------------------------------------------------------------------------
  {
    path: "/api/contact",
    methods: ["POST"],
    category: "public-utility",
    summary: "Direct review request email to engage mailbox",
    note: "Email-only public form path; does not write intake or queue state.",
  },
  {
    path: "/api/support",
    methods: ["POST"],
    category: "public-utility",
    summary: "Verified support intake submission",
    note: "Queue-backed support API retained for verified intake flows.",
  },
  {
    path: "/api/support/message",
    methods: ["POST"],
    category: "public-utility",
    summary: "Direct support request email to support mailbox",
    note: "Email-only support form path; does not write intake or queue state.",
  },
  {
    path: "/api/receipts",
    methods: ["GET"],
    category: "public-utility",
    summary: "Read receipts surface",
  },

  // -------------------------------------------------------------------------
  // public-claimant — drives the engagement loop before any operator action
  // -------------------------------------------------------------------------
  {
    path: "/api/engage",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Legacy review request intake (alias of /api/review/request)",
    note: "Co-existing with /api/review/request; canonical route is /api/review/request.",
  },
  {
    path: "/api/review/request",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Review request intake (mailbox-verified)",
  },
  {
    path: "/api/intake",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Intake submission",
    note: "Co-existing pair with /api/engage; canonical-vs-legacy decision deferred to a separate explicit lane.",
  },
  {
    path: "/api/verify",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Verify token (path A)",
    note: "Co-existing pair with /api/verify-token; canonical-vs-legacy decision deferred to a separate explicit lane.",
  },
  {
    path: "/api/verify-token",
    methods: ["POST", "GET"],
    category: "public-claimant",
    summary: "Verify token (path B); exports both POST and GET handlers",
    note: "Co-existing pair with /api/verify; both POST and GET on this path is unusual for a Next.js route handler and is flagged for the same future lane.",
  },
  {
    path: "/api/assessment/[issuanceId]",
    methods: ["GET"],
    category: "public-claimant",
    summary: "Read current assessment status for an issuance",
  },
  {
    path: "/api/assessment/[issuanceId]/approve",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Claimant approves scope and starts governed recon",
  },
  {
    path: "/api/package/[issuanceId]/disposition",
    methods: ["POST"],
    category: "public-claimant",
    summary:
      "Customer accepts or rejects the delivered proof package (WEB-014)",
  },
  {
    path: "/api/assessment/[issuanceId]/amend",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Claimant amends scope (WEB-003); non-terminal",
  },
  {
    path: "/api/assessment/[issuanceId]/retract",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Claimant retracts engagement (WEB-003); terminal until reopened",
  },
  {
    path: "/api/assessment/[issuanceId]/disagree",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Claimant disagrees with proposed scope (WEB-003); terminal until reopened",
  },
  {
    path: "/api/assessment/[issuanceId]/reopen",
    methods: ["POST"],
    category: "public-claimant",
    summary: "Claimant reopens own retract or disagree (WEB-005)",
  },

  // -------------------------------------------------------------------------
  // operator — admin session required
  // -------------------------------------------------------------------------
  {
    path: "/api/admin/auth",
    methods: ["POST"],
    category: "operator",
    summary: "Admin login",
  },
  {
    path: "/api/admin/logout",
    methods: ["POST"],
    category: "operator",
    summary: "Admin logout",
  },
  {
    path: "/api/admin/oidc/start",
    methods: ["GET"],
    category: "operator",
    summary: "Start admin OIDC sign-in with Entra",
  },
  {
    path: "/api/admin/oidc/callback",
    methods: ["GET"],
    category: "operator",
    summary: "Complete admin OIDC callback and establish session",
  },
  {
    path: "/api/admin/intake/respond",
    methods: ["POST"],
    category: "operator",
    summary: "Operator records first reply to claimant",
  },
  {
    path: "/api/admin/intake/reconcile",
    methods: ["POST"],
    category: "operator",
    summary: "Operator records manual reconciliation of an intake",
  },
  {
    path: "/api/admin/intake/reconciliation-report",
    methods: ["GET"],
    category: "operator",
    summary: "Operator-side reconciliation report read",
  },
  {
    path: "/api/admin/intake/reject",
    methods: ["POST"],
    category: "operator",
    summary: "Operator rejects an intake (WEB-004); terminal until rescinded",
  },
  {
    path: "/api/admin/intake/request-clarification",
    methods: ["POST"],
    category: "operator",
    summary: "Operator records clarification request (WEB-004); non-terminal",
  },
  {
    path: "/api/admin/intake/rescind-rejection",
    methods: ["POST"],
    category: "operator",
    summary: "Operator rescinds own rejection (WEB-005); reads original ledger event for previous_state",
  },
  {
    path: "/api/admin/queue/command",
    methods: ["POST"],
    category: "operator",
    summary: "Apply a canonical queue command via the shared executor",
  },
  {
    path: "/api/admin/queue/verify-projection",
    methods: ["POST"],
    category: "operator",
    summary: "Verify queue projection parity for a single intake",
  },
  {
    path: "/api/admin/lifecycle/[runId]/retry-request",
    methods: ["POST"],
    category: "operator",
    summary: "Operator records local retry intent against a control-plane run (WEB-002); never marks delivery as successful",
  },
  {
    path: "/api/admin/lifecycle/[runId]/authorize",
    methods: ["POST"],
    category: "operator",
    summary: "Operator authorizes or starts a handed-off control-plane run (WEB-021 / CP-005)",
  },

  // -------------------------------------------------------------------------
  // provider-webhook — external sender, not user-triggered
  // -------------------------------------------------------------------------
  {
    path: "/api/provider-events/mailbox-receipt",
    methods: ["POST"],
    category: "provider-webhook",
    summary: "Inbound mailbox receipt event from mail provider",
  },
  {
    path: "/api/provider-events/response-outcome",
    methods: ["POST"],
    category: "provider-webhook",
    summary: "Inbound response-outcome event from mail provider",
  },
];
