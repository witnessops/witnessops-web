import {
  DEFAULT_SKILL_POLICY_ID,
  SKILL_POLICY_PACKS,
  type SkillPolicyId,
} from "./contract";

export { DEFAULT_SKILL_POLICY_ID, SKILL_POLICY_PACKS };
export type { SkillPolicyId };

export function isSkillPolicyId(value: string): value is SkillPolicyId {
  return SKILL_POLICY_PACKS.some((pack) => pack.id === value);
}
