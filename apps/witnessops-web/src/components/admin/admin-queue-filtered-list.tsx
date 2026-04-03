"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { FilterGroup } from "@/lib/admin/queue-filter-types";
import styles from "./admin.module.css";

interface Props {
  groups: FilterGroup[];
  initialFilter: string | null;
  children: React.ReactNode;
}

export function AdminQueueFilteredList({ groups, initialFilter, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeKey, setActiveKey] = useState<string | null>(initialFilter);

  const nonEmpty = useMemo(
    () => groups.filter((g) => g.intakeIds.length > 0),
    [groups],
  );

  const activeGroup = useMemo(
    () => (activeKey ? nonEmpty.find((g) => g.key === activeKey) ?? null : null),
    [activeKey, nonEmpty],
  );

  const updateUrl = useCallback(
    (key: string | null) => {
      if (key) {
        router.replace(`${pathname}?filter=${key}`, { scroll: false });
      } else {
        router.replace(pathname, { scroll: false });
      }
    },
    [router, pathname],
  );

  function toggle(key: string) {
    const next = activeKey === key ? null : key;
    setActiveKey(next);
    updateUrl(next);
  }

  // Declarative CSS filtering: React state drives a <style> tag that hides
  // non-matching rows. No DOM queries. Children are server-rendered with
  // data-intake-id attributes; a scoped selector hides/shows them.
  const filterCss = useMemo(() => {
    if (!activeGroup) return null;
    const allowedSet = activeGroup.intakeIds;
    if (allowedSet.length === 0) return null;

    // Show only matching rows by hiding the container's children
    // that don't match, using attribute selectors.
    const allowedSelectors = allowedSet
      .map((id) => `[data-filter-scope] > [data-intake-id="${id}"]`)
      .join(",\n");

    return `
      [data-filter-scope] > [data-intake-id] { display: none; }
      ${allowedSelectors} { display: block; }
    `;
  }, [activeGroup]);

  const hasVisibleRows = activeGroup
    ? activeGroup.intakeIds.length > 0
    : true;

  return (
    <>
      {nonEmpty.length > 0 ? (
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
      ) : null}

      {filterCss ? <style>{filterCss}</style> : null}

      {!hasVisibleRows && activeKey ? (
        <div className={styles.emptyState}>
          No items match the current filter.
        </div>
      ) : null}

      <div className={styles.queueList} data-filter-scope>
        {children}
      </div>
    </>
  );
}
