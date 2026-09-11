import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import type { ProofpackReportV1 } from '../proofpack/report-model';
import { externalExposureReportModel } from './report-model';
import { normalizeExternalHostname } from './input';
import { CHECK_IDS, EXTERNAL_VERSION, type ExternalSnapshotV1 } from './contracts';

const status = z.enum(['OBSERVED_EXPECTED', 'NEEDS_ATTENTION', 'INFORMATIONAL', 'UNDETERMINED', 'CHECK_ERROR']);
const timestamp = z.string().datetime({ offset: true });
const shortText = z.string().min(1).max(2000);
const texts = z.array(shortText).max(40);
const snapshotSchema = z.object({
  version: z.literal(EXTERNAL_VERSION), target: z.string().min(1).max(253),
  started_at: timestamp, finished_at: timestamp,
  checks: z.array(z.object({
    check_id: z.enum(CHECK_IDS), check_version: z.literal(EXTERNAL_VERSION), target: z.string().min(1).max(253),
    started_at: timestamp, finished_at: timestamp, status, method: shortText, title: shortText,
    observation: z.unknown(), evidence: texts, interpretation: shortText,
    limitations: texts, recommendation: shortText.nullable(), collected: z.boolean(),
  }).strict()).length(CHECK_IDS.length),
  usage: z.object({
    dns: z.number().int().min(0).max(20), normalTls: z.number().int().min(0).max(1),
    legacyTls: z.number().int().min(0).max(2), http: z.number().int().min(0).max(8),
    redirects: z.number().int().min(0).max(3),
  }).strict(),
  network: z.array(z.object({
    kind: z.enum(['dns', 'connect', 'http', 'redirect']), hostname: z.string().min(1).max(253),
    detail: shortText, address: z.string().max(45).refine(value => isIP(value) !== 0).optional(),
    port: z.union([z.literal(80), z.literal(443)]).optional(),
  }).strict()).max(200),
}).strict();

/** Reject values which JSON would silently discard or alter before assigning source identity. */
function assertBoundedJson(value: unknown, depth = 0): void {
  if (depth > 16) throw new Error('Snapshot data exceeds supported nesting.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) throw new Error('Snapshot data must contain JSON values only.');
  for (const item of Object.values(value)) assertBoundedJson(item, depth + 1);
}

export function validateExternalSnapshot(input: unknown): ExternalSnapshotV1 {
  assertBoundedJson(input);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 1024 * 1024) throw new Error('Snapshot data exceeds the report size limit.');
  const snapshot = snapshotSchema.parse(input);
  if (normalizeExternalHostname(snapshot.target) !== snapshot.target) throw new Error('Snapshot target is not normalized.');
  const start = Date.parse(snapshot.started_at), finish = Date.parse(snapshot.finished_at);
  // The transport budget is 30 seconds; allow one second for final timestamp bookkeeping.
  if (start > finish || finish - start > 31_000) throw new Error('Snapshot collection window is invalid.');
  if (new Set(snapshot.checks.map(check => check.check_id)).size !== CHECK_IDS.length) throw new Error('Snapshot check ledger is incomplete or duplicated.');
  for (const check of snapshot.checks) {
    const checkStart = Date.parse(check.started_at), checkFinish = Date.parse(check.finished_at);
    if (check.target !== snapshot.target || checkStart < start || checkFinish > finish || checkStart > checkFinish) throw new Error('Snapshot check identity or collection window is inconsistent.');
    if ((check.status === 'CHECK_ERROR' && check.collected) || (!['CHECK_ERROR', 'UNDETERMINED'].includes(check.status) && !check.collected)) throw new Error('Snapshot collection status is inconsistent.');
    if (!check.evidence.length || !check.limitations.length) throw new Error('Snapshot check requires evidence references and limitations.');
  }
  return snapshot as ExternalSnapshotV1;
}

/** Admission checks establish data consistency only. Source observations remain unsigned. */
export function externalExposureAdapter(input: unknown): ProofpackReportV1 {
  const snapshot = validateExternalSnapshot(input);
  const digest = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  return externalExposureReportModel(snapshot, { digest, serialization: 'json-stringify' });
}
