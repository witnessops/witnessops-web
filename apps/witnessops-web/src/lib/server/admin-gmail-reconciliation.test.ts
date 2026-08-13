import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AdminCoreError,
  getAdminCoreStorePath,
  listInboxItems,
  listReviewRequests,
  listGmailSyncReceipts,
  resetAdminCoreStoreForTests,
} from "./admin-core-spine";
import { runGmailInboxSync } from "./admin-gmail-reconciliation";
import {
  gmailSyncAccount,
  parseGmailMessageList,
  parseGmailMessageMetadata,
  type GmailCliRunner,
} from "./gmail-cli-adapter";

const founder = { actor: "founder@test", role: "Founder" as const };
const administrator = { actor: "admin@test", role: "Administrator" as const };
const delegated = { actor: "operator@test", role: "Delegated Operator" as const };

function argsJson(args: string[], name: string): Record<string, unknown> {
  const index = args.indexOf(name);
  return JSON.parse(args[index + 1] ?? "{}") as Record<string, unknown>;
}

function messageRaw(input: { id: string; threadId: string; subject: string; from: string; to: string; snippet: string; labels?: string[]; attachment?: boolean }): string {
  return JSON.stringify({
    id: input.id,
    threadId: input.threadId,
    internalDate: "1783771200000",
    snippet: input.snippet,
    labelIds: input.labels ?? ["INBOX"],
    payload: {
      headers: [
        { name: "From", value: input.from },
        { name: "To", value: input.to },
        { name: "Subject", value: input.subject },
        { name: "Date", value: "Sat, 11 Jul 2026 12:00:00 +0000" },
      ],
      parts: input.attachment ? [{ filename: "scope.pdf", mimeType: "application/pdf", body: { attachmentId: `${input.id}-attachment`, size: 42 } }] : [],
    },
  });
}

class FakeGwsRunner implements GmailCliRunner {
  readonly calls: string[][] = [];
  labelsAvailable = true;
  failMessageId: string | null = null;
  readonly messages = new Map<string, string>([
    ["message-1", messageRaw({ id: "message-1", threadId: "thread-1", subject: "Need a review", from: "Casey <casey@example.com>", to: "engage@mail.witnessops.com", snippet: "Please review our bounded request.", attachment: true })],
    ["message-2", messageRaw({ id: "message-2", threadId: "thread-1", subject: "More scope", from: "Casey <casey@example.com>", to: "engage@mail.witnessops.com", snippet: "Here is additional scope." })],
    ["message-3", messageRaw({ id: "message-3", threadId: "thread-2", subject: "Private vulnerability report", from: "Researcher <researcher@example.com>", to: "engage@mail.witnessops.com, security@witnessops.com", snippet: "Private security disclosure." })],
  ]);

  async run(args: string[]): Promise<string> {
    this.calls.push(args);
    const resource = args.slice(0, 4).join(" ");
    if (resource === "gmail users messages list") {
      return JSON.stringify({ messages: [...this.messages.keys()].map((id) => ({ id, threadId: id === "message-3" ? "thread-2" : "thread-1" })) });
    }
    if (resource === "gmail users messages get") {
      const params = argsJson(args, "--params");
      const messageId = String(params.id);
      if (messageId === this.failMessageId) throw new Error("synthetic metadata failure");
      return this.messages.get(messageId) ?? JSON.stringify({});
    }
    if (resource === "gmail users labels list") {
      if (!this.labelsAvailable) return JSON.stringify({ labels: [] });
      return JSON.stringify({ labels: [
        { id: "label-new", name: "witnessops/new" },
        { id: "label-linked", name: "witnessops/linked" },
        { id: "label-security", name: "witnessops/security-routed" },
      ] });
    }
    if (resource === "gmail users messages modify") {
      const params = argsJson(args, "--params");
      const body = argsJson(args, "--json");
      const messageId = String(params.id);
      const raw = this.messages.get(messageId);
      if (raw) {
        const parsed = JSON.parse(raw) as { labelIds?: string[] };
        parsed.labelIds = [...new Set([...(parsed.labelIds ?? []), ...((body.addLabelIds as string[] | undefined) ?? [])])];
        this.messages.set(messageId, JSON.stringify({ ...JSON.parse(raw), labelIds: parsed.labelIds }));
      }
      return JSON.stringify({});
    }
    throw new Error(`unexpected fake gws args: ${args.join(" ")}`);
  }
}

async function withTemporaryStore<T>(callback: () => Promise<T>): Promise<T> {
  const priorStore = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR;
  const directory = await mkdtemp(path.join(os.tmpdir(), "witnessops-gmail-sync-"));
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = directory;
  try {
    await resetAdminCoreStoreForTests();
    return await callback();
  } finally {
    if (priorStore === undefined) delete process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR;
    else process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = priorStore;
  }
}

test("Gmail metadata parser retains attachment metadata without downloading content", () => {
  const item = parseGmailMessageMetadata(messageRaw({ id: "message-1", threadId: "thread-1", subject: "Subject", from: "Sender <sender@example.com>", to: "engage@mail.witnessops.com", snippet: "Excerpt", attachment: true }));
  assert.equal(item.gmailMessageId, "message-1");
  assert.equal(item.attachments?.[0]?.attachmentId, "message-1-attachment");
  assert.equal(item.attachments?.[0]?.sizeBytes, 42);
  assert.deepEqual(parseGmailMessageList(`${JSON.stringify({ messages: [{ id: "a", threadId: "t" }] })}\n${JSON.stringify({ messages: [{ id: "b", threadId: "t" }] })}`), [{ id: "a", threadId: "t" }, { id: "b", threadId: "t" }]);
});

test("Gmail sync requires administration authority before any read or side effect", async () => {
  await withTemporaryStore(async () => {
    const runner = new FakeGwsRunner();
    await assert.rejects(
      () =>
        runGmailInboxSync(delegated, {
          runner,
          idempotencyKey: "gmail-sync-forbidden",
        }),
      (error: unknown) =>
        error instanceof AdminCoreError &&
        error.code === "ADMINISTRATION_AUTHORITY_REQUIRED" &&
        error.status === 403,
    );
    assert.equal(runner.calls.length, 0);
    assert.equal((await listGmailSyncReceipts()).length, 0);
  });
});

test("Administrator may run Gmail sync", async () => {
  await withTemporaryStore(async () => {
    const runner = new FakeGwsRunner();
    const result = await runGmailInboxSync(administrator, {
      runner,
      idempotencyKey: "gmail-sync-administrator",
    });
    assert.equal(result.idempotent, false);
    assert.ok(runner.calls.length > 0);
  });
});

test("manual Gmail reconciliation creates, updates, excludes, labels, and records idempotent receipts", async () => {
  await withTemporaryStore(async () => {
    const runner = new FakeGwsRunner();
    const first = await runGmailInboxSync(founder, { runner, idempotencyKey: "gmail-sync-test-1" });
    assert.equal(first.idempotent, false);
    assert.equal(first.receipt.status, "completed");
    assert.equal(first.receipt.account, "engage@mail.witnessops.com");
    assert.ok(runner.calls.filter((call) => call.includes("--params")).every((call) => String(argsJson(call, "--params").userId) === gmailSyncAccount()));
    assert.deepEqual(first.receipt.counts, {
      threadsInspected: 2,
      messagesInspected: 3,
      inboxItemsCreated: 2,
      existingItemsUpdated: 0,
      noOp: 0,
      securityMessagesExcluded: 1,
      labelFailures: 0,
    });
    assert.equal(first.receipt.labelOperations.filter((operation) => operation.outcome === "applied").length, 3);
    assert.equal((await listInboxItems()).length, 3);
    assert.equal((await listReviewRequests()).length, 0);

    const callsAfterFirst = runner.calls.length;
    const replay = await runGmailInboxSync(founder, { runner, idempotencyKey: "gmail-sync-test-1" });
    assert.equal(replay.idempotent, true);
    assert.equal(runner.calls.length, callsAfterFirst);

    runner.messages.set("message-1", messageRaw({ id: "message-1", threadId: "thread-1", subject: "Updated request", from: "Casey <casey@example.com>", to: "engage@mail.witnessops.com", snippet: "Updated bounded request.", attachment: true }));
    const second = await runGmailInboxSync(founder, { runner, idempotencyKey: "gmail-sync-test-2" });
    assert.equal(second.receipt.counts.existingItemsUpdated, 1);
    assert.equal(second.receipt.counts.noOp, 1);
    assert.equal(second.receipt.counts.securityMessagesExcluded, 1);
    assert.equal((await listInboxItems()).find((item) => item.gmailMessageId === "message-1")?.subject, "Updated request");

    runner.labelsAvailable = false;
    const labelFailure = await runGmailInboxSync(founder, { runner, idempotencyKey: "gmail-sync-test-3" });
    assert.equal(labelFailure.receipt.status, "partial");
    assert.equal(labelFailure.receipt.counts.labelFailures, 3);
    assert.equal(labelFailure.receipt.failures.length, 1);
    assert.equal((await listGmailSyncReceipts()).length, 3);
  });
});

test("Gmail metadata failures retain all inspected message and thread IDs", async () => {
  await withTemporaryStore(async () => {
    const runner = new FakeGwsRunner();
    runner.failMessageId = "message-2";
    const result = await runGmailInboxSync(founder, { runner, idempotencyKey: "gmail-sync-metadata-failure" });
    assert.equal(result.receipt.status, "partial");
    assert.deepEqual(result.receipt.messageIdsInspected, ["message-1", "message-2", "message-3"]);
    assert.deepEqual(result.receipt.threadIdsInspected, ["thread-1", "thread-2"]);
    assert.equal(result.receipt.counts.messagesInspected, 3);
    assert.deepEqual(result.receipt.failures.map((failure) => failure.scope), ["message"]);
  });
});

test("production admin core storage fails closed without an explicit directory", () => {
  const env = process.env as Record<string, string | undefined>;
  const priorNodeEnv = env.NODE_ENV;
  const priorStore = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR;
  const priorIntake = process.env.WITNESSOPS_INTAKE_STORE_DIR;
  env.NODE_ENV = "production";
  delete process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR;
  process.env.WITNESSOPS_INTAKE_STORE_DIR = "/tmp/existing-intake-store-do-not-use-for-admin";
  try {
    assert.throws(() => getAdminCoreStorePath(), /WITNESSOPS_ADMIN_CORE_STORE_DIR/);
  } finally {
    if (priorNodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = priorNodeEnv;
    if (priorStore === undefined) delete process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR;
    else process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = priorStore;
    if (priorIntake === undefined) delete process.env.WITNESSOPS_INTAKE_STORE_DIR;
    else process.env.WITNESSOPS_INTAKE_STORE_DIR = priorIntake;
  }
});
