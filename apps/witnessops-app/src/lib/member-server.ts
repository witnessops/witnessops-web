import 'server-only';
import type { Pool } from 'pg';
import type { InvitationSender } from './db/members';
import { admitRequest } from './server';
import { authConfiguration } from './auth-config';
import type { authenticatedWebSession } from './auth';
import { database } from './db/pool';
import { resolveIdentity } from './db/identity';
import { MembersStore } from './db/members';
import { ApiError, requireId } from './errors';
import { sendMail } from '../../../witnessops-web/src/lib/server/send-verification-email';
import { readExternalRequestBody } from '../../../witnessops-web/src/lib/external-exposure/request';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
const headers = { 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow' };
/** Server-only test dependencies; HTTP clients cannot select a sender or identity. */
export function createMembershipService(options: {
  pool?: Pool;
  origin?: string;
  identity?: typeof authenticatedWebSession;
  send?: InvitationSender;
} = {}) {
return async function memberRequest(request: Request, invitation = false) {
  try {
    const origin=options.origin ?? authConfiguration().origin;
    // Invitation queries use a dedicated, exact locator parameter.
    const url=new URL(request.url);
    if(invitation && request.method==='GET') {
      if([...url.searchParams.keys()].join()!=='id') throw new ApiError(400,'Choose an invitation.');
      requireId(url.searchParams.get('id'));
      url.search='';
      admitRequest(new Request(url,request),origin,process.env.WITNESSOPS_APP_PROXY_MODE);
    } else admitRequest(request,origin,process.env.WITNESSOPS_APP_PROXY_MODE);
    const web=await (options.identity ?? (await import('./auth')).authenticatedWebSession)();
    if(!web) throw new ApiError(401,'Sign in to preview your invitation.');
    const pool=options.pool ?? database(), user=await resolveIdentity(pool,web.identity), store=new MembersStore(pool);
    user.session=web.session;
    let input:Record<string,unknown>={};
    if(request.method==='POST') {
      if(request.headers.has('content-encoding')) throw new ApiError(400,'Encoded bodies are not supported.');
      if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||'')) throw new ApiError(400,'Use JSON.');
      const source=await readExternalRequestBody(request);
      if(findDuplicateJsonObjectKey(source)!==null) throw new ApiError(400,'Duplicate fields.');
      try { input=JSON.parse(source); } catch { throw new ApiError(400,'Use JSON.'); }
      if(!input || typeof input!=='object' || Array.isArray(input)) throw new ApiError(400,'Use an object.');
    }
    const fields=(expected:string[])=>{if(Object.keys(input).sort().join()!==expected.sort().join()) throw new ApiError(400,'Submit only the required fields.');};
    if(invitation) {
      const result=request.method==='GET'?await store.preview(user,web.identity.email,new URL(request.url).searchParams.get('id')):request.method==='POST'?(fields(['id','revision','role']),await store.accept(user,web.identity.email,input.id,input.revision,input.role)):null;
      if(!result) throw new ApiError(405,'Method not supported.');
      return Response.json(result,{headers});
    }
    const workspace=requireId(request.headers.get('x-witnessops-workspace'));
    if(request.method==='POST') {
      if(input.action==='invite' || input.action==='resend') {
        fields(['action','email','role','requestId','replaces']);
        if((input.action==='invite')!==(input.replaces===null)) throw new ApiError(400,'Choose invite or resend.');
        const id=await store.invite(user,workspace,{email:input.email,role:input.role,requestId:input.requestId,replaces:input.replaces});
        await store.deliver(user,workspace,id,origin,options.send ?? sendMail);
      } else if(input.action==='cancel') { fields(['action','id']);await store.cancel(user,workspace,input.id); }
      else if(input.action==='change') { fields(['action','userId','role','generation']);await store.change(user,workspace,input.userId,input.role,input.generation);
        if(input.userId===user.id && input.role===null) return Response.json({removed:true},{headers});
      }
      else throw new ApiError(400,'Choose a membership action.');
    } else if(request.method!=='GET') throw new ApiError(405,'Method not supported.');
    return Response.json(await store.list(user,workspace),{headers});
  } catch(error) {
    return Response.json({error:error instanceof ApiError?error.message:'Membership request could not complete.'},{status:error instanceof ApiError?error.status:500,headers});
  }
}

}
export const memberRequest = createMembershipService();
