import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pinnedRegistryInput } from '../../../../witnessops-web/src/lib/proofpack/pinned-registry';
import { CliError } from '../db/cli-auth';
const exec = promisify(execFile);
export const MAX_CAPTURE = 25 * 1024 * 1024;
export type CaptureMetadata = {authority: unknown; hostname: string; collectorHash: string};
export interface Finalizer {
  preflight(): Promise<string>;
  reconcileCapture(id: string, bytes: Buffer): Promise<void>;
  validate(id: string, bytes: Buffer): Promise<CaptureMetadata>;
  finalize(id: string, bytes: Buffer): Promise<{zipName: string; zip: Buffer; signature: Buffer}>;
}
/** Only operator-side configuration. No registry, key, command or path comes from a request. */
export class LocalAuditFinalizer implements Finalizer {
  constructor(private config = {
    python: process.env.WITNESSOPS_FINALIZER_PYTHON ?? '',
    key: process.env.WITNESSOPS_FINALIZER_KEY ?? '',
    signer: process.env.WITNESSOPS_FINALIZER_SIGNER ?? '',
    root: process.env.WITNESSOPS_FINALIZER_DIRECTORY ?? '',
  }) {}
  private async directory(id: string) {
    if (!/^(preflight|[a-f0-9-]{36})$/.test(id) || !Object.values(this.config).every(Boolean)) throw new CliError('finalizer_unavailable',503);
    for (const value of [this.config.python,this.config.key,this.config.root]) if (!path.isAbsolute(value)) throw new CliError('finalizer_unavailable',503);
    const root = await lstat(this.config.root);
    if (!root.isDirectory() || root.isSymbolicLink() || root.uid !== process.getuid!() || (root.mode & 0o077)) throw new CliError('finalizer_unavailable',503);
    if (await realpath(this.config.root) !== this.config.root) throw new CliError('finalizer_unavailable',503);
    const dir = path.join(this.config.root,id);
    await mkdir(dir,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
    const stat=await lstat(dir); if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==root.uid||(stat.mode&0o077))throw new CliError('finalizer_unavailable',503);
    await this.preserve(path.join(dir,'registry.json'),Buffer.from(pinnedRegistryInput().bytes));
    return dir;
  }
  /** Read-only legacy identity check; never establishes or releases a charge. */
  async reconcileCapture(id:string,bytes:Buffer) {
    if(!/^[a-f0-9-]{36}$/.test(id)||!path.isAbsolute(this.config.root))throw new CliError('finalizer_unavailable',503);
    const root=await lstat(this.config.root);
    if(!root.isDirectory()||root.isSymbolicLink()||root.uid!==process.getuid!()||(root.mode&0o077)||await realpath(this.config.root)!==this.config.root)throw new CliError('finalizer_unavailable',503);
    const dir=path.join(this.config.root,id);
    try {
      const ds=await lstat(dir);
      if(!ds.isDirectory()||ds.isSymbolicLink()||ds.uid!==root.uid||(ds.mode&0o077))throw new CliError('custody_mismatch',409);
      const file=await open(path.join(dir,'capture.json'),constants.O_RDONLY|constants.O_NOFOLLOW);
      try {
        const fs=await file.stat();
        if(!fs.isFile()||fs.uid!==root.uid||(fs.mode&0o077)||fs.size!==bytes.length||!bytes.equals(await file.readFile()))throw new CliError('custody_mismatch',409);
      }finally{await file.close();}
    }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  private async preserve(file: string, bytes: Buffer) {
    try { const fd=await open(file,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);try{await fd.writeFile(bytes);await fd.sync();}finally{await fd.close();} }
    catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)||!bytes.equals(await readFile(file)))throw new CliError('custody_mismatch',409);}
  }
  private async call(mode:string,dir:string) {
    try {
      const result=await exec(this.config.python,['-I',path.resolve('scripts/server-check-finalize.py'),mode,dir,this.config.key,this.config.signer],{timeout:120_000,maxBuffer:64*1024,env:{PATH:'/usr/bin:/bin',LANG:'C.UTF-8',NODE_ENV:'production'},windowsHide:true});
      return JSON.parse(result.stdout);
    } catch {throw new CliError(mode==='validate'?'invalid_capture':'finalization_failed',422);}
  }
  async preflight(){const value=await this.call('preflight',await this.directory('preflight'));if(!/^[a-f0-9]{64}$/.test(value.collectorHash))throw new CliError('finalizer_unavailable',503);return value.collectorHash as string;}
  async validate(id:string,bytes:Buffer){if(!bytes.length||bytes.length>MAX_CAPTURE)throw new CliError('invalid_capture',413);const dir=await this.directory(id);await this.preserve(path.join(dir,'capture.json'),bytes);return await this.call('validate',dir) as CaptureMetadata;}
  async finalize(id:string,bytes:Buffer){await this.validate(id,bytes);const dir=await this.directory(id),value=await this.call('finalize',dir);if(!/^proofpack-[a-zA-Z0-9_-]+\.zip$/.test(value.zipName))throw new CliError('finalization_failed',422);return {zipName:value.zipName,zip:await readFile(path.join(dir,value.zipName)),signature:await readFile(path.join(dir,value.zipName+'.sig.json'))};}
}
