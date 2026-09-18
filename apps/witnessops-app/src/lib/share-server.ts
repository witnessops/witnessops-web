import 'server-only';
import type { Pool } from 'pg';
import type { authenticatedWebSession } from './auth';
import { authConfiguration } from './auth-config';
import { database } from './db/pool';
import { resolveIdentity } from './db/identity';
import { ShareStore } from './db/shares';
import { ApiError, requireId } from './errors';
import { admitRequest } from './server';
import { readExternalRequestBody } from '../../../witnessops-web/src/lib/external-exposure/request';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
export const SHARE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff' };
export function createShareService(options: {
    pool?: Pool;
    origin?: string;
    identity?: typeof authenticatedWebSession;
} = {}) {
    return async (request: Request, recipient = false) => {
        try {
            admitRequest(request, options.origin ?? authConfiguration().origin, process.env.WITNESSOPS_APP_PROXY_MODE);
            if (request.method !== 'POST')
                throw new ApiError(405, 'Use POST.');
            if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') || '') || request.headers.has('content-encoding'))
                throw new ApiError(400, 'Use JSON.');
            const raw = await readExternalRequestBody(request);
            let input: Record<string, unknown>;
            try {
                if (findDuplicateJsonObjectKey(raw) !== null)
                    throw new Error();
                input = JSON.parse(raw);
                if (!input || typeof input !== 'object' || Array.isArray(input))
                    throw new Error();
            }
            catch {
                throw new ApiError(400, 'Submit the required fields.');
            }
            const fields = (names: string[]) => { if (Object.keys(input).sort().join() !== names.sort().join())
                throw new ApiError(400, 'Submit only the required fields.'); };
            const pool = options.pool ?? database(), store = new ShareStore(pool);
            if (recipient) {
                fields(['token']);
                return Response.json(await store.read(input.token), { headers: SHARE_HEADERS });
            }
            const web = await (options.identity ?? (await import('./auth')).authenticatedWebSession)();
            if (!web)
                throw new ApiError(401, 'Sign in.');
            const user = await resolveIdentity(pool, web.identity);
            user.session = web.session;
            const workspace = requireId(request.headers.get('x-witnessops-workspace'));
            let result;
            if (input.action === 'preview') {
                fields(['action', 'runId']);
                result = await store.preview(user, workspace, input.runId);
            }
            else if (input.action === 'list') {
                fields(['action', 'runId']);
                result = await store.list(user, workspace, input.runId);
            }
            else if (input.action === 'publish') {
                fields(['action', 'id', 'token', 'digest', 'audience']);
                result = await store.publish(user, workspace, { id: input.id, token: input.token, digest: input.digest, audience: input.audience });
            }
            else if (input.action === 'revoke') {
                fields(['action', 'id']);
                result = await store.revoke(user, workspace, input.id);
            }
            else
                throw new ApiError(400, 'Choose a sharing action.');
            return Response.json(result, { headers: SHARE_HEADERS });
        }
        catch (error) {
            return Response.json({ error: error instanceof ApiError ? error.message : 'Sharing request could not complete.' }, { status: error instanceof ApiError ? error.status : 500, headers: SHARE_HEADERS });
        }
    };
}
export const shareRequest = createShareService();
