import 'server-only';
import { database } from '../db/pool';
import { admitRequest } from '../server';
import { authConfiguration } from '../auth-config';
import { ApiError } from '../errors';
import { CliError } from '../db/cli-auth';
import { LocalAuditFinalizer, MAX_CAPTURE } from './runtime';
import { ServerCheckStore } from './store';
import { findDuplicateJsonObjectKey } from '../../../../witnessops-web/src/lib/json-ambiguity';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export function createServerCheckService(store:ServerCheckStore,origin:string){let active=0;return async(request:Request,upload=false)=>{
 if(active>=2)return Response.json({code:'busy'},{status:429,headers});active++;
 try{
  admitRequest(request,origin,process.env.WITNESSOPS_APP_PROXY_MODE);
  const credential=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization')??'')?.[1];if(!credential)throw new CliError('invalid_credential',401);
  // Authenticate before accepting a potentially large upload body.
  if(request.method==='GET'&&!upload){const id=request.headers.get('X-WitnessOps-Execution');return Response.json(await(id?store.status(credential,id):store.context(credential)),{headers});}
  if(request.method!=='POST')throw new CliError('method_not_supported',405);
  if(request.headers.get('content-type')!=='application/json'||request.headers.has('content-encoding'))throw new CliError('invalid_request');
  await store.authenticate(credential);
  const reader=request.body?.getReader();if(!reader)throw new CliError('invalid_request');const chunks:Uint8Array[]=[];let size=0;
  let timer:ReturnType<typeof setTimeout>;
  const deadline=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{reject(new CliError('upload_timeout',408));void reader.cancel().catch(()=>undefined);},10_000);});
  try{for(;;){const part=await Promise.race([reader.read(),deadline]);if(part.done)break;size+=part.value.length;if(size>(upload?MAX_CAPTURE:32_768))throw new CliError('too_large',413);chunks.push(part.value);}}finally{clearTimeout(timer!);void reader.cancel().catch(()=>undefined);}
  const bytes=Buffer.concat(chunks);
  if(upload)return Response.json(await store.upload(credential,request.headers.get('X-WitnessOps-Execution')??'',bytes,request.headers.get('X-WitnessOps-Capture-SHA256')??''),{headers});
  const raw=bytes.toString('utf8');if(findDuplicateJsonObjectKey(raw)!==null)throw new CliError('invalid_request');return Response.json(await store.authorize(credential,JSON.parse(raw)),{headers,status:201});
 }catch(error){return Response.json({code:error instanceof CliError?error.code:error instanceof ApiError?'access_denied':'unavailable'},{status:error instanceof ApiError?error.status:503,headers});}finally{active--;}
};}
let handler:ReturnType<typeof createServerCheckService>|undefined;
export function serverCheck(request:Request,upload=false){handler??=createServerCheckService(new ServerCheckStore(database(),new LocalAuditFinalizer()),authConfiguration().origin);return handler(request,upload);}
