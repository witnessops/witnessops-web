import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
if(process.env.NODE_ENV!=='test')throw new Error('Test-only trust module');
const bytes=readFileSync(new URL('./registry.json',import.meta.url));
export const LOCAL_AUDIT_TRUST=Object.freeze({sha256:createHash('sha256').update(bytes).digest('hex')});
export function pinnedRegistryInput(){return {name:'disposable-test-registry.json',bytes:new Uint8Array(bytes)}}
