import 'server-only';
import type { Pool } from 'pg';
import type { authenticatedWebSession } from './auth';
import { authConfiguration } from './auth-config';
import { database } from './db/pool';
import { resolveIdentity } from './db/identity';
import { SharePasswordStore } from './db/share-passwords';
import { PasswordChallenge } from './share-password';
import { ShareAccessStore } from './db/share-access';
import { sendMail } from '../../../witnessops-web/src/lib/server/send-verification-email';
import type { InvitationSender } from './db/members';
import { ShareStore } from './db/shares';
import { ApiError, requireId } from './errors';
import { admitRequest } from './server';
import { readExternalRequestBody } from '../../../witnessops-web/src/lib/external-exposure/request';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
export const SHARE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff' };
export function createShareService(options: {
    pool?: Pool;
    send?: InvitationSender;
    mailEnabled?: boolean;
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
                if(input.action==='unlock') {
                    fields(['action','token','password']);
                    return Response.json(await new SharePasswordStore(pool).unlock(input.token,input.password),{headers:SHARE_HEADERS});
                }
                fields(Object.hasOwn(input,'unlock')?['token','unlock']:['token']);
                return Response.json(await store.read(input.token,input.unlock), { headers: SHARE_HEADERS });
            }
            const web = await (options.identity ?? (await import('./auth')).authenticatedWebSession)();
            if (!web)
                throw new ApiError(401, 'Sign in.');
            const user = await resolveIdentity(pool, web.identity);
            user.session = web.session;
            const workspace = requireId(request.headers.get('x-witnessops-workspace'));
            let result;
            if (input.action === 'preview') {
                fields(Object.hasOwn(input, 'name') ? ['action', 'runId', 'name'] : ['action', 'runId']);
                result = await store.preview(user, workspace, input.runId, input.name);
            }
            else if (input.action === 'list') {
                fields(['action', 'runId']);
                result = await store.list(user, workspace, input.runId);
            }
            else if (input.action === 'publish') {
                fields(['action', 'id', 'token', 'digest', 'audience']);
                result = await store.publish(user, workspace, { id: input.id, token: input.token, digest: input.digest, audience: input.audience });
            }
            else if (input.action === 'password') {
                fields(['action','id','version','password']);
                result=await new SharePasswordStore(pool).set(user,workspace,input.id,input.version,input.password);
            }
            else if (input.action === 'access') {
                fields(['action','id','version','expiresAt','rotate']);
                if (typeof input.rotate !== 'boolean') throw new ApiError(400,'Choose an access action.');
                result = await new ShareAccessStore(pool).change(user,workspace,input.id,input.version,input.expiresAt,input.rotate);
            }
            else if (input.action === 'email-history') {
                fields(['action','id']);result=await new ShareAccessStore(pool).deliveries(user,workspace,input.id);
            }
            else if (input.action === 'email-preview' || input.action === 'email-send') {
                if (!(options.mailEnabled ?? (process.env.WITNESSOPS_REPORT_EMAIL_ENABLED === '1' && process.env.WITNESSOPS_REPORT_EMAIL_TRACKING_DISABLED === '1'))) throw new ApiError(503,'Report email is not enabled. Copy the link instead.');
                const access = new ShareAccessStore(pool), origin = options.origin ?? authConfiguration().origin;
                if (input.action === 'email-preview') {
                    fields(['action','id','token','email','requestId']);
                    result=await access.draft(user,workspace,{id:input.id,token:input.token,email:input.email,requestId:input.requestId},origin);
                } else {
                    fields(['action','id','token','digest','confirmed']);
                    result=await access.send(user,workspace,{id:input.id,token:input.token,digest:input.digest,confirmed:input.confirmed},origin,options.send??sendMail);
                }
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
            return Response.json({ error: error instanceof ApiError ? error.message : 'Sharing request could not complete.', ...(error instanceof PasswordChallenge ? {passwordRequired:true} : {}) }, { status: error instanceof ApiError ? error.status : 500, headers: SHARE_HEADERS });
        }
    };
}
export const shareRequest = createShareService();
