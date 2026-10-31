import { SNAPSHOT_BOUNDARY, type CheckId, type ExternalCheckResultV1 } from './contracts';

/** Presentation only: neither a severity ranking nor permission to change a system. */
export type ExposureCheckSummary = Pick<ExternalCheckResultV1, 'check_id' | 'title' | 'status' | 'interpretation' | 'recommendation' | 'evidence' | 'limitations'>;
export type ExposureNextAction = {
  check: ExposureCheckSummary; label: string; owner: string; followUp: string; recheck: string;
};

const owners: Record<CheckId, string> = {
  'dns.public_target.v1': 'DNS administrator',
  'tls.certificate.v1': 'Website or hosting administrator',
  'tls.legacy_protocols.v1': 'Website or hosting administrator',
  'web.https_redirect.v1': 'Website or hosting administrator',
  'web.hsts.v1': 'Website or hosting administrator',
  'web.security_headers.v1': 'Website administrator',
  'web.security_txt.v1': 'Website administrator or security contact',
  'mail.spf.v1': 'Email and DNS administrator',
  'mail.dmarc.v1': 'Email and DNS administrator',
  'dns.caa.v1': 'DNS and certificate administrator',
};

export function exposureNextActions(checks: readonly ExposureCheckSummary[]): ExposureNextAction[] {
  return checks.flatMap(check => {
    if (!['NEEDS_ATTENTION', 'UNDETERMINED', 'CHECK_ERROR'].includes(check.status)) return [];
    const uncertain = check.status !== 'NEEDS_ATTENTION';
    return [{ check, owner: owners[check.check_id],
      label: uncertain ? 'Clarify this result' : 'Review this observation',
      followUp: uncertain
        ? 'Ask the responsible administrator to investigate why this check was inconclusive. An unknown result or collection error does not establish a configuration problem.'
        : check.recommendation || 'Ask the responsible administrator to review this observation against the intended configuration before deciding whether a change is needed.',
      recheck: 'After review and any separately approved change, run a new authorized check of the same hostname and compare this named result. A later observation does not by itself prove remediation.',
    }];
  });
}

export function administratorTask(action: ExposureNextAction, context: { hostname: string; observedAt: string | null; example: boolean }): string {
  return [
    context.example ? 'SYNTHETIC EXAMPLE — no hostname was checked. Do not treat this as a real finding.' : 'Hostname check — administrator follow-up',
    `Hostname: ${context.hostname}`,
    `Observed at: ${context.example ? 'Not observed — illustrative example' : context.observedAt}`,
    `Check: ${action.check.title} (${action.check.check_id})`,
    `${context.example ? 'Illustrative status' : 'Recorded status'}: ${action.check.status}`,
    `Suggested owner: ${action.owner}`,
    '', `${context.example ? 'Illustrative observation' : 'Observation'}: ${action.check.interpretation}`,
    ...action.check.evidence.map(item => `Supporting detail: ${item}`),
    '', `Suggested follow-up: ${action.followUp}`, `How to check again: ${action.recheck}`,
    '', 'Limits:', ...action.check.limitations.map(item => `- ${item}`),
    `- ${SNAPSHOT_BOUNDARY}`, '- No severity was assessed. This task does not authorize a change or a new check.',
  ].join('\n');
}
