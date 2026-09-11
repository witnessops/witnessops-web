import 'server-only';
import type { Pool } from 'pg';
import { CliAuthStore, CliError, type WebCliIdentity } from './db/cli-auth';
import { database } from './db/pool';
import { authConfiguration } from './auth-config';
import { admitRequest } from './server';
import { ApiError } from './errors';
import { readExternalRequestBody } from '../../../witnessops-web/src/lib/external-exposure/request';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' };
async function input(request: Request, keys: string[], optional: string[] = []) {
  if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '') || request.headers.has('content-encoding')) throw new CliError('invalid_request');
  try {
    const raw = await readExternalRequestBody(request);
    if (findDuplicateJsonObjectKey(raw) !== null) throw new Error();
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== 'object' || keys.some(key => !(key in value)) || Object.keys(value).some(key => ![...keys, ...optional].includes(key))) throw new Error();
    return value;
  } catch { throw new CliError('invalid_request'); }
}
export function createCliAuthService(options: { pool?: Pool; origin?: string; identity?: () => Promise<WebCliIdentity | null>; now?: () => number } = {}) {
  let active = 0;
  return { async handle(request: Request, endpoint: 'login' | 'poll' | 'authorize' | 'session'): Promise<Response> {
    const response = (value: unknown, status = 200) => Response.json(value, { status, headers });
    if (active >= 8) return Response.json({ code: 'busy' }, { status: 429, headers: { ...headers, 'Retry-After': '5' } });
    active++;
    try {
      const origin = options.origin ?? authConfiguration().origin;
      admitRequest(request, origin, process.env.WITNESSOPS_APP_PROXY_MODE);
      const store = new CliAuthStore(options.pool ?? database(), options.now);
      if (endpoint === 'login' && request.method === 'POST') {
        await input(request, []);
        return response({ ...await store.create(), authorizationUrl: `${origin}/cli/authorize` }, 201);
      }
      if (endpoint === 'poll' && request.method === 'POST') return response(await store.poll((await input(request, ['device'])).device));
      if (endpoint === 'session') {
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization') ?? '');
        if (!match) throw new CliError('invalid_credential', 401);
        if (request.method === 'GET') return response(await store.status(match[1]));
        if (request.method === 'POST') { await input(request, []); return response(await store.logout(match[1])); }
      }
      if (endpoint === 'authorize' && ['GET', 'POST'].includes(request.method)) {
        const web = await (options.identity ? options.identity() : (await import('./auth')).authenticatedWebSession());
        if (!web) throw new CliError('sign_in', 401);
        if (request.method === 'GET') return response(await store.context(web));
        return response(await store.bind(web, await input(request, ['code', 'workspaceId', 'displayedUserId', 'action'], ['scope'])));
      }
      throw new CliError('method_not_supported', 405);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 503;
      const code = error instanceof CliError ? error.code : error instanceof ApiError ? 'access_denied' : 'unavailable';
      return Response.json({ code }, { status, headers: { ...headers, ...(status === 429 ? { 'Retry-After': '5' } : {}) } });
    } finally { active--; }
  } };
}
const key = Symbol.for('witnessops.app.cli-auth.v1');
const globalState = globalThis as typeof globalThis & { [key]?: ReturnType<typeof createCliAuthService> };
export const cliAuth = globalState[key] ??= createCliAuthService();
