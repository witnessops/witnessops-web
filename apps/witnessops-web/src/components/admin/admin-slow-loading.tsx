"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export function AdminSlowLoading({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      {slow ? (
        <div className={styles.slowLoading} role="status">
          <p>Still loading...</p>
          <button type="button" className={styles.rowAction} onClick={() => router.refresh()}>Retry</button>
        </div>
      ) : null}
    </>
  );
}
