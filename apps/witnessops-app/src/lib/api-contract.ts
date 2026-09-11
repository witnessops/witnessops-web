import type { HttpMethod } from "../../../witnessops-web/src/lib/server/api-contract";
/** Local-only endpoints; no production customer API or identity is established. */
export const DECLARED_APP_ENDPOINTS: ReadonlyArray<{ path: string; methods: readonly HttpMethod[]; summary: string }> = [
  { path: "/api/session", methods: ["POST", "DELETE"], summary: "Create or clear an explicit local development session" },
  { path: "/api/workspace", methods: ["GET"], summary: "Read only this session's assets and immutable source runs" },
  { path: "/api/assets", methods: ["POST"], summary: "Normalize and add one hostname to the local workspace" },
  { path: "/api/runs", methods: ["POST"], summary: "Authorize and execute the fixed bounded hostname method for a session-owned asset" },
];
