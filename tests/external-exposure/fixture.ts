import { CHECK_IDS, EXTERNAL_VERSION, type CheckStatus, type ExternalSnapshotV1 } from '../../apps/witnessops-web/src/lib/external-exposure/contracts';

/** Deterministic mocked observations. No network target was contacted. */
export function snapshotFixture(target = 'example.com'): ExternalSnapshotV1 {
  const statuses: CheckStatus[] = ['OBSERVED_EXPECTED', 'NEEDS_ATTENTION', 'INFORMATIONAL', 'UNDETERMINED', 'CHECK_ERROR', 'OBSERVED_EXPECTED', 'OBSERVED_EXPECTED', 'OBSERVED_EXPECTED', 'OBSERVED_EXPECTED', 'UNDETERMINED'];
  return {
    version: EXTERNAL_VERSION, target, started_at: '2026-09-08T12:00:00.000Z', finished_at: '2026-09-08T12:00:02.000Z',
    checks: CHECK_IDS.map((check_id, index) => ({
      check_id, check_version: EXTERNAL_VERSION, target,
      started_at: '2026-09-08T12:00:00.000Z', finished_at: '2026-09-08T12:00:02.000Z',
      status: statuses[index], method: 'Mock fixture only', title: `Mock observation ${index + 1}`,
      observation: { fixture: true, value: index }, evidence: [`Mock check ${check_id}`],
      interpretation: 'Deterministic adapter test. No hostname was inspected.',
      limitations: ['Test input only. No real observation.'], recommendation: 'Inspect the mocked fixture.',
      collected: index !== 4 && index !== 9,
    })),
    usage: { dns: 7, normalTls: 1, legacyTls: 2, http: 3, redirects: 0 },
    network: [{ kind: 'connect', hostname: target, detail: 'Mock public address selection', address: '93.184.216.34', port: 443 }],
  };
}
