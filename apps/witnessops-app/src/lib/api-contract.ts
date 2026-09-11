import type { HttpMethod } from "../../../witnessops-web/src/lib/server/api-contract";
/** Cookie-authenticated product endpoints. WorkOS authenticates; the database
 * owns active workspace membership. These are separate from the public API. */
export const DECLARED_APP_ENDPOINTS: ReadonlyArray<{ path: string; methods: readonly HttpMethod[]; summary: string }> = [
  { path: "/api/early-access", methods: ["GET", "POST"], summary: "Read own cohort state; an invited identity may explicitly activate. No enrollment or administration API." },
  { path: "/api/events", methods: ["POST"], summary: "Record a bounded product event for an authorized saved run; never evidence or hostname metadata" },
  { path: "/api/feedback", methods: ["GET", "POST"], summary: "Read own feedback suppression state or submit one answer/dismissal in an authorized workspace" },
  { path: "/api/workspace", methods: ["GET", "POST"], summary: "Read authorized workspace data or atomically create a workspace and Owner membership" },
  { path: "/api/assets", methods: ["GET", "POST"], summary: "Read a known asset in the authorized workspace; Owner-only bounded hostname creation" },
  { path: "/api/runs", methods: ["GET", "POST"], summary: "Read a known immutable run in the authorized workspace; Owner-only authorized hostname execution" },
];
export const DECLARED_APP_AUTH_ROUTES = [
  { path: "/login", methods: ["GET"], summary: "Begin hosted AuthKit sign-in with fixed return target" },
  { path: "/callback", methods: ["GET"], summary: "AuthKit PKCE/state-validated authorization callback" },
] as const;

/** Framework-managed, same-origin POST server action; no independent API route. */
export const DECLARED_APP_ACTIONS = [{ name: "logout", summary: "AuthKit session termination; fixed configured return origin" }] as const;
