import type { HttpMethod } from "../../../witnessops-web/src/lib/server/api-contract";
/** Cookie-authenticated product endpoints. WorkOS authenticates; the database
 * owns active workspace membership. These are separate from the public API. */
export const DECLARED_APP_ENDPOINTS: ReadonlyArray<{ path: string; methods: readonly HttpMethod[]; summary: string }> = [
  { path: "/api/cli/server-checks", methods: ["GET", "POST"], summary: "Scoped Owner execution authority and reconciliation; local capture only" },
  { path: "/api/cli/server-check-capture", methods: ["POST"], summary: "Bounded immutable capture upload tied to an Owner execution" },
  { path: "/api/cli/login", methods: ["POST"], summary: "Create bounded app-mediated CLI login; no identity or product access granted" },
  { path: "/api/cli/poll", methods: ["POST"], summary: "One-time CLI credential redemption using a secret device credential" },
  { path: "/api/cli/authorize", methods: ["GET", "POST"], summary: "Web-authenticated explicit CLI session authorization for a current workspace" },
  { path: "/api/cli/session", methods: ["GET", "POST"], summary: "Dedicated CLI session status or revocation; no product execution" },
  { path: "/api/early-access", methods: ["GET", "POST"], summary: "Read own cohort state; an invited identity may explicitly activate. No enrollment or administration API." },
  { path: "/api/events", methods: ["POST"], summary: "Record a bounded product event for an authorized saved run; never evidence or hostname metadata" },
  { path: "/api/feedback", methods: ["GET", "POST"], summary: "Read own feedback suppression state or submit one answer/dismissal in an authorized workspace" },
  { path: "/api/workspace", methods: ["GET", "POST"], summary: "Read authorized workspace data or atomically create a workspace and Owner membership" },
  { path: "/api/assets", methods: ["GET", "POST"], summary: "Read a known asset in the authorized workspace; Owner-only bounded hostname creation" },
  { path: "/api/linux-checks", methods: ["GET", "POST"], summary: "Owner-only synthetic Local Audit import; member-scoped reverified report and original source downloads" },
  { path: "/api/runs", methods: ["GET", "POST"], summary: "Read a known immutable run in the authorized workspace; Owner-only authorized hostname execution" },
];
export const DECLARED_APP_AUTH_ROUTES = [
  { path: "/cli/login", methods: ["GET"], summary: "AuthKit login with fixed CLI confirmation return path" },
  { path: "/login", methods: ["GET"], summary: "Begin hosted AuthKit sign-in with fixed return target" },
  { path: "/callback", methods: ["GET"], summary: "AuthKit PKCE/state-validated authorization callback" },
] as const;

/** Framework-managed, same-origin POST server action; no independent API route. */
export const DECLARED_APP_ACTIONS = [{ name: "logout", summary: "AuthKit session termination; fixed configured return origin" }] as const;
