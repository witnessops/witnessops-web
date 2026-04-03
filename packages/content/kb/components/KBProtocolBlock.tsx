import type { ReactNode } from "react";
import styles from "./kb-components.module.css";

export function KBProtocolBlock({ children }: { children: ReactNode }) {
  return <div className={styles.protocolBlock}>{children}</div>;
}
