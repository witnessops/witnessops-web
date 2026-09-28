import {execFile} from 'node:child_process';
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
export async function privateDirectory(dir){await mkdir(dir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});const s=await lstat(dir);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&0o777)!==0o700)throw new Error('Unsafe capture directory.');}
export async function privateRead(file,max=25*1024*1024){let fd;try{fd=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=await fd.stat();if(!s.isFile()||s.uid!==0||(s.mode&0o777)!==0o600||s.size>max)throw new Error('Unsafe capture file.');return await fd.readFile();}catch(e){if(e.code==='ENOENT')return null;throw e;}finally{await fd?.close();}}
export async function privateWrite(file,bytes){const temp=file+'.new';const fd=await open(temp,'wx',0o600);try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();}await rename(temp,file);}
const CAPTURE_OUTPUT_LIMIT=16_384;
const DIAGNOSTIC_EXCERPT_LIMIT=512;
export function boundedCaptureDiagnostic(error,{timestamp=new Date().toISOString(),reference}={}){
 const stdout=String(error?.stdout??''),stderr=String(error?.stderr??'');
 const outputLimit=error?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
 const timeout=Boolean(error?.code==='ETIMEDOUT'||(error?.killed&& !outputLimit)||(error?.signal==='SIGTERM'&&!outputLimit));
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
