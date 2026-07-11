import { randomUUID } from "node:crypto";

import {
  getGmailSyncReceiptByIdempotency,
  listInboxItems,
  reconcileGmailInbox,
  recordGmailSyncFailure,
  type CoreActor,
  type GmailSyncFailure,
  type GmailSyncReceipt,
} from "./admin-core-spine";
import {
  applyGmailLifecycleLabels,
  createGmailCliRunner,
  defaultGmailSyncQuery,
  fetchGmailCandidates,
  gmailSyncAccount,
  gmailSyncMaxResults,
  gmailSyncPageLimit,
  type GmailCliRunner,
} from "./gmail-cli-adapter";

export interface GmailInboxSyncOptions {
  idempotencyKey?: string;
  runner?: GmailCliRunner;
}

function now(): string {
  return new Date().toISOString();
}

function syncId(): string {
  return `gmail_sync_${randomUUID().replaceAll("-", "")}`;
}

function failure(
  scope: GmailSyncFailure["scope"],
  error: unknown,
  messageId: string | null = null,
  retryable = true,
): GmailSyncFailure {
  return {
    scope,
    messageId,
    error: error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000),
    retryable,
  };
}

export interface GmailInboxSyncResult {
  receipt: GmailSyncReceipt;
  idempotent: boolean;
}

export async function runGmailInboxSync(
  actor: CoreActor,
  options: GmailInboxSyncOptions = {},
): Promise<GmailInboxSyncResult> {
  const startedAt = now();
  const account = gmailSyncAccount();
  const query = defaultGmailSyncQuery();
  const idempotencyKey = options.idempotencyKey?.trim() || `gmail-sync:${account}:${startedAt}`;
  const prior = await getGmailSyncReceiptByIdempotency(idempotencyKey);
  if (prior) return { receipt: prior, idempotent: true };

  const syncRunId = syncId();
  const runner = options.runner ?? createGmailCliRunner();
  let fetched;
  try {
    fetched = await fetchGmailCandidates(runner, {
      account,
      query,
      maxResults: gmailSyncMaxResults(),
      pageLimit: gmailSyncPageLimit(),
    });
  } catch (error) {
    const completedAt = now();
    const result = await recordGmailSyncFailure({
      syncRunId,
      account,
      startedAt,
      completedAt,
      query,
      failures: [failure("list", error)],
      idempotencyKey,
    }, actor);
    return { receipt: result.receipt, idempotent: result.idempotent };
  }

  const existingItems = await listInboxItems();
  const existingByMessageId = new Map(existingItems.map((item) => [item.gmailMessageId, item]));
  const labelOperations = await applyGmailLifecycleLabels(
    runner,
    fetched.messages,
    existingByMessageId,
    fetched.labelRecords,
    fetched.labelFetchError,
    undefined,
    account,
  );
  const failures: GmailSyncFailure[] = fetched.messageFailures.map((item) => failure("message", item.error, item.messageId, item.retryable));
  if (fetched.labelFetchError) failures.push(failure("labels", fetched.labelFetchError, null, true));
  const labelFailures = labelOperations.filter((operation) => operation.outcome === "failed");
  if (labelFailures.length > 0 && !fetched.labelFetchError) {
    failures.push(failure("labels", `${labelFailures.length} Gmail lifecycle label operation(s) failed.`, null, true));
  }
  const completedAt = now();
  const result = await reconcileGmailInbox({
    syncRunId,
    account,
    startedAt,
    completedAt,
    query,
    messages: fetched.messages,
    inspectedMessageIds: fetched.inspectedMessageIds,
    inspectedThreadIds: fetched.inspectedThreadIds,
    labelOperations,
    failures,
    idempotencyKey,
  }, actor);
  return { receipt: result.receipt, idempotent: result.idempotent };
}
