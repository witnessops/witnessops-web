/** Structural helper for tests — draft man pages must not be publicly served. */
export function isManWitnessOpsPubliclyServed(draft: boolean): boolean {
  return draft !== true;
}
