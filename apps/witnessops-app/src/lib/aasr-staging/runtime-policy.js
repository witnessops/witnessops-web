/* eslint-disable @typescript-eslint/no-require-imports -- Shared with the unbundled CommonJS image entrypoint. */
const { stagingDatabaseTargetDigest, validStagingOrigin } = require('./build-profile');

// Staging contains no provider-backed product operations or migration identity.
const disabledFlags = ['WITNESSOPS_FINALIZER_ENABLED', 'WITNESSOPS_APP_HELP_ENABLED', 'WITNESSOPS_REPORT_EMAIL_ENABLED', 'WITNESSOPS_BILLING_SANDBOX'];
const forbiddenSettings = ['DATABASE_MIGRATION_URL', 'TEST_DATABASE_URL', 'WITNESSOPS_APP_BROWSER_TEST', 'WITNESSOPS_MAIL_PROVIDER',
  'WITNESSOPS_FREE_WORKSPACE_LIMIT', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'RESEND_API_KEY',
  'WITNESSOPS_REPORT_HOST_SUFFIX', 'WITNESSOPS_REPORT_PROXY_MODE', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'WITNESSOPS_RESEND_API_KEY', 'WITNESSOPS_FINALIZER_KEY', 'WITNESSOPS_FINALIZER_DIRECTORY', 'WORKOS_API_HOSTNAME',
  'WORKOS_API_PORT', 'WORKOS_API_HTTPS', 'WORKOS_CLAIM_TOKEN', 'WORKOS_COOKIE_NAME'];

/** Shared by the sealed artifact entrypoint and app middleware; no identity bypass. */
function stagingRuntimeMatches(build, env = process.env) {
  if (build.profile !== 'aasr-staging' || !validStagingOrigin(build.origin) ||
      !/^client_[a-zA-Z0-9_]+$/.test(build.workosClientId) || !/^[a-f0-9]{64}$/.test(build.databaseSha256)) return false;
  if (env.NODE_ENV !== 'production' || env.WITNESSOPS_DEPLOYMENT_ENV !== 'staging' || env.WITNESSOPS_AASR_FIXTURE !== '1' ||
      env.WITNESSOPS_APP_PROXY_MODE !== 'caddy-aasr-staging-v1' || env.HOSTNAME !== '0.0.0.0' || env.PORT !== '3020') return false;
  if (env.NEXT_PUBLIC_WORKOS_REDIRECT_URI !== `${build.origin}/callback` || env.WORKOS_CLIENT_ID !== build.workosClientId ||
      !/^sk_test_[A-Za-z0-9_-]+$/.test(env.WORKOS_API_KEY || '') || (env.WORKOS_COOKIE_PASSWORD?.length || 0) < 32 ||
      env.WORKOS_COOKIE_DOMAIN || env.WORKOS_COOKIE_SAMESITE !== 'lax') return false;
  if (disabledFlags.some(key => env[key] && env[key] !== '0') || forbiddenSettings.some(key => Boolean(env[key])) ||
      Object.keys(env).some(key => key.startsWith('WITNESSOPS_M365_') && env[key])) return false;
  try { return stagingDatabaseTargetDigest(env.DATABASE_URL || '') === build.databaseSha256; }
  catch { return false; }
}

module.exports = { stagingRuntimeMatches };
