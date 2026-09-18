/** Operational staging limits, not a subscription, trial or retention promise. */
export const FREE_WORKSPACE_POLICY = {
  version: 'free-workspace-v1', assets: 20, hostnameRuns: 32, linuxImportSources: 3,
} as const;

/** Admission is opt-in. Existing memberships remain usable when it is disabled. */
export function freeWorkspaceCeiling(env: Record<string, string | undefined> = process.env): number | null {
  if (!env.WITNESSOPS_FREE_WORKSPACE_LIMIT) return null;
  if (!/^(?:[2-9]|1[0-9]|20)$/.test(env.WITNESSOPS_FREE_WORKSPACE_LIMIT)) throw new Error('Free workspace limit must be an integer from 2 to 20.');
  return Number(env.WITNESSOPS_FREE_WORKSPACE_LIMIT);
}
