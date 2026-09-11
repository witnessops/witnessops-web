import "server-only";
import type { Pool } from "pg";
import { runSnapshot } from "../../../witnessops-web/src/lib/external-exposure/runner";
import { readExternalRequestBody } from "../../../witnessops-web/src/lib/external-exposure/request";
import { findDuplicateJsonObjectKey } from "../../../witnessops-web/src/lib/json-ambiguity";
import type { ExternalSnapshotV1, WorkspaceState } from "./model";
import { ApiError, requireId } from "./errors";
import { authConfiguration } from "./auth-config";
import { database } from "./db/pool";
import { resolveIdentity, type Identity } from "./db/identity";
import { WorkspaceStore } from "./db/workspaces";
import { activateEarlyAccess, earlyAccess, requireEarlyAccess } from './db/access';
import { ActivityStore } from './db/activity';
import { CLIENT_EVENTS, type ClientEvent, type ProductEvent } from './early-access';
import type { AppUser } from './db/identity';

export function admitRequest(request: Request, origin: string) {
  const url = new URL(request.url), configured = new URL(origin);
  const internalAlias = configured.hostname === "127.0.0.1" && url.hostname === "localhost" && url.protocol === configured.protocol && url.port === configured.port;
  if (request.headers.get("host") !== configured.host || (url.origin !== origin && !internalAlias)) throw new ApiError(403, "Use the configured app origin.");
  if (![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))) throw new ApiError(403, "Use the app origin.");
  if (request.method !== "GET" && request.headers.get("origin") !== origin) throw new ApiError(403, "Use the app origin.");
  if (url.search && (request.method !== "GET" || !["/api/assets", "/api/runs"].includes(url.pathname) || [...url.searchParams.keys()].join() !== "id")) throw new ApiError(400, "Unexpected query parameters.");
}
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
function json(value: unknown, status = 200) { return Response.json(value, { status, headers }); }
async function body(request: Request, keys: string[]) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "") || request.headers.has("content-encoding")) throw new ApiError(400, "Use a small JSON object.");
  try {
    const source = await readExternalRequestBody(request);
    if (findDuplicateJsonObjectKey(source) !== null) throw new Error();
    const value: unknown = JSON.parse(source);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== [...keys].sort().join()) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new ApiError(400, "Submit only the required fields in at most 1 KiB."); }
}
/** Dependency injection is a server test seam; no HTTP route or environment
 * switch accepts an identity, source snapshot, or alternate runner from clients. */
export function createFoundationService(options: {
  pool?: Pool; identity?: () => Promise<Identity | null>; origin?: string;
  run?: (target: string) => Promise<ExternalSnapshotV1>; now?: () => number;
} = {}) {
  const recentHosts = new Map<string, number>(), recentRuns: number[] = [];
  const now = options.now ?? Date.now, execute = options.run ?? runSnapshot;
  let active = 0;
  async function handle(request: Request, endpoint: "workspace" | "assets" | "runs" | "early-access" | "events" | "feedback"): Promise<Response> {
    try {
      admitRequest(request, options.origin ?? authConfiguration().origin);
      const identity = await (options.identity ? options.identity() : (await import("./auth")).authenticatedIdentity());
      if (!identity) throw new ApiError(401, "Sign in to WitnessOps.");
      const pool = options.pool ?? database(), user = await resolveIdentity(pool, identity), store = new WorkspaceStore(pool);
      const activity = new ActivityStore(pool);
      const record = (actor: AppUser, workspace: string | null, name: ProductEvent, refs?: Parameters<ActivityStore['record']>[3]) => activity.record(actor, workspace, name, refs).catch(() => undefined);
      if (endpoint === 'early-access') {
        if (request.method === 'POST') {
          const input = await body(request, ['action']);
          if (input.action !== 'activate') throw new ApiError(400, 'Choose Activate Early Access.');
          await activateEarlyAccess(pool, user);
          await record(user, null, 'early_access_activated');
        } else if (request.method !== 'GET') throw new ApiError(405, 'Method not supported.');
        return json({ state: await earlyAccess(pool, user) });
      }
      await requireEarlyAccess(pool, user);
      if (endpoint === "workspace" && request.method === "POST") {
        const input = await body(request, ["name", "requestId"]);
        const id = await store.create(user, input.name, input.requestId);
        return json({ user, workspaces: await store.list(user), workspace: await store.read(user, id) } satisfies WorkspaceState, 201);
      }
      const workspaces = await store.list(user);
      const selected = request.headers.get("x-witnessops-workspace");
      const workspaceId = selected === null ? (workspaces.length === 1 ? workspaces[0].id : null) : requireId(selected);
      if (endpoint === "workspace" && request.method === "GET") {
        return json({ user, workspaces, workspace: workspaceId ? await store.read(user, workspaceId) : null } satisfies WorkspaceState);
      }
      if (!workspaceId) throw new ApiError(400, "Select a workspace.");
      if (endpoint === 'feedback' && request.method === 'GET') return json(await activity.decisions(user, workspaceId));
      if (endpoint === 'feedback' && request.method === 'POST') {
        const input = await body(request, ['surface', 'runId', 'response', 'comment']);
        const decision = await activity.feedback(user, workspaceId, { surface: input.surface, runId: input.runId, response: input.response, comment: input.comment });
        if (decision.created && input.response !== 'dismissed') await record(user, workspaceId, 'feedback_submitted', { runId: decision.runId });
        return json({ surface: decision.surface, runId: decision.runId }, 201);
      }
      if (endpoint === 'events' && request.method === 'POST') {
        const input = await body(request, ['name', 'runId', 'checkId']);
        if (!CLIENT_EVENTS.includes(input.name as ClientEvent) || (input.name === 'evidence_opened' ? typeof input.checkId !== 'string' : input.checkId !== null)) throw new ApiError(400, 'Use a listed product event.');
        await activity.record(user, workspaceId, input.name as ClientEvent, { runId: requireId(input.runId), ...(typeof input.checkId === 'string' ? { checkId: input.checkId } : {}) });
        return json({ recorded: true });
      }
      if (endpoint === "assets" && request.method === "GET") return json(await store.asset(user, workspaceId, new URL(request.url).searchParams.get("id")));
      if (endpoint === "runs" && request.method === "GET") return json(await store.run(user, workspaceId, new URL(request.url).searchParams.get("id")));
      if (endpoint === "assets" && request.method === "POST") {
        const input = await body(request, ["hostname", "type"]);
        const asset = await store.addAsset(user, workspaceId, input.hostname, input.type);
        await record(user, workspaceId, 'asset_added', { assetId: asset.id });
        return json(asset, 201);
      }
      if (endpoint === "runs" && request.method === "POST") {
        const input = await body(request, ["assetId", "authorized"]);
        if (input.authorized !== true) throw new ApiError(400, "Confirm that you own this hostname or are authorized to observe it.");
        const asset = await store.asset(user, workspaceId, input.assetId, true);
        for (const [h, t] of recentHosts) if (now() - t >= 60_000) recentHosts.delete(h);
        while (recentRuns.length && now() - recentRuns[0] >= 60_000) recentRuns.shift();
        if (active >= 2 || recentRuns.length >= 10 || recentHosts.has(asset.hostname)) throw new ApiError(429, "Collection is bounded. Wait one minute before rerunning this hostname.");
        recentHosts.set(asset.hostname, now()); recentRuns.push(now()); active += 1;
        let runId: string | undefined;
        try {
          runId = await store.beginRun(user, workspaceId, asset.id);
          await record(user, workspaceId, 'observation_started', { runId });
          await record(user, workspaceId, 'rerun_started', { runId });
          const snapshot = await execute(asset.hostname);
          // Re-read current membership on completion; revocation never returns
          // or persists the collected source to the now-unauthorized caller.
          const run = await store.completeRun(user, workspaceId, runId, snapshot);
          await record(user, workspaceId, 'observation_completed', { runId });
          return json(run, 201);
        } catch (error) {
          if (runId) {
            await store.failRun(workspaceId, runId, user);
            await record(user, workspaceId, 'observation_failed', { runId });
          }
          if (error instanceof ApiError) throw error;
          throw new ApiError(422, "The bounded observation could not complete. No successful source snapshot was recorded.");
        } finally { active -= 1; }
      }
      throw new ApiError(405, "Method not supported.");
    } catch (error) { return json({ error: error instanceof ApiError ? error.message : "Request could not complete.", ...(error instanceof ApiError && error.accessState !== undefined ? { code: 'EARLY_ACCESS_REQUIRED', accessState: error.accessState } : {}) }, error instanceof ApiError ? error.status : 500); }
  }
  return { handle };
}
const key = Symbol.for("witnessops.app.persistent-service.v1");
const globalService = globalThis as typeof globalThis & { [key]?: ReturnType<typeof createFoundationService> };
export const foundation = globalService[key] ??= createFoundationService();
