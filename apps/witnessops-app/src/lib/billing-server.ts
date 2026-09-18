import 'server-only';
import type { Pool } from 'pg';
import type { authenticatedWebSession } from './auth';
import { authConfiguration } from './auth-config';
import { database } from './db/pool';
import { resolveIdentity } from './db/identity';
import { requireWorkspaceMembership } from './db/workspaces';
import { transaction } from './db/pool';
import { BillingStore } from './db/billing';
import { billingConfiguration, billingEnabled, type BillingConfig } from './billing-config';
import { StripeHttp, verifyStripeEvent, type StripeGateway } from './stripe-gateway';
import { ApiError, requireId } from './errors';
import { admitRequest } from './server';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
async function body(request:Request,limit:number){
 if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||'')||request.headers.has('content-encoding'))throw new ApiError(400,'Use JSON.');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Missing body.');
 const chunks:Uint8Array[]=[];let bytes=0,expired=false;const timer=setTimeout(()=>{expired=true;void reader.cancel();},5000);
 try{for(;;){const {done,value}=await reader.read();if(expired)throw new ApiError(408,'Request timed out.');if(done)break;bytes+=value.length;if(bytes>limit){void reader.cancel();throw new ApiError(413,'Request too large.');}chunks.push(value);}}finally{clearTimeout(timer);reader.releaseLock();}
 return Buffer.concat(chunks);
}
export function createBillingService(options:{pool?:Pool;origin?:string;identity?:typeof authenticatedWebSession;config?:BillingConfig;stripe?:StripeGateway}={}){
 return async(request:Request,webhook=false)=>{
  try{
   if(webhook){
    // Stripe has no browser session or Origin header. Signature authorization applies ONLY here.
    if(!billingEnabled()&&!options.config)throw new ApiError(503,'Sandbox billing is disabled.');
    if(request.method!=='POST'||new URL(request.url).search)throw new ApiError(400,'Invalid webhook request.');
    const config=options.config??billingConfiguration(),raw=await body(request,256*1024);
    let event;try{event=verifyStripeEvent(raw,request.headers.get('stripe-signature'),config.webhookSecret);}catch{throw new ApiError(400,'Invalid Stripe signature or event.');}
    const store=new BillingStore(options.pool??database(),options.stripe??new StripeHttp(config),config,options.origin??authConfiguration().origin);
    return Response.json(await store.event(event),{headers});
   }
   const origin=options.origin??authConfiguration().origin;admitRequest(request,origin,process.env.WITNESSOPS_APP_PROXY_MODE);
   const web=await(options.identity??(await import('./auth')).authenticatedWebSession)();if(!web)throw new ApiError(401,'Sign in.');
   const pool=options.pool??database(),user=await resolveIdentity(pool,web.identity);user.session=web.session;
   const workspace=requireId(request.headers.get('x-witnessops-workspace'));
   await transaction(pool,client=>requireWorkspaceMembership(client,user,workspace));
   if(!billingEnabled()&&!options.config){if(request.method==='GET')return Response.json({sandbox:false,enabled:false},{headers});throw new ApiError(503,'Sandbox billing is disabled.');}
   const config=options.config??billingConfiguration(),store=new BillingStore(pool,options.stripe??new StripeHttp(config),config,origin);
   if(request.method==='GET')return Response.json({enabled:true,...await store.status(user,workspace)},{headers});
   if(request.method!=='POST')throw new ApiError(405,'Use GET or POST.');
   let input;try{const raw=(await body(request,1024)).toString('utf8');if(findDuplicateJsonObjectKey(raw)!==null)throw new Error();input=JSON.parse(raw);}catch{throw new ApiError(400,'Submit only the required fields.');}
   if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'Invalid action.');
   const expected=input.action==='checkout'?['action','plan']:['action'];
   if(Object.keys(input).sort().join()!==expected.sort().join())throw new ApiError(400,'Submit only the required fields.');
   const result=input.action==='checkout'?await store.checkout(user,workspace,input.plan):input.action==='portal'?await store.portal(user,workspace):input.action==='refresh'?await store.refresh(user,workspace):null;
   if(!result)throw new ApiError(400,'Choose a billing action.');return Response.json(result,{headers});
  }catch(error){return Response.json({error:error instanceof ApiError?error.message:'Billing is unavailable. No entitlement was granted by this request.'},{status:error instanceof ApiError?error.status:503,headers});}
 };
}
export const billingRequest=createBillingService();
