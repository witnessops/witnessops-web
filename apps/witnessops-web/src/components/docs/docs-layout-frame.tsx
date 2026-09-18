"use client";

import styles from "./docs-chrome.module.css";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Ask is a conversation, while the rest of /docs keeps its existing navigation. */
export function DocsLayoutFrame({ children, navigation, sidebar }: {
  children: ReactNode; navigation: ReactNode; sidebar: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.replace(/\/$/, "") === "/docs/assistant") return <>{children}</>;
  return <div className={styles.shell}>{navigation}<div className={styles.body}>
    {sidebar}<div className={styles.content}>{children}</div>
  </div></div>;
}
