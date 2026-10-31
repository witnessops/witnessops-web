import 'server-only';
import { isAasrStagingBuild, isProductionAppBuild, stagingRuntimeReady } from '../aasr-staging/config';
/** Ordinary production artifacts always refuse; staging is a separate sealed build. */
export function aasrFixtureEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (isAasrStagingBuild()) return stagingRuntimeReady(env);
  return !isProductionAppBuild && env.NODE_ENV !== 'production' && env.WITNESSOPS_AASR_FIXTURE === '1';
}
