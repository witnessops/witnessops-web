// Transport and readback only. Never builds, installs or executes the candidate.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { verify, sha } from './evidence.mjs';
export function transport(binary) { return args => execFileSync(binary,args,{maxBuffer:64*1024*1024}); }
export function readback(reg, ref, expected) {
  const raw=reg(['manifest','get',ref,'--format','raw-body']);
  assert.equal(`sha256:${sha(raw)}`,expected.manifest_digest,'registry manifest mismatch');
  const manifest=JSON.parse(raw);
  assert.equal(manifest.config.digest,expected.config_digest,'registry config descriptor mismatch');
  const config=reg(['blob','get',ref.split('@')[0].replace(/:[^/:]+$/,''),expected.config_digest]);
  assert.equal(`sha256:${sha(config)}`,expected.config_digest,'registry config bytes mismatch');
  assert.equal(config.length,manifest.config.size,'registry config size mismatch');
  const parsed=JSON.parse(config);
  assert.equal(parsed.os,'linux'); assert.equal(parsed.architecture,'amd64');
  assert.equal(reg(['image','digest',ref]).toString().trim(),expected.manifest_digest,'registry reference mismatch');
}
export function publish(mode,dir,env,reg=transport(env.REGCTL)) {
  assert.ok(['stage','promote'].includes(mode));
  const accepted=verify(dir,env); // Always before any registry write.
  const repo=env.IMAGE_REPOSITORY;
  assert.equal(repo,`ghcr.io/${env.GITHUB_REPOSITORY.toLowerCase()}`,'unexpected registry repository');
  const candidate=`${repo}:candidate-${accepted.run_id}-${accepted.run_attempt}-${accepted.source_commit}`;
  const receipt={mode,candidate,manifest_digest:accepted.manifest_digest,config_digest:accepted.config_digest,
    attempted:[],verified:[],status:'started',residual_artifacts:'Do not delete automatically; attempted references may exist even on failure.'};
  mkdirSync(env.RECEIPT_DIR,{recursive:true});
  const save=()=>writeFileSync(join(env.RECEIPT_DIR,`registry-${mode}.json`),JSON.stringify(receipt,null,2)+'\n');
  save();
  try {
    if (mode==='stage') {
      receipt.attempted.push(candidate); save();
      reg(['image','import',candidate,join(dir,'witnessops-web-image.tar')]);
      readback(reg,candidate,accepted);
      receipt.verified.push(candidate);
      const outputs={digest:accepted.manifest_digest,image_ref:`${repo}@${accepted.manifest_digest}`};
      if (env.GITHUB_OUTPUT) for (const [k,v] of Object.entries(outputs)) appendFileSync(env.GITHUB_OUTPUT,`${k}=${v}\n`);
      for (const [file,value] of [['image-digest.txt',outputs.digest],['image-ref.txt',outputs.image_ref]]) writeFileSync(join(env.RECEIPT_DIR,file),value+'\n');
      writeFileSync(join(env.RECEIPT_DIR,'image-metadata.json'),JSON.stringify({'containerimage.digest':outputs.digest})+'\n');
    } else {
      // Recheck candidate immediately before promotion; workflow requires successful signing first.
      readback(reg,candidate,accepted);
      const tags=JSON.parse(env.CONSUMER_TAGS);
      assert.ok(Array.isArray(tags)&&tags.length>0);
      for(const tag of tags) assert.match(tag,/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/);
      for(const tag of tags) {
        const ref=`${repo}:${tag}`;receipt.attempted.push(ref);save();
        reg(['image','copy',`${repo}@${accepted.manifest_digest}`,ref]);
        readback(reg,ref,accepted);receipt.verified.push(ref);save();
      }
    }
    receipt.status='verified';save();return receipt;
  } catch(error) { receipt.status='failed';save();throw error; }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) publish(process.argv[2],process.argv[3],process.env);
