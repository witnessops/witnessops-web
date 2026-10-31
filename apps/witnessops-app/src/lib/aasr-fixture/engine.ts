import 'server-only';
import { RAW_SOURCE, SCOPE, digest, validateSource } from './source';

export const ENGAGEMENT_ID = 'SYN-AASR-001';
export const WORKSPACE_LABEL = 'SYN-NORTHSTAR';
export type EngineActor = { id: string; workspaceId: string; role: 'owner' | 'reviewer' };
export const COMMANDS = Object.freeze(['accept_scope', 'submit_evidence', 'admit_evidence', 'record_review', 'accept_report', 'prepare_delivery', 'simulate_delivery', 'close', 'hold'] as const);
export type Command = typeof COMMANDS[number];
export type Stage = 'draft' | 'awaiting_evidence' | 'evidence_submitted' | 'review_ready' | 'review_recorded' | 'report_accepted' | 'delivery_prepared' | 'delivery_simulated' | 'closed' | 'held';
export class FixtureError extends Error {
  constructor(public code: string, public httpStatus = 400) { super(code); this.name = 'FixtureError'; }
}
function refuse(code: string, status = 400): never { throw new FixtureError(code, status); }
const clone = <T>(value: T): T => structuredClone(value);
const GENESIS = `sha256:${'0'.repeat(64)}`;
// Domain authority is assigned by the native adapter; this is not a workspace-role decision.
const CUSTOMER_ACTOR_ROLE = 'owner';
const REVIEWER_ACTOR_ROLE = 'reviewer';
const transitions: Record<Command, { role: EngineActor['role']; from: readonly Stage[]; to: Stage }> = {
  accept_scope: { role: 'owner', from: ['draft'], to: 'awaiting_evidence' },
  submit_evidence: { role: 'owner', from: ['awaiting_evidence'], to: 'evidence_submitted' },
  admit_evidence: { role: 'reviewer', from: ['evidence_submitted'], to: 'review_ready' },
  record_review: { role: 'reviewer', from: ['review_ready'], to: 'review_recorded' },
  accept_report: { role: 'owner', from: ['review_recorded'], to: 'report_accepted' },
  prepare_delivery: { role: 'reviewer', from: ['report_accepted'], to: 'delivery_prepared' },
  simulate_delivery: { role: 'reviewer', from: ['delivery_prepared'], to: 'delivery_simulated' },
  close: { role: 'owner', from: ['delivery_simulated'], to: 'closed' },
  hold: { role: 'reviewer', from: ['evidence_submitted', 'review_ready', 'review_recorded'], to: 'held' },
};
const UNKNOWN = 'UNKNOWN' as const;
const finding = {
  id: 'SYN-FINDING-001', title: 'Approval was recorded; enforcement is not independently established',
  assessment: 'UNVERIFIED_BOUNDARY', sourceRefs: ['SYN-EV-POLICY', 'SYN-EV-ACTION', 'SYN-EV-MISSING'],
  recommendation: 'Demonstrate a denied update in a supervised synthetic staging test.',
};
const unknowns = [
  'Approval evidence came from the fictional system; runtime enforcement was not independently observed.',
  'A success record does not prove a CRM record was persisted.',
  'Source authenticity is not established by SHA-256 alone.',
];
const limitations = ['One named fictional action only', 'No live provider, real agent, customer data, or external system inspected'];
type Review = {
  fixture: true; source: 'SYNTHETIC_TEST_DATA'; engagementId: string; actionId: string;
  scopeDigest: string; evidenceDigest: string; reviewerDecision: 'PARTIAL_EVIDENCE';
  findings: typeof finding[]; unknowns: string[]; scopeLimitations: string[];
};
type Recipient = {
  fixture: true; source: 'SYNTHETIC_TEST_DATA'; title: string; engagementId: string; actionId: string;
  assessment: 'PARTIAL_EVIDENCE'; scopeDigest: string; evidenceDigest: string; reportDigest: string;
  findings: typeof finding[]; unknowns: string[]; limitations: string[];
  delivery: 'SIMULATED_ONLY_NO_EXTERNAL_SEND'; proofBoundary: string;
};
type Core = {
  fixture: true; id: string; workspaceId: string; stage: Stage; revision: number;
  scope: typeof SCOPE | null; scopeDigest: string | null; ownerId: string | null; reviewerId: string | null;
  evidence: ReturnType<typeof validateSource> | null; review: Review | null; reportDigest: string | null;
  recipient: Recipient | null;
};
type AuditEvent = { sequence: number; command: Command; actor: EngineActor; at: string; stage: Stage; revision: number; stateDigest: string; previousHash: string; hash: string };
type Denial = { sequence: number; command: Command | 'unsupported'; reason: string };
export type EngineSnapshot = Core & { audit: AuditEvent[]; denied: Denial[]; deniedCount: number };
export type Integrity = { pass: boolean; integrity: 'SHA256_LOCAL_FIXTURE_ONLY'; authenticity: 'UNKNOWN'; evidenceTruth: 'UNKNOWN'; reason?: string; chainHead?: string };
export type EngineView = {
  fixture: true; source: 'SYNTHETIC_TEST_DATA'; id: string; workspaceId: string; workspaceLabel: string;
  customer: string; actionId: string; agentId: string; stage: Stage; revision: number;
  scope: typeof SCOPE; scopeDigest: string | null; evidenceDigest: string | null; reportDigest: string | null;
  provenance: { rawDigest: string; canonicalDigest: string; claimedDigest: string; sourceAuthenticity: 'UNKNOWN'; evidenceTruth: 'UNKNOWN'; runtimeApprovalEnforcement: 'UNKNOWN' } | null;
  review: Review | null; findings: typeof finding[]; unknowns: string[]; recipientReady: boolean; recipient: Recipient | null;
  audit: { event: Command; stage: Stage; hash: string; at: string }[];
  denied: Denial[]; deniedCount: number; integrity: Integrity; allowedCommands: Command[]; externalActions: 0;
  ephemeral: true; delivery: 'NOT_SENT' | 'DELIVERY SIMULATED';
};
function initial(workspaceId: string): Core {
  return { fixture: true, id: ENGAGEMENT_ID, workspaceId, stage: 'draft', revision: 0, scope: null, scopeDigest: null,
    ownerId: null, reviewerId: null, evidence: null, review: null, reportDigest: null, recipient: null };
}
function assertActor(actor: EngineActor, state: Core) {
  if (!actor || typeof actor.id !== 'string' || !actor.id || actor.id.length > 200) refuse('missing_identity', 401);
  if (actor.workspaceId !== state.workspaceId) refuse('workspace_mismatch', 403);
  if (!['owner', 'reviewer'].includes(actor.role)) refuse('role_denied', 403);
  if (actor.role === REVIEWER_ACTOR_ROLE && state.ownerId === actor.id) refuse('independent_reviewer_required', 403);
  if (actor.role === CUSTOMER_ACTOR_ROLE && state.reviewerId === actor.id) refuse('independent_customer_required', 403);
}
function apply(current: Core, actor: EngineActor, command: Command): Core {
  assertActor(actor, current);
  const transition = transitions[command];
  if (actor.role !== transition.role) refuse('role_denied', 403);
  if (!transition.from.includes(current.stage)) refuse('transition_denied', 409);
  const next = clone(current);
  if (command === 'accept_scope') { next.scope = clone(SCOPE); next.scopeDigest = digest(SCOPE); next.ownerId = actor.id; }
  if (command === 'submit_evidence') next.evidence = validateSource(RAW_SOURCE);
  if (command === 'admit_evidence') {
    if (!next.evidence) refuse('missing_evidence', 422);
    validateSource(next.evidence.rawBytes, next.evidence.claimedDigest);
    next.reviewerId = actor.id;
  }
  if (command === 'record_review') {
    if (!next.scopeDigest || !next.evidence) refuse('missing_evidence', 422);
    next.review = { fixture: true, source: 'SYNTHETIC_TEST_DATA', engagementId: ENGAGEMENT_ID, actionId: SCOPE.actionId,
      scopeDigest: next.scopeDigest, evidenceDigest: next.evidence.canonicalDigest, reviewerDecision: 'PARTIAL_EVIDENCE',
      findings: [clone(finding)], unknowns: clone(unknowns), scopeLimitations: clone(limitations) };
    next.reportDigest = digest(next.review);
  }
  if (command === 'prepare_delivery') {
    if (!next.review || !next.reportDigest) refuse('report_not_accepted', 409);
    const review = next.review;
    next.recipient = { fixture: true, source: 'SYNTHETIC_TEST_DATA', title: 'Fictional Agent Action Security Review — Northstar CRM',
      engagementId: ENGAGEMENT_ID, actionId: review.actionId, scopeDigest: review.scopeDigest, evidenceDigest: review.evidenceDigest,
      reportDigest: next.reportDigest, assessment: review.reviewerDecision, findings: clone(review.findings), unknowns: clone(review.unknowns),
      limitations: clone(review.scopeLimitations), delivery: 'SIMULATED_ONLY_NO_EXTERNAL_SEND',
      proofBoundary: 'Digests check retained bytes, not source authenticity, deployed behavior or actual customer approval.' };
  }
  next.stage = transition.to;
  next.revision++;
  return next;
}
function core(snapshot: EngineSnapshot): Core {
  const { audit: _audit, denied: _denied, deniedCount: _deniedCount, ...state } = snapshot;
  return state;
}
function replay(snapshot: EngineSnapshot): boolean {
  try {
    let state = initial(snapshot.workspaceId);
    let previousHash = GENESIS;
    for (const [index, event] of snapshot.audit.entries()) {
      if (!COMMANDS.includes(event.command) || event.sequence !== index + 1 || event.previousHash !== previousHash) return false;
      if (typeof event.at !== 'string' || !Number.isFinite(Date.parse(event.at))) return false;
      const { hash, ...unsigned } = event;
      if (hash !== digest(unsigned)) return false;
      state = apply(state, event.actor, event.command);
      if (state.stage !== event.stage || state.revision !== event.revision || digest(state) !== event.stateDigest) return false;
      previousHash = hash;
    }
    return digest(state) === digest(core(snapshot));
  } catch { return false; }
}
export interface FixtureEngine {
  read(actor: EngineActor): EngineView;
  command(actor: EngineActor, operation: string, expectedRevision: number): EngineView;
  recipientReport(actor: EngineActor): Recipient;
  snapshotForTesting(): EngineSnapshot;
  verifySnapshot(candidate: EngineSnapshot): Integrity;
  fork(): FixtureEngine;
  adopt(candidate: FixtureEngine): void;
}
type Internal = { token: symbol; baseline: string; snapshot: () => EngineSnapshot };
const internals = new WeakMap<FixtureEngine, Internal>();
export function createFixtureEngine(options: { workspaceId: string; clock?: () => string }): FixtureEngine {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.workspaceId)) refuse('invalid_workspace', 422);
  return makeEngine({ ...initial(options.workspaceId), audit: [], denied: [], deniedCount: 0 }, options.clock ?? (() => new Date().toISOString()), Symbol('fixture'));
}
function makeEngine(start: EngineSnapshot, clock: () => string, token: symbol): FixtureEngine {
  let state = clone(start);
  let anchor = digest(state);
  const baseline = anchor;
  function verifySnapshot(candidate: EngineSnapshot): Integrity {
    const base = { integrity: 'SHA256_LOCAL_FIXTURE_ONLY', authenticity: UNKNOWN, evidenceTruth: UNKNOWN } as const;
    try {
      if (digest(candidate) !== anchor || !replay(candidate)) return { ...base, pass: false, reason: 'anchored_state_mismatch' };
      return { ...base, pass: true, chainHead: candidate.audit.at(-1)?.hash ?? GENESIS };
    } catch { return { ...base, pass: false, reason: 'invalid_snapshot' }; }
  }
  function read(actor: EngineActor): EngineView {
    assertActor(actor, state);
    return clone({ fixture: true, source: 'SYNTHETIC_TEST_DATA', id: state.id, workspaceId: state.workspaceId, workspaceLabel: WORKSPACE_LABEL,
      customer: 'Northstar CRM Automation (fictional)', actionId: SCOPE.actionId, agentId: SCOPE.agentId, stage: state.stage, revision: state.revision,
      scope: SCOPE, scopeDigest: state.scopeDigest, evidenceDigest: state.evidence?.canonicalDigest ?? null, reportDigest: state.reportDigest,
      provenance: state.evidence ? { rawDigest: state.evidence.rawDigest, canonicalDigest: state.evidence.canonicalDigest,
        claimedDigest: state.evidence.claimedDigest, sourceAuthenticity: UNKNOWN, evidenceTruth: UNKNOWN, runtimeApprovalEnforcement: UNKNOWN } : null,
      review: state.review, findings: state.review?.findings ?? [], unknowns: state.review?.unknowns ?? clone(unknowns),
      recipientReady: state.recipient !== null, recipient: state.recipient,
      audit: state.audit.map(e => ({ event: e.command, stage: e.stage, hash: e.hash, at: e.at })), denied: state.denied, deniedCount: state.deniedCount,
      integrity: verifySnapshot(state), allowedCommands: COMMANDS.filter(command => transitions[command].role === actor.role && transitions[command].from.includes(state.stage)),
      externalActions: 0, ephemeral: true, delivery: ['delivery_simulated', 'closed'].includes(state.stage) ? 'DELIVERY SIMULATED' : 'NOT_SENT' });
  }
  const engine: FixtureEngine = {
    read,
    command(actor, operation, expectedRevision) {
      try {
        assertActor(actor, state);
        if (!COMMANDS.includes(operation as Command)) refuse('unknown_operation');
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== state.revision) refuse('revision_conflict', 409);
        if (!verifySnapshot(state).pass) refuse('integrity_failed', 500);
        const command = operation as Command;
        const next = apply(core(state), actor, command);
        const at = clock();
        if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) refuse('invalid_clock', 500);
        const event = { sequence: state.audit.length + 1, command, actor: clone(actor), at,
          stage: next.stage, revision: next.revision, stateDigest: digest(next), previousHash: state.audit.at(-1)?.hash ?? GENESIS };
        const candidate = { ...next, audit: [...state.audit, { ...event, hash: digest(event) }], denied: clone(state.denied), deniedCount: state.deniedCount };
        if (!replay(candidate)) refuse('integrity_failed', 500);
        state = candidate;
        anchor = digest(state);
        return read(actor);
      } catch (error) {
        const refusal = error instanceof FixtureError ? error : new FixtureError('internal_transition_failed', 500);
        // No caller-supplied payload, actor identity or error text enters this bounded denial record.
        const denial = { sequence: state.deniedCount + 1, command: COMMANDS.includes(operation as Command) ? operation as Command : 'unsupported' as const, reason: refusal.code };
        state = { ...state, deniedCount: denial.sequence, denied: [...state.denied, denial].slice(-100) };
        anchor = digest(state);
        throw refusal;
      }
    },
    recipientReport(actor) { assertActor(actor, state); if (!state.recipient) refuse('report_not_ready', 409); return clone(state.recipient); },
    snapshotForTesting: () => clone(state),
    verifySnapshot,
    fork: () => makeEngine(state, clock, token),
    adopt(candidate) {
      const internal = internals.get(candidate);
      if (!internal || internal.token !== token || internal.baseline !== anchor) refuse('stale_or_unrelated_transaction', 409);
      const next = internal.snapshot();
      if (!candidate.verifySnapshot(next).pass) refuse('integrity_failed', 500);
      state = next; anchor = digest(state);
    },
  };
  internals.set(engine, { token, baseline, snapshot: () => clone(state) });
  return Object.freeze(engine);
}
