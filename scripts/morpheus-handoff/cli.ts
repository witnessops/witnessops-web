import { constants, openSync, fstatSync, readSync, closeSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectHandoff, formatHuman, safeJSON, IntakeError, MAX_PACKET_BYTES } from './intake.ts';

type FileOps = {
  constants: { O_RDONLY: number; O_NOFOLLOW?: number; O_NONBLOCK?: number };
  openSync: typeof openSync;
  fstatSync: typeof fstatSync;
  readSync: typeof readSync;
  closeSync: typeof closeSync;
};
const defaultFileOps: FileOps = { constants, openSync, fstatSync, readSync, closeSync };

export function readPacket(file: string, fs: FileOps = defaultFileOps): Buffer {
  let fd: number|undefined;
  try {
    // Missing flags would otherwise be coerced to zero and allow a final symlink.
    const noFollow=fs.constants.O_NOFOLLOW;
    if(typeof noFollow!=='number')throw new IntakeError('FILE_UNAVAILABLE','/input');
    let flags=fs.constants.O_RDONLY|noFollow;
    if(typeof fs.constants.O_NONBLOCK==='number')flags|=fs.constants.O_NONBLOCK;
    // Nonblocking avoids waiting on FIFOs/devices. Only a bounded regular file is supported.
    fd=fs.openSync(file,flags);
    const before=fs.fstatSync(fd);
    if(!before.isFile() || before.size<1 || before.size>MAX_PACKET_BYTES)throw new IntakeError('FILE_PROFILE','/input');
    const buffer=Buffer.alloc(MAX_PACKET_BYTES+1);let offset=0;
    while(offset<buffer.length) {const count=fs.readSync(fd,buffer,offset,buffer.length-offset,null);if(!count)break;offset+=count;}
    const after=fs.fstatSync(fd);
    if(offset!==before.size || after.size!==before.size || after.mtimeMs!==before.mtimeMs || after.ctimeMs!==before.ctimeMs)throw new IntakeError('FILE_CHANGED','/input');
    return buffer.subarray(0,offset);
  } catch(error) {
    if(error instanceof IntakeError)throw error;
    throw new IntakeError('FILE_UNAVAILABLE','/input');
  } finally {if(fd!==undefined)fs.closeSync(fd);}
}
export function main(argv: string[]=process.argv.slice(2)): number {
  const args=[...argv];let json=false;
  if(args[0]==='--json'){json=true;args.shift();}
  if(args[0]==='--')args.shift();
  if(args.length!==1 || !isAbsolute(args[0]) || /[\u0000-\u001f\u007f]/.test(args[0])) {
    process.stderr.write('Usage: pnpm morpheus:handoff:inspect [--json] -- /absolute/path/to/handoff.json\n');return 2;
  }
  try {
    const intake=inspectHandoff(readPacket(args[0]));
    process.stdout.write(json?safeJSON(intake,2)+'\n':formatHuman(intake));return 0;
  } catch(error) {
    process.stderr.write(error instanceof IntakeError?`NOT ADMITTED: ${error.message}\n`:'NOT ADMITTED: INTERNAL_ERROR\n');return 1;
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=main();
