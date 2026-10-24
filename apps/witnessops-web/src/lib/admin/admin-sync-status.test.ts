import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InboxSyncStatusLine } from "../../components/admin/admin-inbox-sync";
import {
  beginSync,
  consecutiveFailures,
  dashboardAllClear,
  dashboardSyncLine,
  finishSyncFailure,
  finishSyncSuccess,
  inboxEmpty,
  syncBanner,
  syncHistoryBadge,
  syncHistoryRows,
  syncStatusMessage,
  type SyncReceiptView,
} from "./admin-sync-status";
import { AdminSyncHistory } from "../../components/admin/admin-sync-history";

const WINTER = "2026-01-15T19:12:00.000Z";
const SUMMER = "2026-07-15T18:12:00.000Z";

function receipt(status: SyncReceiptView["status"], completedAt = WINTER, error = "", created = 0): SyncReceiptView {
  return {
    syncRunId: `synthetic-run-${status}-${completedAt || "none"}`,
    status,
    startedAt: completedAt,
    completedAt,
    failures: error ? [{ error }] : [],
    counts: {
      threadsInspected: status === "failed" ? 0 : 2,
      inboxItemsCreated: created,
      existingItemsUpdated: 0,
      securityMessagesExcluded: 0,
      labelFailures: 0,
    },
  };
}

test("the failed-sync banner shows only when the newest receipt failed", () => {
  assert.equal(syncBanner([]), null);
  assert.equal(syncBanner([receipt("completed", SUMMER)]), null);
  assert.equal(syncBanner([receipt("partial", SUMMER), receipt("failed")]), null);
  assert.equal(syncBanner([receipt("partial", SUMMER)]), null);
  assert.equal(dashboardSyncLine([receipt("partial", SUMMER)]), null);
  const one = syncBanner([receipt("failed", WINTER, "synthetic-sync-failure-reason")]);
  assert.equal(one?.text, "The last sync attempt failed. New mail may not be arriving.");
  assert.match(one?.detail ?? "", /Last attempt: 15 Jan 2026, 20:12 \(Europe\/Warsaw\)/);
  assert.match(one?.detail ?? "", /Reason: synthetic-sync-failure-reason/);
  assert.match(one?.detail ?? "", /Last successful sync: none in the last 1 runs/);
  const three = [receipt("failed", SUMMER, ""), receipt("failed", WINTER, "synthetic-sync-failure-reason"), receipt("completed", WINTER)];
  assert.equal(consecutiveFailures(three), 2);
  assert.equal(syncBanner(three)?.text, "The last 2 sync attempts failed. New mail may not be arriving.");
  assert.match(syncBanner(three)?.detail ?? "", /Reason: not recorded/);
  assert.match(syncBanner(three)?.detail ?? "", /Last successful sync: 15 Jan 2026, 20:12/);
  const noTime = syncBanner([receipt("failed", "", "")]);
  assert.match(noTime?.detail ?? "", /Last attempt: time not recorded/);
});

test("all-clear requires four zero counters and a succeeded sync with a time", () => {
  assert.equal(dashboardAllClear([0, 0, 0, 0], [receipt("completed", SUMMER, "", 1)]), "Nothing needs you. Last Gmail sync 20:12.");
  assert.equal(dashboardAllClear([0, 0, 1, 0], [receipt("completed", SUMMER)]), null);
  assert.equal(dashboardAllClear([0, 0, 0, 0], [receipt("failed", SUMMER)]), null);
  assert.equal(dashboardAllClear([0, 0, 0, 0], []), null);
  assert.equal(dashboardAllClear([0, 0, 0, 0], [receipt("completed", "")]), null);
  assert.equal(dashboardSyncLine([receipt("failed"), receipt("failed")]), "Gmail sync failing. The last 2 sync attempts failed.");
  assert.equal(dashboardSyncLine([receipt("completed", SUMMER)]), null);
});

test("inbox empty copy follows sync health", () => {
  assert.equal(inboxEmpty(2, []), null);
  assert.deepEqual(inboxEmpty(0, []), {
    title: "Not synced yet.",
    text: "Run a sync to pull messages.",
    actionLabel: "Sync inbox",
  });
  const healthy = inboxEmpty(0, [receipt("completed", SUMMER, "", 3)]);
  assert.equal(healthy?.title, "No messages yet.");
  assert.equal(healthy?.text, "Messages sent to engage@mail.witnessops.com appear here after a Gmail sync. Last sync 20:12, 3 new.");
  assert.equal(healthy?.actionLabel, "Sync inbox");
  const failing = inboxEmpty(0, [receipt("failed", WINTER), receipt("failed", WINTER)]);
  assert.equal(failing?.title, "Inbox is empty, but Gmail sync is failing.");
  assert.match(failing?.text ?? "", /Last successful sync: none in the last 2 runs/);
  assert.equal(failing?.actionLabel, null);
});

test("sync history badge and failed rows avoid zero counts", () => {
  const failed = [receipt("failed", "", ""), receipt("failed", WINTER, "synthetic-sync-failure-reason")];
  assert.deepEqual(syncHistoryBadge(failed), { kind: "failing", label: "2 failed in a row" });
  const rows = syncHistoryRows(failed);
  assert.equal(rows[0]?.result, "Failed");
  assert.deepEqual(rows[0]?.counts, ["—", "—", "—", "—", "—"]);
  assert.equal(rows[0]?.reason, "Reason not recorded");
  assert.equal(rows[0]?.time, "not recorded");
  const mixed = [receipt("failed", WINTER, "synthetic-sync-failure-reason"), receipt("completed", SUMMER, "", 1)];
  assert.deepEqual(syncHistoryBadge(mixed), { kind: "failing", label: "1 of last 2 failed" });
  const fine = syncHistoryRows([receipt("completed", SUMMER, "", 1)]);
  assert.equal(fine[0]?.tone, "connected");
  assert.deepEqual(syncHistoryBadge([receipt("completed", SUMMER)]), { kind: "connected", label: "Last sync succeeded · 15 Jul 2026, 20:12" });
  assert.equal(syncHistoryRows([receipt("completed", "")])[0]?.tone, "neutral");
  const partialOnly = syncHistoryBadge([receipt("partial", SUMMER)]);
  assert.deepEqual(partialOnly, { kind: "neutral", label: "Last sync partial" });
  const history = readFileSync(new URL("../../components/admin/admin-sync-history.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(history, /includes\("failed"\)/);
  assert.match(history, /syncHistoryBadgeTone\(badge\.kind\)/);
  const partialHtml = renderToStaticMarkup(createElement(AdminSyncHistory, { receipts: [receipt("partial", SUMMER)] }));
  assert.match(partialHtml, /Last sync partial/);
  assert.match(partialHtml, /data-kind="configured"/);
  assert.doesNotMatch(partialHtml, /data-kind="failing"/);
  const failedHtml = renderToStaticMarkup(createElement(AdminSyncHistory, { receipts: mixed }));
  assert.match(failedHtml, /1 of last 2 failed/);
  assert.match(failedHtml, /data-kind="failing"/);
});

test("sync buttons share busy, success, and failure states", () => {
  const idle = { busy: false, failing: true, status: "" };
  const busy = beginSync(idle);
  assert.equal(busy.busy, true);
  assert.equal(busy.status, "");
  const success = finishSyncSuccess(4);
  assert.deepEqual(success, { busy: false, failing: false, status: "Gmail sync succeeded. 4 new." });
  const retry = finishSyncFailure("synthetic-sync-failure-reason", "retry");
  assert.equal(retry.busy, false);
  assert.equal(retry.failing, true);
  assert.equal(retry.status, "Retry failed: synthetic-sync-failure-reason");
  assert.equal(finishSyncFailure("  ", "retry").status, "Retry failed: reason not recorded");
  const sync = finishSyncFailure("synthetic-sync-failure-reason", "sync");
  assert.equal(sync.status, "Sync failed: synthetic-sync-failure-reason");
  assert.equal(finishSyncFailure("  ", "sync").status, "Sync failed: reason not recorded");
});

test("a failed first sync from initiallyFailing=false shows the message", () => {
  const provider = readFileSync(new URL("../../components/admin/admin-inbox-sync.tsx", import.meta.url), "utf8");
  assert.match(provider, /const \[bannerPresent, setBannerPresent\] = useState\(initiallyFailing\)/);
  assert.match(provider, /<InboxSyncStatusLine ui=\{ui\} bannerPresent=\{bannerPresent\} \/>/);
  assert.match(provider, /run\(label === "Retry sync" \? "retry" : "sync"\)/);
  const healthy = { busy: false, failing: false, status: "" };
  assert.equal(healthy.failing, false);
  assert.equal(syncStatusMessage(healthy, false), null);
  const synced = finishSyncFailure("synthetic-sync-failure-reason", "sync");
  assert.equal(synced.failing, true);
  assert.equal(syncStatusMessage(synced, false), "Sync failed: synthetic-sync-failure-reason");
  assert.equal(syncStatusMessage(synced, true), null);
  const retried = finishSyncFailure("synthetic-sync-failure-reason", "retry");
  assert.equal(syncStatusMessage(retried, false), "Retry failed: synthetic-sync-failure-reason");
  assert.equal(syncStatusMessage(retried, true), null);
  const syncHtml = renderToStaticMarkup(createElement(InboxSyncStatusLine, { ui: synced, bannerPresent: false }));
  assert.match(syncHtml, /role="status"/);
  assert.match(syncHtml, /Sync failed: synthetic-sync-failure-reason/);
  const retryHtml = renderToStaticMarkup(createElement(InboxSyncStatusLine, { ui: retried, bannerPresent: false }));
  assert.match(retryHtml, /role="status"/);
  assert.match(retryHtml, /Retry failed: synthetic-sync-failure-reason/);
  assert.equal(renderToStaticMarkup(createElement(InboxSyncStatusLine, { ui: synced, bannerPresent: true })), "");
});
