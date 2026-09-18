import 'server-only';
import { createHash } from 'node:crypto';
import { checkRateLimit, _cleanupExpiredEntries as cleanupRateLimits } from '@witnessops/config/rate-limit';
import type { authenticatedWebSession } from './auth';
import { authConfiguration } from './auth-config';
import { admitRequest } from './server';
import { ApiError } from './errors';
import { HELP_PAGES, helpPayload, type HelpAnswer } from './help-context';
import { readBoundedRequestText } from '../../../witnessops-web/src/lib/server/bounded-request-body';
import { findDuplicateJsonObjectKey } from '../../../witnessops-web/src/lib/json-ambiguity';
import { readDocsAssistantRuntimeConfig } from '../../../witnessops-web/src/lib/docs-assistant/runtime-config';
import { runDocsAssistantServerRuntime } from '../../../witnessops-web/src/lib/docs-assistant/server-runtime';
import { evaluateDocsAssistantRefusalPolicy } from '../../../witnessops-web/src/lib/docs-assistant/refusal-policy';
import type { DocsAssistantAnswer } from '../../../witnessops-web/src/lib/docs-assistant/answer-contract';
export function presentHelpAnswer(answer: DocsAssistantAnswer): HelpAnswer {
  return { status: answer.answer_status, facts: answer.documented_facts.map(c=>c.text), inference: answer.inference.map(c=>c.text), limits: answer.not_proven, reason: answer.unsupported_reason ?? undefined,
    sources: answer.citations.map(c=>{
      if(c.source_type==='source_url') { try { const u=new URL(c.source_url);if(u.origin==='https://witnessops.com'&&(u.pathname==='/docs'||u.pathname.startsWith('/docs/'))&&!u.username&&!u.password) return {title:c.title,url:u.origin+u.pathname}; } catch {} return {title:c.title}; }
      return {title:c.source_type==='repo_path'?c.title:c.filename};
    }) };
}
export function createHelpService(options: { origin?:string; identity?:typeof authenticatedWebSession; enabled?:boolean; answer?:(question:string)=>Promise<HelpAnswer> }={}) {
 return async (request:Request)=>{const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
  try {
   admitRequest(request,options.origin??authConfiguration().origin,process.env.WITNESSOPS_APP_PROXY_MODE);
   if(request.method!=='POST')throw new ApiError(405,'Use POST.');
   const session=await (options.identity??(await import('./auth')).authenticatedWebSession)();if(!session)throw new ApiError(401,'Sign in to ask a documentation question.');
   if(!(options.enabled??process.env.WITNESSOPS_APP_HELP_ENABLED==='1'))throw new ApiError(503,'AI documentation guidance is not enabled. Open Documentation or ask a person.');
   cleanupRateLimits();
   const key=createHash('sha256').update(session.identity.issuer+'\0'+session.identity.subject).digest('hex');
   if(!checkRateLimit('app-help',key,{limit:10,windowMs:60000}).allowed)throw new ApiError(429,'Please wait before asking another question.');
   if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||'')||request.headers.has('content-encoding'))throw new ApiError(400,'Use JSON.');
   let input;try {const raw=await readBoundedRequestText(request,8192);if(findDuplicateJsonObjectKey(raw)!==null)throw new Error();input=helpPayload(JSON.parse(raw));}catch{throw new ApiError(400,'Submit only a question and a supported page category.');}
   if(evaluateDocsAssistantRefusalPolicy(input.question).blocked)throw new ApiError(400,'Ask about using WitnessOps. Do not include secrets or request operational actions.');
   const question=`Product documentation guidance only. Generic page: ${HELP_PAGES[input.page].label}. No workspace data is available.\nQuestion: ${input.question}`;
   if(options.answer)return Response.json(await options.answer(question),{headers});
   const config=readDocsAssistantRuntimeConfig();if(!config.enabled)throw new ApiError(503,'AI documentation guidance is unavailable. Open Documentation or ask a person.');
   const result=await runDocsAssistantServerRuntime({payload:{question},config,logger:()=>{}});
   return Response.json(presentHelpAnswer(result),{headers});
  }catch(error){return Response.json({error:error instanceof ApiError?error.message:'Documentation guidance is unavailable. Try again or open Documentation.'},{status:error instanceof ApiError?error.status:503,headers});}
 };
}
