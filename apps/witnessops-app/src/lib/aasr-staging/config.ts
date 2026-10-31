import 'server-only';
import { stagingRuntimeMatches } from './runtime-policy';
export { stagingDatabaseTargetDigest } from './build-profile';

// Next replaces these exact accesses with literals from next.config.js. The
// runtime environment cannot select a build profile or replace its bindings.
const build = Object.freeze({
  profile: process.env.WITNESSOPS_COMPILED_BUILD_PROFILE ?? 'standard',
  origin: process.env.WITNESSOPS_COMPILED_STAGING_ORIGIN ?? '',
  workosClientId: process.env.WITNESSOPS_COMPILED_STAGING_WORKOS_CLIENT_ID ?? '',
  databaseSha256: process.env.WITNESSOPS_COMPILED_STAGING_DATABASE_SHA256 ?? '',
});
export function isAasrStagingBuild(): boolean { return build.profile === 'aasr-staging'; }
export function aasrStagingBuildBindings() { return build; }
export function stagingRuntimeReady(env: Record<string, string | undefined> = process.env): boolean {
  return isAasrStagingBuild() && stagingRuntimeMatches(build, env);
}

// This access is also compiled to a literal, including in ordinary production
// artifacts. Changing runtime NODE_ENV cannot turn a standard image into a dev fixture.
export const isProductionAppBuild = process.env.NODE_ENV === 'production';
