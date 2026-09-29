import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {constants} from 'node:fs';
import {lstat,open,realpath,mkdir,rename,unlink,readdir} from 'node:fs/promises';
import path from 'node:path';
import {serverOrigin} from './storage.mjs';
const exec=promisify(execFile);
export const ROOT='/opt/witnessops/local-audit-1.2.2';
export const PYTHON=ROOT+'/runtime/bin/python3';
const environment={PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8',PYTHONDONTWRITEBYTECODE:'1'};
export function originatingUid({platform=process.platform,uid=process.getuid?.(),sudoUid=process.env.SUDO_UID}={}){
 if(platform!=='linux'||uid!==0)throw new Error('This check requires elevated local read-only access on Linux. Use sudo wops server check.');
 if(!/^[1-9][0-9]{0,9}$/.test(sudoUid??'')||!Number.isSafeInteger(Number(sudoUid)))throw new Error('Sign in as a normal account, then use sudo wops server check.');
 return Number(sudoUid);
}
export async function readOriginAuth(uid,lookup=async id=>(await exec('/usr/bin/getent',['passwd',String(id)],{env:environment,timeout:5000,maxBuffer:4096})).stdout){
 const fields=(await lookup(uid)).trim().split(':');
 if(fields.length!==7||fields[2]!==String(uid)||!path.isAbsolute(fields[5])||fields[5]==='/')throw new Error('Cannot resolve the originating account safely.');
 const home=fields[5],dir=path.join(home,'.config/witnessops');
 for(const folder of [home,path.join(home,'.config'),dir]){const stat=await lstat(folder);if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==uid||(stat.mode&0o022)||(folder===dir&&(stat.mode&0o777)!==0o700))throw new Error('Originating account auth directory is unsafe.');}
 if(await realpath(home)!==home||await realpath(dir)!==dir)throw new Error('Auth directory must not use symlinks.');
 const fd=await open(path.join(dir,'auth.json'),constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try{const stat=await fd.stat();if(!stat.isFile()||stat.uid!==uid||(stat.mode&0o777)!==0o600||stat.size>4096)throw new Error('Unsafe auth file.');const data=JSON.parse(await fd.readFile('utf8'));if(Object.keys(data).sort().join(',')!=='credential,expiresAt,server'||!/^[A-Za-z0-9_-]{43}$/.test(data.credential)||!Number.isFinite(Date.parse(data.expiresAt)))throw new Error('Malformed auth file.');return {...data,server:serverOrigin(data.server)};}finally{await fd.close();}
}
export async function trustedRuntime(){
 for(const folder of ['/opt','/opt/witnessops',ROOT,ROOT+'/runtime',ROOT+'/runtime/bin']){const s=await lstat(folder);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&0o022))throw new Error('Local Audit runtime is not root-controlled. Ask the operator to prepare the accepted runtime.');}
 const target=await realpath(PYTHON),s=await lstat(target);if(!s.isFile()||s.uid!==0||(s.mode&0o022))throw new Error('Unsafe Local Audit Python.');
 // Python executes installed .pth/package code as root. Check the complete private runtime,
 // including symlink destinations, rather than trusting only the executable directory.
 let count=0;
 const checked=new Set();
 const walk=async file=>{if(++count>30000)throw new Error('Runtime file bound exceeded.');const actual=await realpath(file);if(checked.has(actual))return;checked.add(actual);
  for(let parent=actual;;parent=path.dirname(parent)){const metadata=await lstat(parent);if(metadata.uid!==0||(metadata.mode&0o022))throw new Error('Runtime contains non-root-controlled code.');if(parent==='/')break;}
  const metadata=await lstat(actual);if(metadata.isDirectory()){for(const member of await readdir(actual))await walk(path.join(actual,member));}else if(!metadata.isFile())throw new Error('Runtime contains unsupported file types.');
 };
 await walk(ROOT+'/runtime');
 const result=await exec(PYTHON,['-I','-c','import cryptography; from witnessops_local_audit.package import source_fingerprint; assert cryptography.__version__ == "50.0.1"; print(source_fingerprint())'],{env:environment,timeout:10_000,maxBuffer:4096});
 const hash=result.stdout.trim();if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('Unexpected Local Audit runtime identity.');return hash;
}
export async function privateDirectory(dir,ownerUid=0){await mkdir(dir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});const s=await lstat(dir);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==ownerUid||(s.mode&0o777)!==0o700)throw new Error('Unsafe capture directory.');}
export async function privateRead(file,max=25*1024*1024,ownerUid=0){let fd;try{fd=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=await fd.stat();if(!s.isFile()||s.uid!==ownerUid||(s.mode&0o777)!==0o600||s.size>max)throw new Error('Unsafe capture file.');return await fd.readFile();}catch(e){if(e.code==='ENOENT')return null;throw e;}finally{await fd?.close();}}
export async function privateWrite(file,bytes){const temp=file+'.new';const fd=await open(temp,'wx',0o600);try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}await rename(temp,file);}
export async function privateEntries(dir){const directory=await lstat(dir);if(!directory.isDirectory()||directory.isSymbolicLink()||directory.uid!==0||(directory.mode&0o777)!==0o700)throw new Error('Unsafe retained execution directory.');const entries=await readdir(dir,{withFileTypes:true});return entries.map(entry=>({name:entry.name,type:entry.isDirectory()?'directory':entry.isFile()?'file':'other'}));}
async function syncDirectory(dir){const handle=await open(dir,constants.O_RDONLY|constants.O_DIRECTORY);try{await handle.sync();}finally{await handle.close();}}
async function privateTree(root,ownerUid=0){const pending=[root];while(pending.length){const current=pending.pop(),entries=await readdir(current,{withFileTypes:true});for(const entry of entries){const file=path.join(current,entry.name),info=await lstat(file);if(info.isSymbolicLink()||info.uid!==ownerUid)throw new Error('Unsafe retained execution evidence.');if(info.isDirectory()){if((info.mode&0o777)!==0o700)throw new Error('Unsafe retained execution evidence.');pending.push(file);}else if(!info.isFile()||(info.mode&0o777)!==0o600)throw new Error('Unsafe retained execution evidence.');}}}
async function treeAuthorityDigest(dir,ownerUid=0){const authority=await privateRead(path.join(dir,'authority.json'),65_536,ownerUid);if(!authority)throw new Error('Retained authority evidence is missing.');return createHash('sha256').update(authority).digest('hex');}
export async function findRetirementReceipt(base,requestId){if(!/^[a-f0-9-]{36}$/.test(requestId))throw new Error('Invalid retained request identity.');const retired=path.join(base,'retired');let retiredInfo;try{retiredInfo=await lstat(retired);}catch(error){if(error.code==='ENOENT')return null;throw error;}if(!retiredInfo.isDirectory()||retiredInfo.isSymbolicLink()||retiredInfo.uid!==0||(retiredInfo.mode&0o777)!==0o700)throw new Error('Unsafe retired execution directory.');const entries=await readdir(retired,{withFileTypes:true}),found=[];for(const entry of entries){if(!entry.isDirectory()||entry.isSymbolicLink()||!/^[a-f0-9-]{36}$/.test(entry.name))throw new Error('Unexpected retired execution entry.');const bucket=path.join(retired,entry.name),bucketInfo=await lstat(bucket);if(bucketInfo.uid!==0||(bucketInfo.mode&0o777)!==0o700)throw new Error('Unsafe retired execution directory.');const receiptPath=path.join(bucket,'retirement.json'),bytes=await privateRead(receiptPath,16_384);if(!bytes)continue;let receipt;try{receipt=JSON.parse(bytes.toString('utf8'));}catch{throw new Error('Malformed local retirement receipt.');}if(receipt.schema!=='witnessops.cli.execution-retirement.v1'||receipt.executionId!==entry.name)throw new Error('Invalid local retirement receipt.');if(receipt.requestId===requestId)found.push(receipt);}if(found.length>1)throw new Error('Multiple retirement receipts match this pending request. Operator review is required.');return found[0]??null;}
export async function archiveRetiredExecution(base,executionId,serverReceipt,{root=ROOT,ownerUid=0}={}){
 if(!/^[a-f0-9-]{36}$/.test(executionId)||serverReceipt?.state!=='retired'||serverReceipt.id!==executionId||! /^[a-f0-9-]{36}$/.test(serverReceipt.requestId)||!Number.isFinite(Date.parse(serverReceipt.retiredAt))||! /^[a-f0-9-]{36}$/.test(serverReceipt.retiredBy??''))throw new Error('Invalid server retirement receipt.');
 const expectedBase=path.join(root,'staging','wops');if(!base.startsWith(expectedBase+'/')||path.dirname(base)!==expectedBase)throw new Error('Unsafe retained execution location.');
 const pendingSource=path.join(base,'pending.json'),attemptSource=path.join(base,executionId),retiredRoot=path.join(base,'retired'),bucket=path.join(retiredRoot,executionId),pendingDestination=path.join(bucket,'pending.json'),attemptDestination=path.join(bucket,executionId),receiptPath=path.join(bucket,'retirement.json');
 await privateDirectory(base,ownerUid);await privateDirectory(retiredRoot,ownerUid);await privateDirectory(bucket,ownerUid);
 for(const entry of await readdir(bucket)){
  if(![executionId,'pending.json','retirement.json','retirement.json.new'].includes(entry))throw new Error('Unexpected retained retirement entry.');
  if(entry==='retirement.json.new'){const temporaryInfo=await lstat(path.join(bucket,entry));if(!temporaryInfo.isFile()||temporaryInfo.isSymbolicLink()||temporaryInfo.uid!==ownerUid||(temporaryInfo.mode&0o777)!==0o600||temporaryInfo.size>16_384)throw new Error('Unsafe temporary retirement receipt.');}
 }
 const pendingBytes=await privateRead(pendingSource,65_536,ownerUid)??await privateRead(pendingDestination,65_536,ownerUid);if(!pendingBytes)throw new Error('Retained pending journal is missing.');
 let journal;try{journal=JSON.parse(pendingBytes.toString('utf8'));}catch{throw new Error('Retained pending journal is malformed.');}
 if(journal?.request?.requestId!==serverReceipt.requestId||journal.captureDigest)throw new Error('Retained pending journal does not match the retired execution.');
 const pendingHash=createHash('sha256').update(pendingBytes).digest('hex');
 const sourceExists=await lstat(attemptSource).then(()=>true).catch(error=>error.code==='ENOENT'?false:Promise.reject(error));
 const destinationExists=await lstat(attemptDestination).then(()=>true).catch(error=>error.code==='ENOENT'?false:Promise.reject(error));
 if(sourceExists&&destinationExists)throw new Error('Both active and retired execution directories exist.');
 const evidenceDir=sourceExists?attemptSource:destinationExists?attemptDestination:null;if(!evidenceDir)throw new Error('Retained execution directory is missing.');
 const evidenceInfo=await lstat(evidenceDir);if(!evidenceInfo.isDirectory()||evidenceInfo.isSymbolicLink()||evidenceInfo.uid!==ownerUid||(evidenceInfo.mode&0o777)!==0o700)throw new Error('Unsafe retained execution directory.');
 await privateTree(evidenceDir,ownerUid);if(await privateRead(path.join(evidenceDir,'capture.json'),65_536,ownerUid))throw new Error('A local capture exists; retirement archive refused.');
 const authorityHash=await treeAuthorityDigest(evidenceDir,ownerUid),receipt={schema:'witnessops.cli.execution-retirement.v1',executionId,requestId:serverReceipt.requestId,retiredAt:serverReceipt.retiredAt,retiredBy:serverReceipt.retiredBy,pendingSha256:pendingHash,authoritySha256:authorityHash};
 const existingReceipt=await privateRead(receiptPath,16_384,ownerUid);
 if(existingReceipt){let parsed;try{parsed=JSON.parse(existingReceipt.toString('utf8'));}catch{throw new Error('Malformed local retirement receipt.');}if(JSON.stringify(parsed)!==JSON.stringify(receipt))throw new Error('Existing local retirement receipt differs.');const temporary=receiptPath+'.new',temporaryInfo=await lstat(temporary).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));if(temporaryInfo){if(!temporaryInfo.isFile()||temporaryInfo.isSymbolicLink()||temporaryInfo.uid!==ownerUid||(temporaryInfo.mode&0o777)!==0o600||temporaryInfo.size>16_384)throw new Error('Unsafe temporary retirement receipt.');await unlink(temporary);await syncDirectory(bucket);}}
 else{
  const temporary=receiptPath+'.new',expected=Buffer.from(JSON.stringify(receipt));
  const temporaryInfo=await lstat(temporary).catch(error=>error.code==='ENOENT'?null:Promise.reject(error));
  if(temporaryInfo){
   if(!temporaryInfo.isFile()||temporaryInfo.isSymbolicLink()||temporaryInfo.uid!==ownerUid||(temporaryInfo.mode&0o777)!==0o600||temporaryInfo.size>16_384)throw new Error('Unsafe temporary retirement receipt.');
   const interrupted=await privateRead(temporary,16_384,ownerUid);
   if(interrupted?.equals(expected)){await rename(temporary,receiptPath);await syncDirectory(bucket);}
   else await unlink(temporary);
  }
  if(!await privateRead(receiptPath,16_384,ownerUid)){
   const fd=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await fd.writeFile(expected);await fd.sync();}finally{await fd.close();}await rename(temporary,receiptPath);await syncDirectory(bucket);
  }
 }
 const pendingSourceExists=await lstat(pendingSource).then(()=>true).catch(error=>error.code==='ENOENT'?false:Promise.reject(error));
 const pendingDestinationExists=await lstat(pendingDestination).then(()=>true).catch(error=>error.code==='ENOENT'?false:Promise.reject(error));
 if(pendingSourceExists&&pendingDestinationExists)throw new Error('Both active and retired pending journals exist.');
 // Move the attempt first. If interrupted, pending.json remains in the active
 // namespace so the next ordinary invocation can find the receipt and finish
 // archival instead of silently starting a new request.
 if(sourceExists)await rename(attemptSource,attemptDestination);
 if(pendingSourceExists)await rename(pendingSource,pendingDestination);else if(!pendingDestinationExists)throw new Error('Retained pending journal disappeared during retirement.');
 await syncDirectory(base);await syncDirectory(bucket);await syncDirectory(retiredRoot);
 const finalPending=await privateRead(pendingDestination,65_536,ownerUid),finalAuthority=await treeAuthorityDigest(attemptDestination,ownerUid);
 if(!finalPending||createHash('sha256').update(finalPending).digest('hex')!==pendingHash||finalAuthority!==authorityHash)throw new Error('Retained evidence changed during retirement archival.');
 return path.relative(base,bucket);
}
const CAPTURE_OUTPUT_LIMIT=16_384;
const DIAGNOSTIC_EXCERPT_LIMIT=512;
export function boundedCaptureDiagnostic(error,{timestamp=new Date().toISOString(),reference}={}){
 const stdout=String(error?.stdout??''),stderr=String(error?.stderr??'');
 const outputLimit=error?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
 const timeout=Boolean(error?.code==='ETIMEDOUT'||(error?.killed&&!outputLimit));
 const category=timeout?'producer_timeout':outputLimit?'producer_output_limit':Number.isInteger(error?.code)?'producer_exit_nonzero':'producer_execution_error';
 const excerpt=(stderr||stdout).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g,' ').replace(/\s+/g,' ').replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]').replace(/\b[A-Za-z0-9_-]{43}\b/g,'[REDACTED]').replace(/\b(authorization|credential|token|password|secret|private[_ -]?key)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]').slice(0,DIAGNOSTIC_EXCERPT_LIMIT);
 return {schema:'witnessops.cli.capture-failure.v1',timestamp,category,exitCode:Number.isInteger(error?.code)?error.code:null,signal:typeof error?.signal==='string'?error.signal:null,timeout,stdoutTruncated:stdout.length>=CAPTURE_OUTPUT_LIMIT,stderrTruncated:stderr.length>=CAPTURE_OUTPUT_LIMIT,excerpt:excerpt||null,...(reference?{reference}:{})};
}
export async function capture(authority,dir,{run=exec,now=()=>new Date()}={}){
 const authorityFile=path.join(dir,'authority.json');await privateWrite(authorityFile,JSON.stringify(authority));
 try{await run(PYTHON,['-I','-m','witnessops_local_audit.operator','audit','capture','--authority',authorityFile,'--operator-id',authority.operator_id,'--live-approved','--output',dir],{env:environment,timeout:180_000,maxBuffer:CAPTURE_OUTPUT_LIMIT});}
 catch(error){
  const diagnosticFile=path.join(dir,'collection-failure.json');
  const diagnostic=boundedCaptureDiagnostic(error,{timestamp:now().toISOString(),reference:diagnosticFile});
  try{await privateWrite(diagnosticFile,JSON.stringify(diagnostic));}catch{throw new Error(`Collection failed (${diagnostic.category}). No Proofpack was issued. The local diagnostic could not be saved; operator review of retained state is required before another capture.`);}
  throw new Error(`Collection failed (${diagnostic.category}). No Proofpack was issued. Review retained local diagnostic: ${diagnosticFile}. Do not retry collection until the retained state is reviewed.`);
 }
}
export async function lock(dir,action){const file=path.join(dir,'check.lock');let fd;try{fd=await open(file,'wx',0o600);}catch{throw new Error('Another check may be running. Ask the operator to review a stale check.lock before retrying.');}try{return await action();}finally{await fd.close();await unlink(file);}}
