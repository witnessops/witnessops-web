import { cp, lstat, mkdir, rm } from 'node:fs/promises';

const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const current = await lstat(output).catch(error => {
  if (error.code !== 'ENOENT') throw error;
});
if (current?.isSymbolicLink()) throw new Error('Refusing to replace a linked build directory.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true, dereference: false });
console.log('Academy static build ready.');
