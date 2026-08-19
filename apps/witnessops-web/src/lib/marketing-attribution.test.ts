import assert from "node:assert/strict";
import test from "node:test";

import {
  LINKEDIN_PREMIUM_CAMPAIGN,
  linkedinPremiumCampaignAttribution,
} from "./marketing-attribution";

test("recognizes the exact LinkedIn Premium Company Page campaign", () => {
  assert.equal(
    linkedinPremiumCampaignAttribution({
      utm_source: "linkedin",
      utm_medium: "company_page",
      utm_campaign: "premium_trial_2026",
    }),
    LINKEDIN_PREMIUM_CAMPAIGN.recordValue,
  );
});

test("does not record partial or different campaign parameters", () => {
  assert.equal(
    linkedinPremiumCampaignAttribution({
      utm_source: "linkedin",
      utm_medium: "company_page",
    }),
    undefined,
  );
  assert.equal(
    linkedinPremiumCampaignAttribution({
      utm_source: "linkedin",
      utm_medium: "company_page",
      utm_campaign: "different_campaign",
    }),
    undefined,
  );
});

test("uses the first value for repeated query parameters", () => {
  assert.equal(
    linkedinPremiumCampaignAttribution({
      utm_source: ["linkedin", "other"],
      utm_medium: ["company_page", "other"],
      utm_campaign: ["premium_trial_2026", "other"],
    }),
    LINKEDIN_PREMIUM_CAMPAIGN.recordValue,
  );
});
