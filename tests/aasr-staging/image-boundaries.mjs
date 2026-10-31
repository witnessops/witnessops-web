/** Local, offline acceptance of already-built immutable images. No builds,
 * registries, published ports, real credentials or hosted WorkOS acceptance. */
import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const stagingOrigin = 'https://staging.example.test';
const stagingClient = 'client_aasr_staging_test';
const stagingDatabase = 'postgres://app_runtime_staging:unused@db-staging:5432/aasr_staging';
const workspace = '11000000-0000-4000-8000-000000000001';
const usage = 'node tests/aasr-staging/image-boundaries.mjs [--engine /usr/bin/podman] --standard sha256:IMAGE_ID --staging sha256:IMAGE_ID';
const imageId = value => typeof value === 'string' && /^(?:sha256:)?[a-f0-9]{64}$/.test(value);
const normalizedId = value => value.replace(/^sha256:/, '');

function argumentsFor(argv) {
  const options = { engine: 'podman' };
  if (argv.length === 1 && argv[0] === '--help') return null;
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.slice(2), value = argv[index + 1];
    if (!['engine', 'standard', 'staging'].includes(key) || !argv[index].startsWith('--') || !value ||
        (key !== 'engine' && Object.hasOwn(options, key)) || (key === 'engine' && index !== argv.indexOf('--engine'))) throw new Error('Invalid CLI arguments.');
    options[key] = value;
  }
  if (!imageId(options.standard) || !imageId(options.staging) || normalizedId(options.standard) === normalizedId(options.staging)) {
    throw new Error('Supply two distinct local immutable image IDs; tags and registry references are refused.');
  }
  if (!['podman', 'docker'].includes(basename(options.engine))) throw new Error('Select the local podman or docker executable.');
  return options;
}

// The HTTP client runs INSIDE the isolated container. It never follows redirects.
// Raw bodies/cookies stay in process memory and are never printed by the runner.
const httpProbe = String.raw`
const http = require('node:http');
const input = JSON.parse(process.argv[1]);
const request = http.request({ hostname:'127.0.0.1', port:3020, path:input.path,
  method:input.method || 'GET', headers:input.headers, timeout:2500 }, response => {
  const chunks=[]; let size=0;
  response.on('data', chunk => { size+=chunk.length; if(size>2097152) request.destroy(new Error('response limit')); else chunks.push(chunk); });
  response.on('end', () => process.stdout.write(JSON.stringify({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('utf8')})));
});
request.on('timeout', () => request.destroy(new Error('timeout')));
request.on('error', () => { process.exitCode=2; });
request.end(input.body);
`;

function execute(command, args, env, timeoutMs = 15_000) {
  return new Promise(resolve => {
    let stdout = '', settled = false;
    const finish = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'ignore'] });
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish({ status: -1, stdout: '' }); }, timeoutMs);
    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8');
      if (stdout.length > 3_000_000) { child.kill('SIGKILL'); finish({ status: -1, stdout: '' }); }
    });
    child.on('error', () => finish({ status: -1, stdout: '' }));
    child.on('close', code => finish({ status: code ?? -1, stdout }));
  });
}

function headers(origin, extra = {}) {
  return { host: new URL(origin).host, 'x-forwarded-host': new URL(origin).host, 'x-forwarded-proto': 'https',
    origin, 'sec-fetch-site': 'same-origin', 'x-witnessops-workspace': workspace, ...extra };
}
function noAssignedData(response, label) {
  if (/northstar-followup-agent|crm\.contact\.update|"actorRole"|"allowedCommands"|"recipientReady"/.test(response.body)) {
    throw new Error(`${label}: refused response exposed engagement data.`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = argumentsFor(argv);
  if (!options) { process.stdout.write(usage + '\n'); return; }
  // Ignore host CLI variables that could redirect a local engine to another host.
  const engineEnv = { ...process.env };
  for (const key of ['CONTAINER_HOST', 'CONTAINER_CONNECTION', 'DOCKER_HOST', 'DOCKER_CONTEXT']) delete engineEnv[key];
  const prefix = basename(options.engine) === 'podman' ? ['--remote=false'] : ['--context', 'default'];
  const command = (args, timeout) => execute(options.engine, [...prefix, ...args], engineEnv, timeout);
  const directory = await mkdtemp(join(tmpdir(), 'aasr-image-boundaries-'));
  const containers = new Set(), checks = [];
  let interrupted = false, failure, cleanupFailure = false;
  const interrupt = () => { interrupted = true; };
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  const checkInterrupted = () => { if (interrupted) throw new Error('Local image acceptance interrupted.'); };
  const cookiePassword = randomBytes(32).toString('hex');
  const common = { NODE_ENV: 'production', HOSTNAME: '0.0.0.0', PORT: '3020',
    WORKOS_API_KEY: 'sk_test_disposable', WORKOS_COOKIE_PASSWORD: cookiePassword, WORKOS_COOKIE_SAMESITE: 'lax' };
  const standardEnv = { ...common, WORKOS_CLIENT_ID: 'client_local_image_test',
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'https://app.witnessops.com/callback', WITNESSOPS_APP_PROXY_MODE: 'caddy-loopback-v1' };
  const stagingEnv = { ...common, WORKOS_CLIENT_ID: stagingClient,
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${stagingOrigin}/callback`, DATABASE_URL: stagingDatabase,
    WITNESSOPS_DEPLOYMENT_ENV: 'staging', WITNESSOPS_AASR_FIXTURE: '1', WITNESSOPS_APP_PROXY_MODE: 'caddy-aasr-staging-v1' };
  const record = (label, detail) => { checks.push({ check: label, ...detail }); process.stdout.write(`PASS ${label}\n`); };
  async function start(image, environment) {
    checkInterrupted();
    const name = `aasr-boundary-${randomUUID()}`;
    const file = join(directory, `${name}.env`);
    await writeFile(file, Object.entries(environment).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
    // A unique name is retained before launch so an uncertain CLI result can
    // still be cleaned up without touching any pre-existing container.
    containers.add(name);
    const result = await command(['run', '--detach', '--pull=never', '--network=none', '--log-driver=none',
      '--cap-drop=ALL', '--security-opt=no-new-privileges', '--name', name, '--env-file', file, image], 30_000);
    if (result.status !== 0 || !/^[a-f0-9]{64}\s*$/.test(result.stdout)) throw new Error('Local isolated container launch failed.');
    const isolation = await command(['inspect', '--format', '{{json .HostConfig}}', name]);
    let config;
    try { config = JSON.parse(isolation.stdout); } catch { throw new Error('Container isolation could not be verified.'); }
    if (isolation.status !== 0 || config.NetworkMode !== 'none' || Object.keys(config.PortBindings || {}).length) {
      throw new Error('Container must have no network and no published ports.');
    }
    return name;
  }
  async function stop(name) {
    const result = await command(['rm', '--force', name]);
    if (result.status !== 0) throw new Error('Task-owned container cleanup failed.');
    containers.delete(name);
  }
  async function state(name) {
    const result = await command(['inspect', '--format', '{{json .State}}', name]);
    try {
      if (result.status !== 0) throw new Error();
      return JSON.parse(result.stdout);
    } catch { throw new Error('Task-owned container state could not be read.'); }
  }
  async function probe(name, input) {
    const result = await command(['exec', name, 'node', '-e', httpProbe, JSON.stringify(input)], 5_000);
    if (result.status !== 0) return null;
    try {
      const value = JSON.parse(result.stdout);
      if (!Number.isInteger(value.status) || typeof value.body !== 'string' || !value.headers) throw new Error();
      return value;
    } catch { throw new Error('Container HTTP probe returned invalid output.'); }
  }
  async function ready(name, origin) {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      checkInterrupted();
      if (!(await state(name)).Running) throw new Error('Expected image runtime exited before HTTP readiness.');
      if (await probe(name, { path: '/', headers: headers(origin) })) return;
      await delay(150);
    }
    throw new Error('Expected image runtime did not become HTTP-ready.');
  }
  async function expectStatus(name, label, input, expected) {
    checkInterrupted();
    const response = await probe(name, input);
    if (!response || response.status !== expected) throw new Error(`${label}: expected HTTP ${expected}, received ${response?.status ?? 'no response'}.`);
    noAssignedData(response, label);
    record(label, { status: response.status });
    return response;
  }
  async function rejectedStartup(label, patch) {
    const environment = { ...stagingEnv, ...patch };
    for (const key of Object.keys(environment)) if (environment[key] === undefined) delete environment[key];
    const name = await start(options.staging, environment);
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      checkInterrupted();
      const current = await state(name);
      if (!current.Running) {
        if (current.ExitCode !== 1) throw new Error(`${label}: expected startup refusal exit 1.`);
        record(label, { startup: 'refused', exitCode: 1 });
        await stop(name); return;
      }
      if (await probe(name, { path: '/', headers: headers(stagingOrigin) })) throw new Error(`${label}: invalid configuration served HTTP.`);
      await delay(100);
    }
    throw new Error(`${label}: invalid configuration did not exit before serving.`);
  }
  try {
    for (const kind of ['standard', 'staging']) {
      const result = await command(['image', 'inspect', '--format', '{{.Id}}', options[kind]]);
      const actual = result.stdout.trim();
      if (result.status !== 0 || !imageId(actual) || normalizedId(actual) !== normalizedId(options[kind])) throw new Error(`The supplied ${kind} image is not present locally at that immutable ID.`);
    }
    const databaseDigest = createHash('sha256').update(JSON.stringify({ hostname: 'db-staging', port: '5432', database: 'aasr_staging', username: 'app_runtime_staging' })).digest('hex');
    const hostile = { WITNESSOPS_AASR_FIXTURE: '1', WITNESSOPS_BUILD_PROFILE: 'aasr-staging', WITNESSOPS_DEPLOYMENT_ENV: 'staging',
      WITNESSOPS_COMPILED_BUILD_PROFILE: 'aasr-staging', WITNESSOPS_COMPILED_STAGING_ORIGIN: stagingOrigin,
      WITNESSOPS_COMPILED_STAGING_WORKOS_CLIENT_ID: stagingClient, WITNESSOPS_COMPILED_STAGING_DATABASE_SHA256: databaseDigest,
      WITNESSOPS_STAGING_BUILD_ORIGIN: stagingOrigin, WITNESSOPS_STAGING_BUILD_WORKOS_CLIENT_ID: stagingClient,
      WITNESSOPS_STAGING_BUILD_DATABASE_SHA256: databaseDigest };
    for (const [variant, patch] of [['flag-unset', {}], ['flag-enabled', { WITNESSOPS_AASR_FIXTURE: '1' }],
      ['hostile-profile', hostile], ['hostile-development', { ...hostile, NODE_ENV: 'development' }]]) {
      const name = await start(options.standard, { ...standardEnv, ...patch });
      await ready(name, 'https://app.witnessops.com');
      for (const [path, method] of [['/aasr-fixture', 'GET'], ['/aasr-fixture', 'POST'], ['/api/aasr-fixture', 'GET'], ['/api/aasr-fixture', 'POST']]) {
        await expectStatus(name, `standard/${variant}/${method}${path}`, { path, method,
          headers: headers('https://app.witnessops.com', { 'content-type': 'application/json' }),
          ...(method === 'POST' ? { body: JSON.stringify({ command: 'accept_scope', expectedRevision: 0 }) } : {}) }, 404);
      }
      await stop(name);
    }
    const name = await start(options.staging, stagingEnv);
    await ready(name, stagingOrigin);
    for (const path of ['/', '/aasr-fixture']) {
      const response = await expectStatus(name, `staging/signed-out${path}`, { path, headers: headers(stagingOrigin) }, 200);
      if (!response.body.includes('Sign in to AASR staging') || !response.body.includes('href="/login"') || !response.body.includes('Staging simulation')) throw new Error('Unauthenticated staging entry did not expose the native sign-in boundary.');
    }
    for (const method of ['GET', 'POST']) {
      const response = await expectStatus(name, `staging/unauthenticated-api/${method}`, { path: '/api/aasr-fixture', method,
        headers: headers(stagingOrigin, { 'content-type': 'application/json' }),
        ...(method === 'POST' ? { body: JSON.stringify({ command: 'accept_scope', expectedRevision: 0 }) } : {}) }, 401);
      if (!response.headers['cache-control']?.includes('no-store')) throw new Error('Unauthenticated fixture response must not be cached.');
    }
    for (const [path, method] of [['/api/runs', 'GET'], ['/api/runs', 'POST'], ['/api/members', 'GET'],
      ['/api/billing/webhook', 'POST'], ['/s', 'GET'], ['/signup', 'GET'], ['/api/cli/device/authorize', 'POST'],
      ['/api/shared-report', 'POST'], ['/api/app-help', 'POST']]) {
      await expectStatus(name, `staging/blocked/${method}${path}`, { path, method, headers: headers(stagingOrigin) }, 404);
    }
    for (const [label, patch] of [['wrong-host', { host: 'other.example.test' }], ['wrong-forwarded-host', { 'x-forwarded-host': 'other.example.test' }],
      ['wrong-forwarded-proto', { 'x-forwarded-proto': 'http' }], ['unexpected-forwarded', { forwarded: 'host=staging.example.test;proto=https' }]]) {
      await expectStatus(name, `staging/${label}`, { path: '/', headers: headers(stagingOrigin, patch) }, 403);
    }
    for (const method of ['GET', 'POST']) {
      await expectStatus(name, `staging/wrong-origin/${method}`, { path: '/api/aasr-fixture', method,
        headers: headers(stagingOrigin, { origin: 'https://other.example.test' }) }, 403);
    }
    const login = await probe(name, { path: '/login', headers: headers(stagingOrigin) });
    if (!login || ![302, 303, 307].includes(login.status)) throw new Error('Native login did not produce a redirect.');
    let location;
    try { location = new URL(login.headers.location); } catch { throw new Error('Native login redirect was missing.'); }
    if (location.origin !== 'https://api.workos.com' || location.pathname !== '/user_management/authorize' ||
      location.searchParams.get('client_id') !== stagingClient || location.searchParams.get('redirect_uri') !== `${stagingOrigin}/callback` ||
      !location.searchParams.get('state') || !location.searchParams.get('code_challenge')) throw new Error('Native login redirect did not retain its reviewed binding and PKCE state.');
    if (!(login.headers['set-cookie'] || []).some(value => /httponly/i.test(value) && /samesite=lax/i.test(value) && /secure/i.test(value))) throw new Error('Native login did not set a protected state cookie.');
    record('staging/native-login-redirect-not-followed', { status: login.status });
    await expectStatus(name, 'staging/invalid-callback-state', { path: '/callback?code=not-issued&state=invalid',
      headers: headers(stagingOrigin, { 'sec-fetch-site': 'cross-site' }) }, 400);
    await stop(name);
    for (const [label, patch] of [
      ['wrong-callback-origin', { NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'https://other.example.test/callback' }],
      ['wrong-client', { WORKOS_CLIENT_ID: 'client_wrong' }],
      ['wrong-database-target', { DATABASE_URL: 'postgres://app_runtime_staging:unused@db-staging:5432/other_staging' }],
      ['missing-staging-marker', { WITNESSOPS_DEPLOYMENT_ENV: undefined }],
      ['production-marker', { WITNESSOPS_DEPLOYMENT_ENV: 'production' }],
      ['fixture-disabled', { WITNESSOPS_AASR_FIXTURE: '0' }],
      ['wrong-proxy-mode', { WITNESSOPS_APP_PROXY_MODE: 'caddy-loopback-v1' }],
      ['development-runtime', { NODE_ENV: 'development' }],
      ['extra-provider-credential', { OPENAI_API_KEY: 'disposable-forbidden' }],
      ['enabled-provider-feature', { WITNESSOPS_APP_HELP_ENABLED: '1' }],
    ]) await rejectedStartup(`staging/startup/${label}`, patch);
  } catch (error) { failure = error; }
  finally {
    for (const name of containers) {
      const result = await command(['rm', '--force', name]);
      if (result.status !== 0) { cleanupFailure = true; process.stderr.write(`Cleanup required for task-owned container ${name}.\n`); }
    }
    try { await rm(directory, { recursive: true, force: true }); }
    catch { cleanupFailure = true; process.stderr.write('Private task credential directory cleanup failed.\n'); }
    process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  }
  if (failure) throw failure;
  if (cleanupFailure) throw new Error('Local image acceptance cleanup was incomplete.');
  if (interrupted) throw new Error('Local image acceptance interrupted.');
  process.stdout.write(JSON.stringify({ status: 'passed', standardImage: options.standard, stagingImage: options.staging,
    checks: checks.length, containersRemoved: true, privateCredentialsRemoved: true,
    boundary: 'Actual local image HTTP and startup refusal only; network disabled, no hosted authentication or deployment proof.' }) + '\n');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    // All thrown messages above are bounded descriptions, never raw command,
    // provider, environment, redirect, response-body or cookie diagnostics.
    process.stderr.write(`Image boundary acceptance failed: ${error instanceof Error ? error.message : 'unknown failure'}\n`);
    process.exitCode = 1;
  });
}
