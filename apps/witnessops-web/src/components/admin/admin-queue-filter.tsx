"use client";

import { useState } from "react";
import styles from "./admin.module.css";

export interface FilterGroup {
  key: string;
  label: string;
  intakeIds: string[];
}

interface Props {
  groups: FilterGroup[];
}

export function AdminQueueFilter({ groups }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const nonEmpty = groups.filter((g) => g.intakeIds.length > 0);
  if (nonEmpty.length === 0) return null;

  function toggle(key: string) {
    const next = activeKey === key ? null : key;
    setActiveKey(next);

    const items = document.querySelectorAll<HTMLElement>("[data-intake-id]");
    if (!next) {
      for (const el of items) el.style.display = "";
      return;
    }

    const group = nonEmpty.find((g) => g.key === next);
    const allowed = new Set(group?.intakeIds ?? []);
    for (const el of items) {
      el.style.display = allowed.has(el.dataset.intakeId ?? "")
        ? ""
        : "none";
    }
  }

  return (
    <div className={styles.filterBar}>
      {nonEmpty.map((g) => (
        <button
          key={g.key}
          type="button"
          className={`${styles.filterPill}${activeKey === g.key ? ` ${styles.filterPillActive}` : ""}`}
          onClick={() => toggle(g.key)}
        >
          {g.label} ({g.intakeIds.length})
        </button>
      ))}
      {activeKey ? (
        <button
          type="button"
          className={styles.filterPill}
          onClick={() => toggle(activeKey)}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
