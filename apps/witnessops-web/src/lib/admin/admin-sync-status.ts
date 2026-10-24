import { formatWarsawClock, formatWarsawDateTime, recordedInstant } from "./admin-warsaw-time";

export interface SyncReceiptView {
  syncRunId: string;
  status: "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string;
  failures: ReadonlyArray<{ error: string }>;
  counts: {
    threadsInspected: number;
    inboxItemsCreated: number;
    existingItemsUpdated: number;
    securityMessagesExcluded: number;
    labelFailures: number;
  };
}

export interface SyncUiState {
  busy: boolean;
  failing: boolean;
  status: string;
}

export interface SyncBannerModel {
  title: "Gmail sync failing";
  text: string;
  detail: string;
}

export interface InboxEmptyModel {
  title: string;
  text: string;
  actionLabel: "Sync inbox" | null;
}

const NOT_RECORDED = "not recorded";

function receiptInstant(receipt: SyncReceiptView): string | null {
  return recordedInstant(receipt.completedAt) ?? recordedInstant(receipt.startedAt);
}

function reasonText(receipt: SyncReceiptView): string {
  const reason = receipt.failures.find((failure) => failure.error.trim())?.error.trim();
  return reason || NOT_RECORDED;
}

export function consecutiveFailures(receipts: readonly SyncReceiptView[]): number {
  let count = 0;
  for (const receipt of receipts) {
    if (receipt.status !== "failed") break;
    count += 1;
  }
  return count;
}

function lastSuccessfulText(receipts: readonly SyncReceiptView[]): string {
  const windowReceipts = receipts.slice(0, 5);
  const success = windowReceipts.find((receipt) => receipt.status === "completed");
  if (!success) return `none in the last ${windowReceipts.length} runs`;
  return formatWarsawDateTime(receiptInstant(success) ?? "") ?? "time not recorded";
}

export function syncBanner(receipts: readonly SyncReceiptView[]): SyncBannerModel | null {
  const newest = receipts[0];
  if (!newest || newest.status !== "failed") return null;
  const count = consecutiveFailures(receipts);
  const attempt = receiptInstant(newest);
  const lastAttempt = attempt ? `${formatWarsawDateTime(attempt)} (Europe/Warsaw)` : "time not recorded";
  return {
    title: "Gmail sync failing",
    text: count === 1
      ? "The last sync attempt failed. New mail may not be arriving."
      : `The last ${count} sync attempts failed. New mail may not be arriving.`,
    detail: `Last attempt: ${lastAttempt} · Reason: ${reasonText(newest)} · Last successful sync: ${lastSuccessfulText(receipts)}`,
  };
}

export function dashboardSyncLine(receipts: readonly SyncReceiptView[]): string | null {
  const newest = receipts[0];
  if (!newest || newest.status !== "failed") return null;
  const count = consecutiveFailures(receipts);
  const attempts = count === 1 ? "The last sync attempt failed." : `The last ${count} sync attempts failed.`;
  return `Gmail sync failing. ${attempts}`;
}

export function dashboardAllClear(counts: readonly number[], receipts: readonly SyncReceiptView[]): string | null {
  if (counts.length === 0 || counts.some((count) => count !== 0)) return null;
  const newest = receipts[0];
  if (!newest || newest.status !== "completed") return null;
  const clock = formatWarsawClock(receiptInstant(newest) ?? "");
  if (!clock) return null;
  return `Nothing needs you. Last Gmail sync ${clock}.`;
}

export function inboxEmpty(messageCount: number, receipts: readonly SyncReceiptView[]): InboxEmptyModel | null {
  if (messageCount !== 0) return null;
  if (receipts.length === 0) {
    return { title: "Not synced yet.", text: "Run a sync to pull messages.", actionLabel: "Sync inbox" };
  }
  const newest = receipts[0];
  if (newest.status === "failed") {
    return {
      title: "Inbox is empty, but Gmail sync is failing.",
      text: `New mail may not be arriving. Last successful sync: ${lastSuccessfulText(receipts)}. Use Retry sync above.`,
      actionLabel: null,
    };
  }
  if (newest.status !== "completed") {
    return {
      title: "No messages yet.",
      text: "Messages sent to engage@mail.witnessops.com appear here after a Gmail sync.",
      actionLabel: "Sync inbox",
    };
  }
  const clock = formatWarsawClock(receiptInstant(newest) ?? "");
  const created = newest.counts.inboxItemsCreated;
  const text = clock
    ? `Messages sent to engage@mail.witnessops.com appear here after a Gmail sync. Last sync ${clock}, ${created} new.`
    : "Messages sent to engage@mail.witnessops.com appear here after a Gmail sync.";
  return { title: "No messages yet.", text, actionLabel: "Sync inbox" };
}

export type SyncHistoryBadgeKind = "connected" | "failing" | "neutral";

export interface SyncHistoryBadgeModel {
  kind: SyncHistoryBadgeKind;
  label: string;
}

export function syncHistoryBadge(receipts: readonly SyncReceiptView[]): SyncHistoryBadgeModel | null {
  const windowReceipts = receipts.slice(0, 5);
  const newest = windowReceipts[0];
  if (!newest) return null;
  const failed = windowReceipts.filter((receipt) => receipt.status === "failed").length;
  switch (newest.status) {
    case "failed":
      if (failed === windowReceipts.length) {
        return { kind: "failing", label: `${consecutiveFailures(receipts)} failed in a row` };
      }
      return { kind: "failing", label: `${failed} of last ${windowReceipts.length} failed` };
    case "completed":
      if (failed > 0) {
        return { kind: "neutral", label: `${failed} of last ${windowReceipts.length} failed earlier` };
      }
      {
        const clock = formatWarsawDateTime(receiptInstant(newest) ?? "");
        return { kind: "connected", label: clock ? `Last sync succeeded · ${clock}` : "Last sync succeeded" };
      }
    case "partial":
      if (failed > 0) {
        return { kind: "neutral", label: `${failed} of last ${windowReceipts.length} failed earlier` };
      }
      return { kind: "neutral", label: "Last sync partial" };
    default: {
      const unreachable: never = newest.status;
      return unreachable;
    }
  }
}

export interface SyncHistoryRowModel {
  time: string;
  result: "Failed" | "Succeeded" | "Partial";
  tone: "failing" | "connected" | "neutral";
  reason: string;
  counts: [string, string, string, string, string];
  runId: string;
}

function countCell(receipt: SyncReceiptView, value: number): string {
  return receipt.status === "failed" ? "—" : String(value);
}

export function syncHistoryRows(receipts: readonly SyncReceiptView[]): SyncHistoryRowModel[] {
  return receipts.slice(0, 5).map((receipt) => {
    const instant = receiptInstant(receipt);
    const time = instant ? formatWarsawDateTime(instant) ?? NOT_RECORDED : NOT_RECORDED;
    const counts: SyncHistoryRowModel["counts"] = [
      countCell(receipt, receipt.counts.threadsInspected),
      countCell(receipt, receipt.counts.inboxItemsCreated),
      countCell(receipt, receipt.counts.existingItemsUpdated),
      countCell(receipt, receipt.counts.securityMessagesExcluded),
      countCell(receipt, receipt.counts.labelFailures),
    ];
    if (receipt.status === "failed") {
      return { time, result: "Failed", tone: "failing", reason: reasonText(receipt) === NOT_RECORDED ? "Reason not recorded" : reasonText(receipt), counts, runId: receipt.syncRunId };
    }
    if (receipt.status === "completed") {
      return {
        time,
        result: "Succeeded",
        tone: instant ? "connected" : "neutral",
        reason: "—",
        counts,
        runId: receipt.syncRunId,
      };
    }
    return { time, result: "Partial", tone: "neutral", reason: reasonText(receipt) === NOT_RECORDED ? "—" : reasonText(receipt), counts, runId: receipt.syncRunId };
  });
}

/**
 * Status line outside the failure banner.
 * A click failure is hidden only when the banner is rendered and already shows it.
 * A first failure from a healthy inbox has no banner, so the message stays visible.
 */
export type SyncFailureAction = "sync" | "retry";

function failurePrefix(action: SyncFailureAction): "Sync failed" | "Retry failed" {
  switch (action) {
    case "sync":
      return "Sync failed";
    case "retry":
      return "Retry failed";
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}

export function isClickFailureStatus(status: string): boolean {
  return status.startsWith("Sync failed:") || status.startsWith("Retry failed:");
}

export function syncStatusMessage(ui: SyncUiState, bannerPresent: boolean): string | null {
  if (!ui.status) return null;
  if (ui.failing && bannerPresent && isClickFailureStatus(ui.status)) return null;
  return ui.status;
}

export function beginSync(state: SyncUiState): SyncUiState {
  return { ...state, busy: true, status: "" };
}

export function finishSyncSuccess(created: number): SyncUiState {
  return { busy: false, failing: false, status: `Gmail sync succeeded. ${created} new.` };
}

export function finishSyncFailure(reason: string | null | undefined, action: SyncFailureAction): SyncUiState {
  const shown = reason?.trim() ? reason.trim() : "reason not recorded";
  return { busy: false, failing: true, status: `${failurePrefix(action)}: ${shown}` };
}
