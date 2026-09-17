import { ApiError, requireId } from './errors';

/** Approved commercial terms, not a claim that billing/allowances/expiry run.
 * Persist this version with consent. A later policy must use a new version. */
const EARLY_ACCESS_POLICY_V1 = Object.freeze({
  version: 'early-access-2026-09-17',
  planId: 'early-access',
  currency: 'EUR',
  contributionInterval: 'month',
  trialDays: 7,
  suggestedContributionMinor: 4900,
  zeroContributionAllowed: true,
  featureAccess: 'full',
  samePlanAfterTrial: true,
  futurePricingRequiresConsent: true,
  limits: Object.freeze({ hostnameChecksPerMonth: 25, linuxImportSources: 3, snapshotRetentionDays: 90, seats: 1 }),
} as const);

export const EARLY_ACCESS_PLAN_POLICY = EARLY_ACCESS_POLICY_V1;

// Keep accepted versions when adding future terms. Existing plans must never
// inherit a later policy simply because a new release changes the current one.
const acceptedPolicies = new Map<string, typeof EARLY_ACCESS_PLAN_POLICY>([
  [EARLY_ACCESS_POLICY_V1.version, EARLY_ACCESS_POLICY_V1],
]);

export type PlanConsentInput = {
  requestId: string;
  expectedRevision: number;
  termsVersion: string;
  contributionMinor: number;
  accepted: true;
};

export type EarlyAccessPlanRecord = {
  workspaceId: string;
  planId: 'early-access';
  trialStartedAt: string;
  trialEndsAt: string;
  revision: number;
  consentId: string;
  acceptedBy: string;
  acceptedAt: string;
  termsVersion: string;
  contributionMinor: number;
  currency: 'EUR';
  contributionInterval: 'month';
};

export function validatePlanConsent(input: unknown): PlanConsentInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Explicit plan consent is required.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join() !== 'accepted,contributionMinor,expectedRevision,requestId,termsVersion' || value.accepted !== true) {
    throw new ApiError(400, 'Submit the contribution, terms version, current revision and explicit consent.');
  }
  // PostgreSQL integer storage bound; never infer an amount from the suggestion.
  if (typeof value.contributionMinor !== 'number' || !Number.isInteger(value.contributionMinor) || value.contributionMinor < 0 || value.contributionMinor > 2147483647) {
    throw new ApiError(400, 'Use a non-negative whole number of euro cents.');
  }
  if (typeof value.expectedRevision !== 'number' || !Number.isInteger(value.expectedRevision) || value.expectedRevision < 0 || value.expectedRevision >= 2147483647) {
    throw new ApiError(400, 'Use the current plan revision.');
  }
  if (value.termsVersion !== EARLY_ACCESS_PLAN_POLICY.version) throw new ApiError(409, 'Read and explicitly accept the current plan terms.');
  return { requestId: requireId(value.requestId).toLowerCase(), expectedRevision: value.expectedRevision, termsVersion: value.termsVersion, contributionMinor: value.contributionMinor, accepted: true };
}

/** Describes the accepted commercial terms at a time; does not authorize access,
 * collect payment, count usage, or delete evidence. Trial duration is 168 hours. */
export function planTermsAt(plan: EarlyAccessPlanRecord, at: Date) {
  const policy = acceptedPolicies.get(plan.termsVersion);
  const started = Date.parse(plan.trialStartedAt), ends = Date.parse(plan.trialEndsAt), now = at.getTime();
  if (!Number.isFinite(started) || !Number.isFinite(ends) || !Number.isFinite(now) || ends - started !== 7 * 24 * 60 * 60 * 1000 || now < started) {
    throw new Error('Invalid plan timeline.');
  }
  if (!policy || plan.planId !== policy.planId || plan.currency !== policy.currency || plan.contributionInterval !== policy.contributionInterval || !Number.isInteger(plan.contributionMinor) || plan.contributionMinor < 0 || plan.contributionMinor > 2147483647) {
    throw new Error('Unsupported plan terms.');
  }
  const trial = now < ends;
  return {
    planId: policy.planId,
    phase: trial ? 'trial' as const : 'continuing' as const,
    contributionMinor: trial ? 0 : plan.contributionMinor,
    currency: policy.currency,
    contributionInterval: policy.contributionInterval,
    featureAccess: policy.featureAccess,
    limits: policy.limits,
    futurePricingRequiresConsent: policy.futurePricingRequiresConsent,
  };
}
