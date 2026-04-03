import { Eye, Pencil, ShieldCheck, UserCog, XCircle } from "lucide-react";
import type { ActionClass } from "@/lib/admin/policy";
import styles from "./admin.module.css";

interface PolicyClassBadgeProps {
  actionClass: ActionClass;
}

const config: Record<ActionClass, { label: string; icon: typeof Eye; style: string }> = {
  "view-only": { label: "VIEW ONLY", icon: Eye, style: styles.policyBadgeView },
  "draft-only": { label: "DRAFT ONLY", icon: Pencil, style: styles.policyBadgeDraft },
  "approval-required": { label: "APPROVAL REQUIRED", icon: ShieldCheck, style: styles.policyBadgeApproval },
  "operator-only": { label: "OPERATOR", icon: UserCog, style: styles.policyBadgeOperator },
  "not-enabled": { label: "NOT ENABLED", icon: XCircle, style: styles.policyBadgeDisabled },
};

export function PolicyClassBadge({ actionClass }: PolicyClassBadgeProps) {
  const { label, icon: Icon, style } = config[actionClass];
  return (
    <span className={`${styles.policyBadge} ${style}`}>
      <Icon size={10} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
