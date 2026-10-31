import 'server-only';
import type { Pool } from 'pg';
import type { authenticatedWebSession } from '../auth';
import type { createFixtureEngine, EngineActor } from './engine';
import { aasrFixtureEnabled } from './guard';
import { AASR_FIXTURE_PATH, AASR_FIXTURE_WORKSPACE_ID } from './contract';
import { WORKSPACE_OWNER_ROLE, parseWorkspaceRole } from '../workspace-role-policy';
import { ApiError, requireId } from '../errors';
import { authConfiguration } from '../auth-config';
import { admitRequest } from '../server';
import { database, transaction } from '../db/pool';
import { resolveIdentity } from '../db/identity';
import { requireWorkspaceMembership } from '../db/workspaces';
import { readExternalRequestBody } from '../../../../witnessops-web/src/lib/external-exposure/request';
import { findDuplicateJsonObjectKey } from '../../../../witnessops-web/src/lib/json-ambiguity';
import { isAasrStagingBuild, isProductionAppBuild, stagingRuntimeReady } from '../aasr-staging/config';
import { currentStagingAssignment, requireStagingFixtureActor, type StagingAssignment } from './assignment';
import { lockUnrevokedSession } from '../db/sessions';

// Synthetic assignment only, never inferred from a customer role or HTTP claim.
export const AASR_FIXTURE_REVIEWER_ID = '22000000-0000-4000-8000-000000000002';
const REVIEWER_GENERATION = 1;
const REVIEWER_MEMBERSHIP_ROLE = parseWorkspaceRole('contributor');
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
async function readCommand(request: Request): Promise<{ command: string; expectedRevision: number }> {
  if (request.headers.has('content-encoding') || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) throw new ApiError(400, 'Use a small JSON command.');
  try {
    const raw = await readExternalRequestBody(request);
    if (findDuplicateJsonObjectKey(raw) !== null) throw new Error();
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join() !== 'command,expectedRevision') throw new Error();
    const input = value as Record<string, unknown>;
    if (typeof input.command !== 'string' || input.command.length > 40 || !Number.isSafeInteger(input.expectedRevision) || Number(input.expectedRevision) < 0) throw new Error();
    return input as { command: string; expectedRevision: number };
  } catch { throw new ApiError(400, 'Submit only command and expectedRevision in at most 1 KiB.'); }
}
/** Trusted server composition seam only; no HTTP input or environment identity bypass.
 * Native adapters always use AuthKit sessions and current PostgreSQL membership. */
export function createAasrFixtureService(options: {
  pool?: Pool; identity?: typeof authenticatedWebSession; origin?: string; enabled?: () => boolean;
  /** Trusted in-process test composition only; never supplied by a route. */
  stagingAssignment?: () => StagingAssignment | null;
} = {}) {
  let engine: ReturnType<typeof createFixtureEngine> | undefined;
  let engineAssignment: string | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const denied: { reason: string; at: string }[] = [];
  const rememberDenial = (status: number) => {
    denied.push({ reason: `request_refused_${status}`, at: new Date().toISOString() });
    if (denied.length > 128) denied.shift();
  };
  async function handle(request: Request): Promise<Response> {
    // Refuse before importing evidence, resolving identity, or opening the database.
    if ((!isAasrStagingBuild() && (isProductionAppBuild || process.env.NODE_ENV === 'production'))
      || (isAasrStagingBuild() && !stagingRuntimeReady()) || !(options.enabled ?? aasrFixtureEnabled)()) return json({ error: 'Not found.' }, 404);
    try {
      if (new URL(request.url).pathname !== AASR_FIXTURE_PATH) throw new ApiError(404, 'Not found.');
      if (!['GET', 'POST'].includes(request.method)) throw new ApiError(405, 'Method not supported.');
      admitRequest(request, options.origin ?? authConfiguration().origin, process.env.WITNESSOPS_APP_PROXY_MODE);
      const workspace = requireId(request.headers.get('x-witnessops-workspace'));
      if (workspace !== AASR_FIXTURE_WORKSPACE_ID) throw new ApiError(404, 'Fixture not found in this workspace.');
      const input = request.method === 'POST' ? await readCommand(request) : null;
      const web = await (options.identity ?? (await import('../auth')).authenticatedWebSession)();
      if (!web) throw new ApiError(401, 'Sign in to WitnessOps.');
      const pool = options.pool ?? database();
      const user = await resolveIdentity(pool, web.identity);
      user.session = web.session;
      const staging = isAasrStagingBuild() || Boolean(options.stagingAssignment);
      const assignment = staging ? (options.stagingAssignment ?? currentStagingAssignment)() : null;
      // An operator assignment change cannot inherit the prior actors' in-memory
      // workflow. Restart is explicit; do not silently reset accepted evidence.
      const assignmentKey = staging ? JSON.stringify(assignment) : undefined;
      if (engineAssignment !== undefined && assignmentKey !== engineAssignment) throw new ApiError(403, 'The staging assignment changed. Restart the fixture before continuing.');
      const engineModule = await import('./engine');
      engine ??= engineModule.createFixtureEngine({ workspaceId: workspace });
      const current = engine;
      const candidate = current.fork();
      const result = await transaction(pool, async client => {
        let role: EngineActor['role'];
        if (staging) role = await requireStagingFixtureActor(client, user, web, assignment);
        else {
          await lockUnrevokedSession(client, web.session);
          const member = await requireWorkspaceMembership(client, user, workspace);
          if (user.id === AASR_FIXTURE_REVIEWER_ID) {
            if (member.role !== REVIEWER_MEMBERSHIP_ROLE || member.generation !== REVIEWER_GENERATION) throw new ApiError(403, 'The independent reviewer assignment is not current.');
            role = 'reviewer';
          } else if (member.role === WORKSPACE_OWNER_ROLE) role = WORKSPACE_OWNER_ROLE;
          else throw new ApiError(403, 'An Owner or independently assigned reviewer is required.');
        }
        const actor: EngineActor = { id: user.id, workspaceId: workspace, role };
        let commandError: Error | undefined;
        try { if (input) candidate.command(actor, input.command, input.expectedRevision); }
        catch (error) { if (!(error instanceof engineModule.FixtureError)) throw error; commandError = error; }
        return { commandError, view: { ...candidate.read(actor), workspaceId: workspace, actorRole: role, authorityDenials: denied.slice(-16) } };
      });
      // The transaction is the authorization linearization point. Serialize every
      // operation and publish its candidate only after successful COMMIT.
      current.adopt(candidate);
      engineAssignment = assignmentKey;
      if (result.commandError) throw result.commandError;
      return json(result.view);
    } catch (error) {
      const fixture = error as { httpStatus?: number; code?: string; message?: string };
      const status = error instanceof ApiError ? error.status : Number.isInteger(fixture?.httpStatus) ? fixture.httpStatus! : 500;
      rememberDenial(status);
      return json({ error: status === 500 ? 'Fixture request could not complete.' : error instanceof Error ? error.message : 'Fixture request refused.' }, status);
    }
  }
  return (request: Request): Promise<Response> => {
    const result = queue.then(() => handle(request));
    queue = result.catch(() => undefined);
    return result;
  };
}
export const aasrFixtureRequest = createAasrFixtureService();
