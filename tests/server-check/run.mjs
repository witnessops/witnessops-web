// Isolated test database + disposable signing material. Never invokes live capture.
import {mkdtemp,realpath,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,isAbsolute} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const python=process.env.WOPS_TEST_PYTHON;
if(!python||!isAbsolute(python))throw new Error('Set WOPS_TEST_PYTHON to an existing isolated Python with the accepted Local Audit producer and cryptography 50.0.1. No packages are installed by this test.');
const base=await realpath(await mkdtemp(join(tmpdir(),'wops-server-tests-')));
try{
 await mkdir(join(base,'custody'),{mode:0o700});
 execFileSync(python,['-I','-c','import cryptography; assert cryptography.__version__ == "50.0.1"; from witnessops_local_audit.crypto import create_test_key_material; from pathlib import Path; import sys; create_test_key_material(Path(sys.argv[1]),Path(sys.argv[2]),"disposable_cli_test")',join(base,'key.hex'),join(base,'registry.json')],{stdio:'pipe'});
 const result=spawnSync(process.execPath,['--import','../witnessops-web/scripts/register-server-only-test-stub.mjs','--import','../../tests/server-check/register-test-trust.mjs','--import','tsx','--test','src/lib/db/server-check.integration.ts'],{stdio:'inherit',env:{...process.env,NODE_ENV:'test',WOPS_SERVER_TEST_DIRECTORY:base,WOPS_TEST_TRUST_FILE:join(base,'registry.json')}});
 process.exitCode=result.status??1;
}finally{await rm(base,{recursive:true,force:true});}
