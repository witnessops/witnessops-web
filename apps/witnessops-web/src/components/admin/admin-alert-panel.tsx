"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
// Filter keys are embedded in each alert item by the server component.
import type { AlertItem } from "./admin-alert-bell";
import styles from "./admin.module.css";

type FilterCategory = "all" | "reconciliation" | "evidence" | "system";

const FILTER_TABS: { key: FilterCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reconciliation", label: "Reconciliation" },
  { key: "evidence", label: "Evidence" },
  { key: "system", label: "System" },
];

interface AdminAlertPanelProps {
  alerts: AlertItem[];
}

export function AdminAlertPanel({ alerts }: AdminAlertPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const filtered = useMemo(
    () =>
      activeFilter === "all"
        ? alerts
        : alerts.filter((a) => a.category === activeFilter),
    [alerts, activeFilter],
  );

  function markRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
  }

  function markAllRead() {
    setReadIds(new Set(alerts.map((a) => a.id)));
  }

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  function formatTimestamp(value: string): string {
    return value.replace("T", " ").replace("Z", " UTC");
  }

  return (
    <div ref={containerRef} className={styles.alertBellContainer}>
      <button
        type="button"
        className={styles.alertBellButton}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Alerts: ${unreadCount} unread`}
      >
        <Bell size={14} aria-hidden />
        {unreadCount > 0 ? (
          <span className={styles.alertBellBadge}>{unreadCount}</span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className={styles.alertPanel}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <div className={styles.alertPanelHeader}>
              <span className={styles.alertPanelTitle}>Alerts</span>
              {alerts.length > 0 ? (
                <button
                  type="button"
                  className={styles.alertPanelAction}
                  onClick={markAllRead}
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className={styles.alertPanelTabs}>
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles.filterPill}${activeFilter === tab.key ? ` ${styles.filterPillActive}` : ""}`}
                  onClick={() => setActiveFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.alertPanelBody}>
              {filtered.length === 0 ? (
                <div className={styles.alertPanelEmpty}>No pending alerts.</div>
              ) : (
                filtered.map((alert) => {
                  const isRead = readIds.has(alert.id);
                  return (
                    <div
                      key={alert.id}
                      className={`${styles.alertItem}${isRead ? ` ${styles.alertItemRead}` : ""}`}
                      onClick={() => markRead(alert.id)}
                    >
                      <div className={styles.alertItemMessage}>
                        {alert.intakeId ? (
                          <Link
                            href={`/admin/queue?filter=${alert.filterKey}`}
                            className={styles.alertItemLink}
                            onClick={() => setIsOpen(false)}
                          >
                            {alert.message}
                          </Link>
                        ) : (
                          alert.message
                        )}
                      </div>
                      <div className={styles.alertItemMeta}>
                        <span className={styles.alertItemCategory}>{alert.category}</span>
                        <span>{formatTimestamp(alert.timestamp)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
