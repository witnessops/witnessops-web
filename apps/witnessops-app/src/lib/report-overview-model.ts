import type { ProofpackReportV1 } from '../../../witnessops-web/src/lib/proofpack/report-model';
import { CHECK_IDS, EXTERNAL_VERSION } from '../../../witnessops-web/src/lib/external-exposure/contracts';

export type OutcomeBar = { label: string; count: number; tone: 'expected' | 'attention' | 'information' | 'unknown' };

/** Read only the admitted report totals. Missing check ledgers never imply passing checks. */
export function reportOutcomeChart(model: ProofpackReportV1): { label: string; total: number; bars: OutcomeBar[]; boundary: string } {
  const checks = model.summary.checks;
  return checks ? {
    label: 'Recorded check outcomes', total: checks.total,
    bars: [
      { label: 'Observed as expected', count: checks.passed, tone: 'expected' },
      { label: 'Needs attention', count: checks.needsAttention, tone: 'attention' },
      { label: 'Informational', count: checks.informational, tone: 'information' },
      { label: 'Undetermined', count: checks.undetermined, tone: 'unknown' },
    ],
    boundary: 'Individual check results, not a security score. Collection errors remain undetermined.',
  } : {
    label: 'Recorded findings', total: model.summary.findings.total,
    bars: [
      { label: 'Needs attention', count: model.summary.findings.needsAttention, tone: 'attention' },
      { label: 'Informational', count: model.summary.findings.informational, tone: 'information' },
    ],
    boundary: 'No complete individual-check ledger. Passing or undetermined checks cannot be inferred from these findings.',
  };
}

type Artifact = ProofpackReportV1['sourceArtifacts'][number];
export type ReportReference = {
  key: string; reference: string; kind: 'evidence' | 'source';
  resolution: 'artifact' | 'section' | 'unresolved' | 'ambiguous';
  artifact: Artifact | null;
  section: { path: string; value: unknown } | null;
  reason: string | null;
};
type Resolution = Pick<ReportReference, 'resolution' | 'artifact' | 'section' | 'reason'>;
const missing = Symbol('missing source value');
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const unavailable = (reason: string, ambiguous = false): Resolution => ({
  resolution: ambiguous ? 'ambiguous' : 'unresolved', artifact: null, section: null, reason,
});
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null
  && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Read JSON data properties only: never inherited properties, accessors or expressions. */
function own(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object' || unsafeKeys.has(key)) return missing;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor && descriptor.value !== undefined ? descriptor.value : missing;
}
function atPath(value: unknown, keys: string[]): unknown {
  for (const key of keys) {
    if (!isRecord(value)) return missing;
    value = own(value, key);
    if (value === missing) return missing;
  }
  return value;
}
function sourceArtifact(artifacts: ProofpackReportV1['sourceArtifacts'], predicate: (artifact: Artifact) => boolean): Artifact | Resolution {
  const matches = artifacts.filter(predicate);
  return matches.length === 1 ? matches[0] : unavailable(matches.length
    ? 'More than one source artifact matches this reference.'
    : 'No source artifact matches this reference.', matches.length > 1);
}
function section(artifact: Artifact, path: string, value: unknown): Resolution {
  return value === missing ? unavailable('The referenced section is not present in the available source content.')
    : { resolution: 'section', artifact, section: { path, value }, reason: null };
}

function resolveReference(reference: string, artifacts: ProofpackReportV1['sourceArtifacts']): Resolution {
  if (reference.length > 512) return unavailable('This reference exceeds the supported length.');
  const exact = artifacts.filter(artifact => artifact.id === reference || artifact.path === reference);
  const external = /^external-exposure-snapshot\.json: checks\[check_id=([a-z][a-z0-9_.-]{0,127})\]$/.exec(reference);
  const posture = /^posture\.(sections\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){0,6})$/.exec(reference);
  if (exact.length > 1 || (exact.length === 1 && (external || posture)))
    return unavailable('This reference has more than one possible source interpretation.', true);
  if (exact.length === 1) return { resolution: 'artifact', artifact: exact[0], section: null, reason: null };

  if (external) {
    const checkId = external[1];
    if (!(CHECK_IDS as readonly string[]).includes(checkId)) return unavailable('This check selector is not supported.');
    const selected = sourceArtifact(artifacts, artifact => artifact.id === 'external-exposure-snapshot.json' || artifact.path === 'external-exposure-snapshot.json');
    if ('resolution' in selected) return selected;
    const content = selected.content, checks = own(content, 'checks');
    if (selected.format !== 'json' || !isRecord(content) || own(content, 'version') !== EXTERNAL_VERSION
        || !Array.isArray(checks) || checks.length > CHECK_IDS.length)
      return unavailable('The matching artifact has no supported snapshot content available.');
    const matches: unknown[] = [];
    for (let i = 0; i < checks.length; i++) {
      const check = own(checks, String(i));
      if (isRecord(check) && own(check, 'check_id') === checkId) matches.push(check);
    }
    if (matches.length > 1) return unavailable('More than one source check matches this selector.', true);
    return section(selected, `checks[check_id=${checkId}]`, matches.length ? matches[0] : missing);
  }

  if (posture) {
    const keys = posture[1].split('.');
    if (keys.some(key => unsafeKeys.has(key))) return unavailable('This source path is not supported.');
    // The verifier binds the semantic artifact ID. Its recorded filename may vary.
    const selected = sourceArtifact(artifacts, artifact => artifact.id === 'host_posture');
    if ('resolution' in selected) return selected;
    const content = selected.content;
    if (selected.format !== 'json' || !isRecord(content)
        || own(content, 'schema') !== 'witnessops.local_server_audit.posture.v1')
      return unavailable('The matching artifact has no supported posture content available.');
    if (keys[1] === 'hardening' && keys[2] === 'sysctl' && keys.length > 4) {
      // The producer appends a literal sysctl key containing dots; it is not
      // an arbitrary object path. Do not guess a nested substitute for it.
      const sysctl = atPath(content, keys.slice(0, 3));
      const literal = isRecord(sysctl) ? own(sysctl, keys.slice(3).join('.')) : missing;
      if (literal !== missing && atPath(sysctl, keys.slice(3)) !== missing)
        return unavailable('The source contains both literal and nested matches for this sysctl reference.', true);
      return section(selected, posture[1], literal);
    }
    return section(selected, posture[1], atPath(content, keys));
  }
  return unavailable('No supported exact source or section reference matches this text.');
}

/** Presentation over available admitted content only; no fetch, parsing expression or new verification. */
export function findingReferences(model: ProofpackReportV1, finding: ProofpackReportV1['findings'][number],
  evidenceArtifacts: ProofpackReportV1['sourceArtifacts'] = model.sourceArtifacts): ReportReference[] {
  return (['evidence', 'source'] as const).flatMap(kind => Array.from(new Set(kind === 'evidence' ? finding.evidence : finding.sourceRefs))
    .map(reference => ({ key: `${kind}:${reference}`, reference, kind, ...resolveReference(reference, evidenceArtifacts) })));
}
