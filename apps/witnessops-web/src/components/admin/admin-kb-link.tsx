"use client";

import { getSurfaceUrl } from "@witnessops/config";
import styles from "./admin.module.css";

export function AdminKbLink() {
  const knowledgeBaseUrl = getSurfaceUrl("hub", "/knowledge-base");
  const knowledgeBaseLabel = new URL(knowledgeBaseUrl).host + new URL(knowledgeBaseUrl).pathname;

  return (
    <>
      <div className={styles.sectionHeader}>Resources</div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Knowledge Base</span>
        <a
          href={knowledgeBaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.kbLink}
        >
          {knowledgeBaseLabel}
        </a>
      </div>
    </>
  );
}
