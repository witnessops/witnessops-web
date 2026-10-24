"use client";

import Link from "next/link";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_HEALTH_SETTINGS_HREF } from "@/lib/admin/admin-health-display";
import {
  beginSync,
  finishSyncFailure,
  finishSyncSuccess,
  syncStatusMessage,
  type SyncBannerModel,
  type SyncUiState,
} from "@/lib/admin/admin-sync-status";
import { HealthGlyph } from "./admin-health-glyph";
import styles from "./admin.module.css";

interface InboxSyncContextValue {
  ui: SyncUiState;
  run: () => void;
  bannerPresent: boolean;
  setBannerPresent: (present: boolean) => void;
}

const InboxSyncContext = createContext<InboxSyncContextValue | null>(null);

function useInboxSync(): InboxSyncContextValue {
  const value = useContext(InboxSyncContext);
  if (!value) throw new Error("Inbox sync controls are outside the inbox sync provider.");
  return value;
}

export function InboxSyncProvider({ children, initiallyFailing }: { children: ReactNode; initiallyFailing: boolean }) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [ui, setUi] = useState<SyncUiState>({ busy: false, failing: initiallyFailing, status: "" });
  const [bannerPresent, setBannerPresent] = useState(initiallyFailing);

  async function run() {
    if (busyRef.current) return;
    busyRef.current = true;
    setUi((current) => beginSync(current));
    try {
      const response = await fetch("/api/admin/core/inbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `gmail-sync:${crypto.randomUUID()}` }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        error?: string;
        receipt?: { status?: string; counts?: { inboxItemsCreated?: number }; failures?: Array<{ error?: string }> };
      };
      if (!response.ok || !payload.ok || !payload.receipt) {
        setUi(finishSyncFailure(payload.error));
        return;
      }
      if (payload.receipt.status === "completed") {
        setUi(finishSyncSuccess(payload.receipt.counts?.inboxItemsCreated ?? 0));
      } else {
        setUi(finishSyncFailure(payload.receipt.failures?.find((failure) => failure.error?.trim())?.error));
      }
      router.refresh();
    } catch (error) {
      setUi(finishSyncFailure(error instanceof Error ? error.message : null));
    } finally {
      busyRef.current = false;
    }
  }

  return <InboxSyncContext.Provider value={{ ui, run, bannerPresent, setBannerPresent }}>{children}</InboxSyncContext.Provider>;
}

export function InboxSyncButton({ label, emphasis }: { label: string; emphasis: "primary" | "secondary" }) {
  const { ui, run } = useInboxSync();
  const resolved = ui.failing && label !== "Retry sync" ? "secondary" : emphasis;
  const className = resolved === "secondary" ? styles.rowActionSecondary : styles.rowAction;
  return (
    <button type="button" className={`${className} ${styles.syncButton}`} onClick={() => void run()} disabled={ui.busy} aria-busy={ui.busy || undefined}>
      {ui.busy ? "Syncing…" : label}
    </button>
  );
}

export function InboxSyncBanner({ banner }: { banner: SyncBannerModel }) {
  const { ui, setBannerPresent } = useInboxSync();
  useLayoutEffect(() => {
    setBannerPresent(true);
    return () => setBannerPresent(false);
  }, [setBannerPresent]);
  if (!ui.failing) return null;
  const retryFailed = ui.status.startsWith("Retry failed:");
  return (
    <div className={styles.syncBanner} role="alert">
      <HealthGlyph kind="failing" size={22} />
      <div className={styles.syncBannerBody}>
        <h2 className={styles.syncBannerTitle}>{banner.title}</h2>
        <p className={styles.syncBannerText}>{banner.text}</p>
        <p className={styles.syncBannerDetail}>{banner.detail}</p>
        {retryFailed ? <p className={styles.syncBannerFailure} aria-live="polite">{ui.status}</p> : null}
      </div>
      <div className={styles.syncBannerActions}>
        <InboxSyncButton label="Retry sync" emphasis="primary" />
        <Link href={ADMIN_HEALTH_SETTINGS_HREF} className={`${styles.rowActionSecondary} ${styles.syncButton}`}>Open Health</Link>
      </div>
    </div>
  );
}

export function InboxSyncStatusLine({ ui, bannerPresent }: { ui: SyncUiState; bannerPresent: boolean }) {
  const status = syncStatusMessage(ui, bannerPresent);
  if (!status) return null;
  return <p className={styles.syncStatus} role="status" aria-live="polite">{status}</p>;
}

export function InboxSyncStatus() {
  const { ui, bannerPresent } = useInboxSync();
  return <InboxSyncStatusLine ui={ui} bannerPresent={bannerPresent} />;
}

export function InboxEmptyState({ title, text, actionLabel }: { title: string; text: string; actionLabel: "Sync inbox" | null }) {
  return (
    <div className={styles.recordEmpty} role="status">
      <h2 className={styles.recordEmptyTitle}>{title}</h2>
      <p className={styles.recordEmptyText}>{text}</p>
      {actionLabel ? <InboxSyncButton label={actionLabel} emphasis="primary" /> : null}
    </div>
  );
}
