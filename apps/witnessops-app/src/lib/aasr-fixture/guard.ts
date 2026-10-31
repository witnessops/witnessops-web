import 'server-only';
/** Development-only boundary. A production build can never enable the fixture. */
export function aasrFixtureEnabled(env: { NODE_ENV?: string; WITNESSOPS_AASR_FIXTURE?: string } = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.WITNESSOPS_AASR_FIXTURE === '1';
}
