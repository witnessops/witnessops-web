type QueryValue = string | string[] | undefined;

export const LINKEDIN_PREMIUM_CAMPAIGN = {
  source: "linkedin",
  medium: "company_page",
  campaign: "premium_trial_2026",
  recordValue: "linkedin/company_page/premium_trial_2026",
} as const;

function first(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function linkedinPremiumCampaignAttribution(
  params: Record<string, QueryValue>,
) {
  if (
    first(params.utm_source) === LINKEDIN_PREMIUM_CAMPAIGN.source &&
    first(params.utm_medium) === LINKEDIN_PREMIUM_CAMPAIGN.medium &&
    first(params.utm_campaign) === LINKEDIN_PREMIUM_CAMPAIGN.campaign
  ) {
    return LINKEDIN_PREMIUM_CAMPAIGN.recordValue;
  }

  return undefined;
}
