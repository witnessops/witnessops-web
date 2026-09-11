import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { runSnapshot } from "../../../witnessops-web/src/lib/external-exposure/runner";
import { validateExternalSnapshot } from "../../../witnessops-web/src/lib/external-exposure/adapter";
import { normalizeExternalHostname } from "../../../witnessops-web/src/lib/external-exposure/input";
import { readExternalRequestBody } from "../../../witnessops-web/src/lib/external-exposure/request";
import { RECOMMENDED_PROFILE, type Run, type Workspace, type ExternalSnapshotV1 } from "./model";

export const SESSION_COOKIE = "witnessops-app-local-session";
export const SESSION_TTL_MS = 60 * 60 * 1000;
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const MAX_SESSIONS = 8;
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function localAppEnabled(host: string | null, env = process.env): boolean {
  if (env.NODE_ENV !== "development" || env.WITNESSOPS_APP_DEV_SESSION !== "1" || !host) return false;
  try { const url = new URL(`http://${host}`); return LOOPBACK.has(url.hostname) && url.host === host && !url.username && !url.password; } catch { return false; }
}
function admit(request: Request) {
  const url = new URL(request.url), host = request.headers.get("host");
  if (!localAppEnabled(host) || !LOOPBACK.has(url.hostname) || url.protocol !== "http:" || url.port !== new URL(`http://${host}`).port) throw new ApiError(404, "Local app session is not enabled.");
  if (url.search) throw new ApiError(400, "Query parameters are not accepted.");
  if (![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))) throw new ApiError(403, "Use this local app origin.");
  if (request.method !== "GET" && request.headers.get("origin") !== `http://${host}`) throw new ApiError(403, "Use this local app origin.");
}
function token(request: Request): string {
  const value = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? "";
  return /^[a-f0-9]{64}$/.test(value) ? value : "";
}
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
function json(value: unknown, status = 200, cookie?: string) { return Response.json(value, { status, headers: { ...headers, ...(cookie ? { "Set-Cookie": cookie } : {}) } }); }
function cookie(value: string, age = SESSION_TTL_MS / 1000) { return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}`; }
async function body(request: Request, keys: string[]) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "") || request.headers.has("content-encoding")) throw new ApiError(400, "Use a small JSON object.");
  try {
    const source = await readExternalRequestBody(request);
    // Bodies consist only of the fixed fields below. Duplicate keys are rejected before parsing.
    const { findDuplicateJsonObjectKey } = await import("../../../witnessops-web/src/lib/json-ambiguity");
    if (findDuplicateJsonObjectKey(source) !== null) throw new Error();
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== [...keys].sort().join()) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new ApiError(400, "Submit only the required fields in at most 1 KiB."); }
}
function freeze<T>(value: T): T { if (value && typeof value === "object") { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }

/** No provider identity: bounded local workspace cookies, never usable in production. */
export function createFoundationService(options: { run?: (target: string) => Promise<ExternalSnapshotV1>; now?: () => number } = {}) {
  const sessions = new Map<string, Workspace>();
  const recentHosts = new Map<string, number>();
  const recentRuns: number[] = [];
  const recentSessions: number[] = [];
  const now = options.now ?? Date.now;
  const run = options.run ?? runSnapshot;
  let active = 0;
  function expire() { const t = now(); for (const [id, ws] of sessions) if (Date.parse(ws.expiresAt) <= t) sessions.delete(id); for (const [h, t0] of recentHosts) if (t - t0 >= 60_000) recentHosts.delete(h); }
  function workspace(request: Request) { expire(); const ws = sessions.get(token(request)); if (!ws) throw new ApiError(401, "Start a local workspace. Sessions expire after one hour or a server restart."); return ws; }
  async function handle(request: Request, endpoint: "session" | "workspace" | "assets" | "runs"): Promise<Response> {
    try {
      admit(request); expire();
      if (endpoint === "session" && request.method === "POST") {
        await body(request, []);
        while (recentSessions.length && now() - recentSessions[0] >= 60_000) recentSessions.shift();
        if (sessions.size >= MAX_SESSIONS || recentSessions.length >= 10) throw new ApiError(429, "Local session capacity reached. Clear a session or try later.");
        recentSessions.push(now()); sessions.delete(token(request));
        const id = randomBytes(32).toString("hex");
        const ws: Workspace = { id: randomUUID(), name: "Local workspace", expiresAt: new Date(now() + SESSION_TTL_MS).toISOString(), assets: [], runs: [] };
        sessions.set(id, ws); return json(ws, 201, cookie(id));
      }
      if (endpoint === "session" && request.method === "DELETE") { sessions.delete(token(request)); return json({ cleared: true }, 200, cookie("", 0)); }
      const ws = workspace(request);
      if (endpoint === "workspace" && request.method === "GET") return json(ws);
      if (endpoint === "assets" && request.method === "POST") {
        const value = await body(request, ["hostname"]);
        let hostname: string; try { hostname = normalizeExternalHostname(value.hostname); } catch { throw new ApiError(400, "Enter one public hostname, without a URL, IP address, path, credentials or port."); }
        if (ws.assets.length >= 20) throw new ApiError(409, "This local workspace is limited to 20 assets.");
        if (ws.assets.some(a => a.hostname === hostname)) throw new ApiError(409, "This hostname is already an asset.");
        const asset = freeze({ id: randomUUID(), hostname, createdAt: new Date(now()).toISOString() }); ws.assets.push(asset); return json(asset, 201);
      }
      if (endpoint === "runs" && request.method === "POST") {
        const input = await body(request, ["assetId", "authorized"]);
        if (input.authorized !== true) throw new ApiError(400, "Confirm that you own this hostname or are authorized to observe it.");
        const asset = ws.assets.find(a => a.id === input.assetId); if (!asset) throw new ApiError(404, "Asset not found in this workspace.");
        if (workspace(request) !== ws) throw new ApiError(401, "Local session ended.");
        const hostname = normalizeExternalHostname(asset.hostname);
        if (ws.runs.length >= 32 || Buffer.byteLength(JSON.stringify(ws.runs)) >= 8 * 1024 * 1024) throw new ApiError(409, "Session run capacity reached. Download existing sources before clearing this workspace.");
        while (recentRuns.length && now() - recentRuns[0] >= 60_000) recentRuns.shift();
        if (active >= 2 || recentRuns.length >= 10 || recentHosts.has(hostname)) throw new ApiError(429, "Collection is bounded. Wait one minute before rerunning this hostname.");
        recentHosts.set(hostname, now()); recentRuns.push(now()); active += 1;
        try {
          const snapshot = validateExternalSnapshot(await run(hostname));
          if (snapshot.target !== hostname) throw new Error("Target mismatch");
          if (sessions.get(token(request)) !== ws || Date.parse(ws.expiresAt) <= now()) throw new ApiError(401, "Local session ended. The completed snapshot was not retained.");
          const source = JSON.stringify(snapshot);
          if (ws.runs.length >= 32 || Buffer.byteLength(JSON.stringify(ws.runs)) + Buffer.byteLength(source) > 8 * 1024 * 1024) throw new ApiError(409, "Session run capacity reached. The snapshot was not retained.");
          const record: Run = freeze({ id: randomUUID(), assetId: asset.id, createdAt: new Date(now()).toISOString(), sourceDigest: createHash("sha256").update(source).digest("hex"), profile: structuredClone(RECOMMENDED_PROFILE), snapshot: JSON.parse(source) });
          ws.runs.push(record); return json(record, 201);
        } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(422, "The bounded observation could not complete. No security conclusion or run was recorded."); }
        finally { active -= 1; }
      }
      throw new ApiError(405, "Method not supported.");
    } catch (error) { return json({ error: error instanceof ApiError ? error.message : "Local request failed." }, error instanceof ApiError ? error.status : 500); }
  }
  return { handle };
}
const key = Symbol.for("witnessops.app.local-foundation.v1");
const globalService = globalThis as typeof globalThis & { [key]?: ReturnType<typeof createFoundationService> };
export const foundation = globalService[key] ??= createFoundationService();
