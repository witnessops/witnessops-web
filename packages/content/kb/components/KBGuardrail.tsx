import type { ReactNode } from "react";
import styles from "./kb-components.module.css";

export function KBGuardrail({ children }: { children: ReactNode }) {
  return (
    <div className={styles.guardrail}>
      <div className={styles.guardrailLabel}>Evidence-Mapping Template Only</div>
      {children}
    </div>
  );
}
