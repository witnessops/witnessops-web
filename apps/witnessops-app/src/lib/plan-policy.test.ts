import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from './errors';
import { EARLY_ACCESS_PLAN_POLICY, planTermsAt, validatePlanConsent, type EarlyAccessPlanRecord } from './plan-policy';

const consent = { requestId: 'abcdefab-1234-1234-1234-abcdefabcdef', expectedRevision: 0, termsVersion: EARLY_ACCESS_PLAN_POLICY.version, contributionMinor: 0, accepted: true };
const plan: EarlyAccessPlanRecord = {
  workspaceId: 'workspace', planId: 'early-access', trialStartedAt: '2026-09-17T12:30:00.000Z', trialEndsAt: '2026-09-24T12:30:00.000Z',
  revision: 1, consentId: consent.requestId, acceptedBy: 'owner', acceptedAt: '2026-09-17T12:30:00.000Z', termsVersion: EARLY_ACCESS_PLAN_POLICY.version,
  contributionMinor: 4900, currency: 'EUR', contributionInterval: 'month',
};

test('plan consent: €0 and explicit whole-cent amounts are accepted; €49 is never a default', () => {
  for (const contributionMinor of [0, 1, 4900, 12345]) assert.equal(validatePlanConsent({ ...consent, contributionMinor }).contributionMinor, contributionMinor);
  assert.equal(validatePlanConsent({ ...consent, requestId: consent.requestId.toUpperCase() }).requestId, consent.requestId);
  const missing = { ...consent } as Record<string, unknown>; delete missing.contributionMinor;
  assert.throws(() => validatePlanConsent(missing), (e: unknown) => e instanceof ApiError && e.status === 400);
});

test('plan consent: explicit acceptance, current version, exact fields and integer amounts are required', () => {
  for (const contributionMinor of [-1, 0.1, NaN, Infinity, '4900', null, true, 2147483648]) assert.throws(() => validatePlanConsent({ ...consent, contributionMinor }));
  for (const expectedRevision of [-1, 0.5, '0', null, 2147483647]) assert.throws(() => validatePlanConsent({ ...consent, expectedRevision }));
  for (const accepted of [false, 'true', 1, null, undefined]) assert.throws(() => validatePlanConsent({ ...consent, accepted }));
  for (const extra of [{ userId: 'injected' }, { trialStartedAt: '2026-01-01' }, { currency: 'USD' }, { featureAccess: 'full' }]) assert.throws(() => validatePlanConsent({ ...consent, ...extra }));
  for (const termsVersion of ['', null, 'future-unaccepted-terms']) assert.throws(() => validatePlanConsent({ ...consent, termsVersion }), (e: unknown) => e instanceof ApiError && e.status === 409);
  for (const input of [null, [], 'consent', { ...consent, requestId: 'not-a-uuid' }]) assert.throws(() => validatePlanConsent(input));
});

test('plan timeline: exactly seven free days, then the same monthly plan at the chosen amount', () => {
  for (const instant of [plan.trialStartedAt, '2026-09-24T12:29:59.999Z']) {
    const state = planTermsAt(plan, new Date(instant));
    assert.equal(state.phase, 'trial'); assert.equal(state.contributionMinor, 0);
  }
  for (const instant of [plan.trialEndsAt, '2027-09-24T12:30:00.000Z']) {
    const state = planTermsAt(plan, new Date(instant));
    assert.equal(state.phase, 'continuing'); assert.equal(state.planId, 'early-access');
    assert.equal(state.contributionMinor, 4900); assert.equal(state.currency, 'EUR'); assert.equal(state.contributionInterval, 'month');
  }
});

test('plan timeline: €0 keeps the same features and policy caps on day eight and after amount changes', () => {
  const zero = planTermsAt({ ...plan, contributionMinor: 0, revision: 2 }, new Date(plan.trialEndsAt));
  const paidChoice = planTermsAt(plan, new Date(plan.trialEndsAt));
  assert.equal(zero.phase, 'continuing'); assert.equal(zero.contributionMinor, 0);
  assert.equal(zero.featureAccess, 'full'); assert.deepEqual(zero.limits, paidChoice.limits);
  assert.deepEqual(zero.limits, { hostnameChecksPerMonth: 25, linuxImportSources: 3, snapshotRetentionDays: 90, seats: 1 });
  assert.equal(zero.futurePricingRequiresConsent, true);
  assert.equal(planTermsAt({ ...plan, revision: 3, contributionMinor: 1 }, new Date(plan.trialEndsAt)).phase, 'continuing');
});

test('plan timeline: elapsed UTC hours survive DST and leap days; malformed timelines fail closed', () => {
  for (const started of ['2026-03-25T12:00:00Z', '2028-02-25T12:00:00Z']) {
    const end = new Date(Date.parse(started)+168*60*60*1000);
    assert.equal(planTermsAt({ ...plan, trialStartedAt: started, trialEndsAt: end.toISOString() }, end).phase, 'continuing');
  }
  for (const at of [new Date('invalid'), new Date(Date.parse(plan.trialStartedAt)-1)]) assert.throws(() => planTermsAt(plan, at), /timeline/);
  for (const trialEndsAt of ['invalid', plan.trialStartedAt, '2026-09-25T12:30:00Z']) assert.throws(() => planTermsAt({ ...plan, trialEndsAt }, new Date(plan.trialStartedAt)), /timeline/);
  assert.throws(() => planTermsAt({ ...plan, termsVersion: 'unaccepted' }, new Date(plan.trialStartedAt)), /Unsupported/);
});
