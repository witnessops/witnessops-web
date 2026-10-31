/* eslint-disable @typescript-eslint/no-require-imports -- Shared by CommonJS Next config and the unbundled image entrypoint. */
const { createHash } = require('node:crypto');

/** Canonical non-secret database target. Password rotation does not change it. */
function stagingDatabaseTargetDigest(connection) {
  const url = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.search || url.hash) {
    throw new Error('A dedicated staging database URL is required.');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const username = decodeURIComponent(url.username);
  if (!/^[a-z][a-z0-9_]*_staging$/.test(database) || !/^[a-z][a-z0-9_]*_staging$/.test(username)) {
    throw new Error('The staging database and runtime role must have staging-specific names.');
  }
  return createHash('sha256').update(JSON.stringify({ hostname: url.hostname, port: url.port || '5432', database, username })).digest('hex');
}

function validStagingOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.origin === origin && !url.username && !url.password && !url.port &&
      /^(staging[.-]|[a-z0-9-]+\.staging\.)/.test(url.hostname) && url.hostname !== 'app.witnessops.com';
  } catch { return false; }
}

/** Called only by the build configuration. Never read these build inputs at runtime. */
function aasrBuildProfile(env = process.env) {
  const profile = env.WITNESSOPS_BUILD_PROFILE || 'standard';
  if (profile === 'standard') return { profile, origin: '', workosClientId: '', databaseSha256: '' };
  if (profile !== 'aasr-staging') throw new Error('Unknown app build profile.');
  const origin = env.WITNESSOPS_STAGING_BUILD_ORIGIN || '';
  const workosClientId = env.WITNESSOPS_STAGING_BUILD_WORKOS_CLIENT_ID || '';
  const databaseSha256 = env.WITNESSOPS_STAGING_BUILD_DATABASE_SHA256 || '';
  if (!validStagingOrigin(origin) || !/^client_[a-zA-Z0-9_]+$/.test(workosClientId) || !/^[a-f0-9]{64}$/.test(databaseSha256)) {
    throw new Error('Reviewed non-secret staging build bindings are required.');
  }
  if (env.NEXT_PUBLIC_WORKOS_REDIRECT_URI !== `${origin}/callback`) throw new Error('Staging build callback must match its bound origin.');
  if (env.WITNESSOPS_APP_BROWSER_TEST) throw new Error('A hosted staging artifact cannot use the browser-fixture build.');
  return { profile, origin, workosClientId, databaseSha256 };
}

module.exports = { aasrBuildProfile, stagingDatabaseTargetDigest, validStagingOrigin };
