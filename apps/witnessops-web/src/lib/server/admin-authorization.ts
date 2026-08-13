export const ADMIN_ROLES = [
  "Founder",
  "Delegated Operator",
  "Administrator",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function adminRoleFromEnvironment(
  value = process.env.WITNESSOPS_ADMIN_ROLE,
): AdminRole {
  if (value === undefined || value.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WITNESSOPS_ADMIN_ROLE is required in production.");
    }
    return "Founder";
  }
  if (ADMIN_ROLES.includes(value as AdminRole)) return value as AdminRole;
  throw new Error("WITNESSOPS_ADMIN_ROLE is not a supported admin role.");
}

export function hasAdministrationAuthority(role: AdminRole): boolean {
  return role === "Founder" || role === "Administrator";
}

export function hasBusinessAuthority(role: AdminRole): boolean {
  return role === "Founder" || role === "Delegated Operator";
}

export function isSameOperator(left: string | null, right: string): boolean {
  return Boolean(left?.trim()) && left?.trim().toLowerCase() === right.trim().toLowerCase();
}
