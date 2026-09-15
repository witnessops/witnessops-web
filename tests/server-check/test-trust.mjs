import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(process.env.NODE_ENV!=='test'||!process.env.WOPS_TEST_TRUST_FILE)throw new Error('Disposable test trust required');
const bytes=readFileSync(process.env.WOPS_TEST_TRUST_FILE);
export const LOCAL_AUDIT_TRUST={sha256:createHash('sha256').update(bytes).digest('hex')};
export const pinnedRegistryInput=()=>({name:'registry.json',bytes});
