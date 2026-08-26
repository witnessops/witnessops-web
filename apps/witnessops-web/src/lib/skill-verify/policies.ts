/**
 * UI metadata for Aegis policy packs.
 * Evaluation stays inside the vendored Aegis package via scanSkill(policyId).
 * Taglines are copied from aegis-deterministic POLICY_PACKS; do not add rules here.
 */

export const DEFAULT_SKILL_POLICY_ID = "standard";

export const SKILL_POLICY_PACKS = [
  {
    id: "standard",
    name: "Standard",
    tagline: "Fail on critical. Review highs.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Fail on high. Review mediums.",
  },
  {
    id: "restricted",
    name: "Restricted",
    tagline: "Air-gapped. Fail on medium.",
  },
  {
    id: "research",
    name: "Research",
    tagline: "Permit high tooling. Still fail criticals.",
  },
] as const;

export type SkillPolicyId = (typeof SKILL_POLICY_PACKS)[number]["id"];

export function isSkillPolicyId(value: string): value is SkillPolicyId {
  return SKILL_POLICY_PACKS.some((pack) => pack.id === value);
}
