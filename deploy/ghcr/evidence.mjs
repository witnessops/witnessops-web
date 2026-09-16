import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { validateTrivyImage } from '../aws/validate-trivy-image.mjs';
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = /^[0-9a-f]{64}$/;
const digest = /^sha256:[0-9a-f]{64}$/;
export function context(env) {
  for (const key of ['SOURCE_COMMIT', 'BUILD_SOURCE_COMMIT', 'GATE_SOURCE_COMMIT', 'GITHUB_WORKFLOW_SHA']) assert.match(env[key] ?? '', /^[0-9a-f]{40}$/, key);
  assert.equal(env.SOURCE_COMMIT, env.BUILD_SOURCE_COMMIT, 'build source mismatch');
  assert.equal(env.SOURCE_COMMIT, env.GATE_SOURCE_COMMIT, 'dependency source mismatch');
  assert.match(env.GITHUB_REPOSITORY ?? '', /^[\w.-]+\/[\w.-]+$/);
  assert.ok(env.GITHUB_WORKFLOW_REF?.startsWith(`${env.GITHUB_REPOSITORY}/.github/workflows/`), 'workflow identity');
  for (const key of ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT']) assert.match(env[key] ?? '', /^[1-9][0-9]*$/, key);
  assert.equal(env.BUILD_RUN_ID, env.GITHUB_RUN_ID, 'cross-run build');
  assert.equal(env.BUILD_RUN_ATTEMPT, env.GITHUB_RUN_ATTEMPT, 'cross-attempt build: rerun all jobs');
  return { repository: env.GITHUB_REPOSITORY, workflow_ref: env.GITHUB_WORKFLOW_REF, workflow_sha: env.GITHUB_WORKFLOW_SHA,
    source_commit: env.SOURCE_COMMIT, run_id: env.GITHUB_RUN_ID, run_attempt: env.GITHUB_RUN_ATTEMPT };
}
export function inspect(archive) {
  return JSON.parse(execFileSync('python3', [fileURLToPath(new URL('../aws/inspect-oci-image.py', import.meta.url)), archive], {encoding:'utf8'}));
}
export function candidate(dir, env) {
  const ctx = context(env);
  const archive = join(dir, 'witnessops-web-image.tar');
  assert.match(env.EXPECTED_IMAGE_ARCHIVE_SHA256 ?? '', hex);
  assert.equal(sha(readFileSync(archive)), env.EXPECTED_IMAGE_ARCHIVE_SHA256, 'archive hash mismatch');
  const identity = inspect(archive);
  for (const [field,key] of [['image_digest','EXPECTED_MANIFEST_DIGEST'],['config_digest','EXPECTED_CONFIG_DIGEST']]) {
    assert.match(env[key] ?? '', digest); assert.equal(identity[field], env[key], field);
  }
  return {...ctx, os:'linux', architecture:'amd64', archive_sha256:env.EXPECTED_IMAGE_ARCHIVE_SHA256,
    manifest_digest:identity.image_digest, config_digest:identity.config_digest};
}
export function evidence(dir, env) {
  const base = candidate(dir, env);
  const bytes = readFileSync(join(dir,'trivy.json'));
  const report = JSON.parse(bytes);
  const counts = validateTrivyImage(report, base.config_digest);
  assert.match(report.Trivy?.Version ?? '', /^\d+\.\d+\.\d+$/,'scanner version missing');
  assert.ok(typeof report.CreatedAt === 'string' && Number.isFinite(Date.parse(report.CreatedAt)), 'scan time missing');
  return {...base, report_sha256:sha(bytes), scanner:{version:report.Trivy.Version, scan_time:report.CreatedAt,
    database_metadata:report.Trivy.VulnerabilityDB ?? report.Trivy.DB ?? null},
    policy:'deploy/aws/validate-trivy-image.mjs:critical-high-v1', counts};
}
export function verify(dir, env) {
  assert.equal(env.VERIFIER_RESULT, 'success', 'verifier must succeed');
  for (const key of ['EXPECTED_BINDING_SHA256','EXPECTED_REPORT_SHA256']) assert.match(env[key] ?? '',hex,key);
  const bytes=readFileSync(join(dir,'binding.json'));
  assert.equal(sha(bytes),env.EXPECTED_BINDING_SHA256,'binding hash mismatch');
  const actual=evidence(dir,env);
  assert.equal(actual.report_sha256,env.EXPECTED_REPORT_SHA256,'report hash mismatch');
  assert.deepEqual(JSON.parse(bytes),actual,'binding differs from original evidence/context');
  return actual;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode,dir]=process.argv.slice(2);
  if (mode==='candidate') candidate(dir,process.env);
  else if (mode==='verify') verify(dir,process.env);
  else if (mode==='bind') {
    const binding=evidence(dir,process.env), bytes=JSON.stringify(binding,null,2)+'\n';
    writeFileSync(join(dir,'binding.json'),bytes);
    for (const [k,v] of Object.entries({image_archive_sha256:binding.archive_sha256,manifest_digest:binding.manifest_digest,
      config_digest:binding.config_digest,report_sha256:binding.report_sha256,binding_sha256:sha(bytes)})) appendFileSync(process.env.GITHUB_OUTPUT,`${k}=${v}\n`);
  } else throw new Error('expected candidate, bind or verify');
}
