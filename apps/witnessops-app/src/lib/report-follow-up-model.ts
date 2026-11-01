import type { CheckId } from '../../../witnessops-web/src/lib/external-exposure/contracts';
import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';

export type FollowUpTarget = { kind: 'coverage' | 'finding'; index: number };
type Suggestion = { evidence: string; action: string };
export type ReportFollowUpItem = {
  key: string;
  title: string;
  kind: 'evidence' | 'attention' | 'information';
  recordedReasons: string[];
  recordedNextStep: string | null;
  suggested: Suggestion;
  target?: FollowUpTarget;
};

// These are reading aids for exact admitted check identities, not new findings.
const EXTERNAL_GAPS: Record<CheckId, Suggestion> = {
  'dns.public_target.v1': {
    evidence: 'A timestamped DNS answer for the submitted hostname, including the resolver result and any lookup error.',
    action: 'Ask the DNS owner to review the recorded lookup result before agreeing another authorized observation.',
  },
  'tls.certificate.v1': {
    evidence: 'A completed TLS handshake for the same hostname with the certificate chain, hostname validation result and observation time.',
    action: 'Ask the endpoint owner to review the handshake error. Do not disable certificate validation to turn an unknown result into a pass.',
  },
  'tls.legacy_protocols.v1': {
    evidence: 'Separate TLS 1.0 and TLS 1.1 probe results that distinguish a server response from a client that cannot offer the protocol.',
    action: 'Have the endpoint owner agree a compatible, authorized test method. A local protocol error does not show that the server accepted or rejected it.',
  },
  'web.https_redirect.v1': {
    evidence: 'The HTTP response and redirect destinations for the same hostname, with any connection error and observation time.',
    action: 'Ask the web owner to review the recorded redirect path and keep any follow-up within the authorized hostname and ports.',
  },
  'web.hsts.v1': {
    evidence: 'A successful HTTPS response for the same hostname with the complete Strict-Transport-Security header, if present.',
    action: 'Review the response or collection error with the web owner before drawing a conclusion about HSTS.',
  },
  'web.security_headers.v1': {
    evidence: 'The complete response headers from the same HTTPS location, including any policy syntax the bounded check could not interpret.',
    action: 'Ask the web owner to review the recorded headers and parser limitation. Header presence alone does not establish policy effectiveness.',
  },
  'web.security_txt.v1': {
    evidence: 'The response status, content type and complete bounded security.txt content from the recorded location.',
    action: 'Ask the site owner to review the published contact file. A declared contact does not establish ownership or successful delivery.',
  },
  'mail.spf.v1': {
    evidence: 'The full TXT answer for the submitted hostname and the lookup or syntax detail that prevented interpretation.',
    action: 'Ask the mail or DNS owner to review that publication. Do not change sending policy without accounting for the authorized senders.',
  },
  'mail.dmarc.v1': {
    evidence: 'The complete TXT answer at the recorded DMARC name, including any lookup error or unsupported syntax.',
    action: 'Ask the mail owner to review the published policy and the recorded limitation before considering changes.',
  },
  'dns.caa.v1': {
    evidence: 'The complete CAA answers along the recorded, bounded lookup path, with any lookup error or unsupported property.',
    action: 'Ask the DNS owner to review the lookup with the intended certificate issuers. This result does not establish unauthorized certificate issuance.',
  },
};

const genericGap: Suggestion = {
  evidence: 'A complete observation for this item, with its collection status, time and any diagnostic error.',
  action: 'Review the recorded gap with the responsible owner and agree a supported, authorized follow-up. Keep the original report for comparison.',
};
const linuxGap: Suggestion = {
  evidence: 'A complete result for this section from a supported Local Audit collection, including the command status and any collection limitation.',
  action: 'Ask the host owner to review the recorded diagnostic and collector prerequisites. Agree any new collection separately; do not change host settings just to complete the report.',
};
const genericFinding: Suggestion = {
  evidence: 'A separately recorded follow-up observation of the same item after any owner-approved action.',
  action: 'Review the recorded observation and recommendation with the responsible owner before agreeing a change. Retain the original evidence.',
};

function gapSuggestion(model: ProofpackReportV1, id: string): Suggestion {
  if (model.identity.productId === 'external-exposure-snapshot' && Object.hasOwn(EXTERNAL_GAPS, id))
    return { ...EXTERNAL_GAPS[id as CheckId] };
  return { ...(model.identity.productId === 'local-audit' ? linuxGap : genericGap) };
}

const distinct = (values: (string | null | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
const uncertain = (state: string | null) => state === 'UNDETERMINED' || state === 'CHECK_ERROR';

/** Pure presentation projection. Advice is not saved evidence, a new assessment or collection authority. */
export function reportFollowUpGuidance(model: ProofpackReportV1) {
  const items: ReportFollowUpItem[] = [];
  const coveredIds = new Set<string>();
  const addGap = (id: string, title: string, reasons: string[], recordedNextStep: string | null, target?: FollowUpTarget) => {
    coveredIds.add(id);
    const finding = model.findings.find(item => (item.checkId ?? item.id) === id);
    items.push({ key: `gap:${id}`, title, kind: 'evidence', recordedReasons: distinct([...reasons, finding?.interpretation]),
      recordedNextStep: recordedNextStep ?? finding?.recommendation ?? null, suggested: gapSuggestion(model, id), target });
  };

  model.coverage.forEach((coverage, index) => {
    const gap = model.collectionGaps.find(item => item.id === coverage.id);
    if (coverage.complete && !uncertain(coverage.observedState) && !gap) return;
    const unknown = model.unknowns.find(item => item.id === coverage.id);
    addGap(coverage.id, gap?.label ?? unknown?.title ?? coverage.label,
      distinct([gap?.reason, unknown?.reason, !coverage.complete ? 'Collection is incomplete for this item.' : null,
        coverage.observedState ? `Recorded outcome: ${coverage.observedState}.` : null]),
      unknown?.evidenceNeeded ?? null, { kind: 'coverage', index });
  });
  model.collectionGaps.forEach(gap => {
    if (coveredIds.has(gap.id)) return;
    const unknown = model.unknowns.find(item => item.id === gap.id);
    addGap(gap.id, gap.label, distinct([gap.reason, unknown?.reason]), unknown?.evidenceNeeded ?? null);
  });
  model.findings.forEach((finding, index) => {
    if (coveredIds.has(finding.checkId ?? finding.id)) return;
    const information = finding.state === 'informational' || finding.severity === 'informational';
    const caa = information && model.identity.productId === 'external-exposure-snapshot' && finding.checkId === 'dns.caa.v1';
    items.push({
      key: `finding:${index}`, title: finding.title, kind: information ? 'information' : 'attention',
      recordedReasons: distinct([finding.interpretation, `Recorded finding state: ${finding.state}.`]),
      recordedNextStep: finding.recommendation,
      suggested: caa ? {
        evidence: 'The intended certificate issuers and a separately recorded CAA lookup if the DNS owner chooses to review the policy.',
        action: 'Treat this as an optional policy review with the DNS owner. Missing CAA alone does not establish a vulnerability or unauthorized certificate issuance.',
      } : { ...genericFinding },
      target: { kind: 'finding', index },
    });
  });
  const priority = { evidence: 0, attention: 1, information: 2 };
  items.sort((a, b) => priority[a.kind] - priority[b.kind]);
  return { items, evidenceGapCount: items.filter(item => item.kind === 'evidence').length, incompleteCheckLedger: model.summary.checks === null };
}
