import { createHash } from 'node:crypto';

// Synthetic only. No founder receipt, observed host record or exported real handoff.
// Shape pinned to witnessops/witnessops-morpheus @ 45fa888886a05b45a5d8f833bacefc66dbab30a8:
// apps/museum/public/views/decision-room/{model,handoff}.js and schemas/build-handoff.v1.json.
export const FIXED_EXCLUSIONS = Object.freeze([
  'Target repository changes',
  'Target branch or pull request creation',
  'Agent dispatch or command execution',
  'Source evidence collection or upload',
  'Merge, auto-merge or deployment',
  'Credentials or account access',
]);
export const json = value => JSON.stringify(value, null, 2) + '\n';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const encode = value => Buffer.from(json(value), 'utf8');
export function receipt() {
  return {
    schema: 'witnessops.decision-receipt.v1',
    id: 'f1732f5d-43bf-4e86-9301-e88dba820118',
    decision_id: 'synthetic-receiver-case',
    title: 'SYNTHETIC TEST: receiver example, not a company decision',
    question: 'SYNTHETIC TEST: can an inert request be reconstructed?',
    selected_option: { id: 'synthetic-option-a', label: 'SYNTHETIC TEST option A', archive_state: 'proposed', source_wording: null, basis: 'SYNTHETIC TEST evidence only; no product change selected.' },
    rejected_options: [],
    unselected_options: [{ id: 'synthetic-option-b', label: 'SYNTHETIC TEST option B', archive_state: 'historical', source_wording: 'SYNTHETIC TEST wording', basis: 'SYNTHETIC TEST alternative retained without rejection.' }],
    evidence: [{ id: 'synthetic-evidence', label: 'SYNTHETIC TEST source', path: 'synthetic/source.txt', availability: 'available', sha256: 'c'.repeat(64), use: 'cited', verification: 'SHA-256 matched at recording' }],
    related_objects: ['synthetic-artifact'],
    owner: 'founder',
    date: '2026-09-27T00:00:00.000Z',
    reason: 'SYNTHETIC TEST reason: exercise receiver bindings without authorizing implementation.',
    limitations: 'SYNTHETIC TEST only; no human identity, source truth or implementation established.',
    next_gate: 'SYNTHETIC TEST: ask a human for separate implementation authorization.',
    source_snapshot_sha256: 'a'.repeat(64),
    authority: 'Local operator-entered founder record. No identity or execution verification.',
    scope: { implementation: 'unknown', deployment: 'unknown', storage: 'Browser-local; no authenticated identity or publication authorization.' },
  };
}
export function handoff() {
  const r = receipt();
  const exact = json(r);
  return {
    schema: 'witnessops.morpheus.build-handoff.v1',
    id: 'd3cf8057-2862-4938-863a-e853af8390f7',
    created_at: '2026-09-27T00:01:00.000Z',
    state: 'prepared', authority: 'none',
    decision_id: r.decision_id, decision_receipt_id: r.id,
    decision_receipt_sha256: sha256(Buffer.from(exact, 'utf8')),
    decision_receipt_encoding: 'utf-8', decision_receipt_json: exact,
    source_snapshot_sha256: r.source_snapshot_sha256,
    target: { repository: 'witnessops/witnessops-web', area: 'apps/witnessops-web' },
    selected_option: structuredClone(r.selected_option),
    requested_outcome: 'SYNTHETIC TEST request: inspect these records; no product change requested.',
    acceptance: ['SYNTHETIC TEST: digest and identity bindings agree.', 'SYNTHETIC TEST: execution authority remains absent.'],
    not_authorized: [...FIXED_EXCLUSIONS, 'SYNTHETIC TEST: no real customer or founder records.'],
    next_gate: 'SYNTHETIC TEST: obtain separate human implementation authorization.',
    scope: { implementation: 'unknown', deployment: 'unknown', target_mutation: 'none', execution_authorization: 'not_granted' },
  };
}
export function withReceipt(packet, mutate, { bindSelection = false } = {}) {
  const r = JSON.parse(packet.decision_receipt_json);
  mutate(r);
  packet.decision_receipt_json = json(r);
  packet.decision_receipt_sha256 = sha256(Buffer.from(packet.decision_receipt_json, 'utf8'));
  if (bindSelection) packet.selected_option = structuredClone(r.selected_option);
  return packet;
}
export function withRawReceipt(packet, raw) {
  packet.decision_receipt_json = raw;
  packet.decision_receipt_sha256 = sha256(Buffer.from(raw, 'utf8'));
  return packet;
}
