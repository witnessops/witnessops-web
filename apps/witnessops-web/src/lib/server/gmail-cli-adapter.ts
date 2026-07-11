import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { SECURITY_DISCLOSURE_EMAIL, type GmailInboxImport, type InboxItemRecord, type InboxItemState } from "./admin-core-spine";

const execFileAsync = promisify(execFile);

const DEFAULT_QUERY = `in:inbox to:${PUBLIC_CONTACT_EMAIL} -from:${PUBLIC_CONTACT_EMAIL}`;
const DEFAULT_MAX_RESULTS = 100;
const DEFAULT_PAGE_LIMIT = 10;

export interface GmailCliRunner {
  run(args: string[]): Promise<string>;
}

export class GmailCliError extends Error {
  readonly code: string;
  readonly command: string;

  constructor(code: string, message: string, command: string) {
    super(message);
    this.name = "GmailCliError";
    this.code = code;
    this.command = command;
  }
}

function safeErrorText(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value);
  return text.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]").slice(0, 1000);
}

export function createGmailCliRunner(options: { binary?: string; timeoutMs?: number } = {}): GmailCliRunner {
  const binary = options.binary || process.env.WITNESSOPS_GWS_BIN?.trim() || "gws";
  const timeoutMs = options.timeoutMs ?? 30_000;
  return {
    async run(args: string[]): Promise<string> {
      try {
        const result = await execFileAsync(binary, args, {
          timeout: timeoutMs,
          maxBuffer: 8 * 1024 * 1024,
          windowsHide: true,
        });
        return result.stdout;
      } catch (error) {
        const command = [binary, ...args].join(" ");
        throw new GmailCliError(
          "GWS_COMMAND_FAILED",
          `Gmail CLI command failed: ${safeErrorText(error)}`,
          command,
        );
      }
    },
  };
}

function parseJsonDocuments(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return [JSON.parse(trimmed) as unknown];
  } catch {
    const documents: unknown[] = [];
    for (const line of trimmed.split(/\r?\n/).map((candidate) => candidate.trim()).filter(Boolean)) {
      try {
        documents.push(JSON.parse(line) as unknown);
      } catch {
        // Some CLI versions can print a human warning before JSON. The next
        // pass extracts the first JSON object from that output.
      }
    }
    if (documents.length > 0) return documents;
    const firstObject = trimmed.indexOf("{");
    const firstArray = trimmed.indexOf("[");
    const startCandidates = [firstObject, firstArray].filter((value) => value >= 0);
    const start = startCandidates.length > 0 ? Math.min(...startCandidates) : -1;
    if (start >= 0) {
      try {
        return [JSON.parse(trimmed.slice(start)) as unknown];
      } catch {
        // Fall through to the structured parse error below.
      }
    }
    throw new GmailCliError("GWS_INVALID_JSON", "Gmail CLI returned non-JSON output.", "gws");
  }
}

function objectDocuments(raw: string): Record<string, unknown>[] {
  return parseJsonDocuments(raw).filter(
    (value): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value)),
  );
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export interface GmailMessageListEntry {
  id: string;
  threadId: string;
}

export function parseGmailMessageList(raw: string): GmailMessageListEntry[] {
  const messages: GmailMessageListEntry[] = [];
  for (const document of objectDocuments(raw)) {
    for (const value of readArray(document.messages)) {
      if (!value || typeof value !== "object") continue;
      const candidate = value as Record<string, unknown>;
      if (typeof candidate.id !== "string" || typeof candidate.threadId !== "string") continue;
      messages.push({ id: candidate.id, threadId: candidate.threadId });
    }
  }
  const unique = new Map<string, GmailMessageListEntry>();
  for (const message of messages) unique.set(message.id, message);
  return [...unique.values()];
}

export interface GmailLabelRecord {
  id: string;
  name: string;
  type?: string;
}

export function parseGmailLabels(raw: string): GmailLabelRecord[] {
  const labels: GmailLabelRecord[] = [];
  for (const document of objectDocuments(raw)) {
    for (const value of readArray(document.labels)) {
      if (!value || typeof value !== "object") continue;
      const candidate = value as Record<string, unknown>;
      if (typeof candidate.id !== "string" || typeof candidate.name !== "string") continue;
      labels.push({ id: candidate.id, name: candidate.name, type: typeof candidate.type === "string" ? candidate.type : undefined });
    }
  }
  return labels;
}

interface GmailPayloadPart {
  filename?: unknown;
  mimeType?: unknown;
  body?: unknown;
  parts?: unknown;
}

interface GmailMessageMetadata {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailPayloadPart;
}

function readHeaders(payload: GmailPayloadPart | undefined): Map<string, string> {
  const headers = new Map<string, string>();
  const rawHeaders = payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).headers)
    ? (payload as Record<string, unknown>).headers as unknown[]
    : [];
  for (const value of rawHeaders) {
    if (!value || typeof value !== "object") continue;
    const header = value as Record<string, unknown>;
    if (typeof header.name !== "string" || typeof header.value !== "string") continue;
    headers.set(header.name.toLowerCase(), header.value);
  }
  return headers;
}

function parseAddressList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/,(?=\s*(?:[^,<>]+\s*<)?[^,<>@\s]+@[^,<>\s]+\s*>?)/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function readPartBodySize(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const size = (body as Record<string, unknown>).size;
  return typeof size === "number" ? size : null;
}

function readAttachmentId(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const attachmentId = (body as Record<string, unknown>).attachmentId;
  return typeof attachmentId === "string" && attachmentId.length > 0 ? attachmentId : fallback;
}

function collectAttachments(
  payload: GmailPayloadPart | undefined,
  messageId: string,
  path = "0",
): NonNullable<GmailInboxImport["attachments"]> {
  if (!payload || typeof payload !== "object") return [];
  const attachments: NonNullable<GmailInboxImport["attachments"]> = [];
  const filename = typeof payload.filename === "string" ? payload.filename : "";
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType : "application/octet-stream";
  if (filename) {
    attachments.push({
      attachmentId: readAttachmentId(payload.body, `gmail:${messageId}:attachment:${path}`),
      filename,
      mimeType,
      sizeBytes: readPartBodySize(payload.body),
    });
  }
  const parts = Array.isArray(payload.parts) ? payload.parts as GmailPayloadPart[] : [];
  parts.forEach((part, index) => {
    attachments.push(...collectAttachments(part, messageId, `${path}.${index}`));
  });
  return attachments;
}

function parseReceivedAt(message: GmailMessageMetadata, headers: Map<string, string>): string {
  const internalDate = Number(message.internalDate);
  if (Number.isFinite(internalDate) && internalDate > 0) return new Date(internalDate).toISOString();
  const headerDate = headers.get("date");
  const parsed = headerDate ? Date.parse(headerDate) : Number.NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

export function parseGmailMessageMetadata(raw: string): GmailInboxImport {
  const document = objectDocuments(raw)[0];
  if (!document || typeof document.id !== "string" || typeof document.threadId !== "string") {
    throw new GmailCliError("GWS_INVALID_MESSAGE", "Gmail CLI returned incomplete message metadata.", "gws gmail users messages get");
  }
  const message: GmailMessageMetadata = {
    id: document.id,
    threadId: document.threadId,
    internalDate: typeof document.internalDate === "string" ? document.internalDate : undefined,
    snippet: typeof document.snippet === "string" ? document.snippet : undefined,
    labelIds: Array.isArray(document.labelIds) ? document.labelIds.filter((value): value is string => typeof value === "string") : [],
    payload: document.payload && typeof document.payload === "object" ? document.payload as GmailPayloadPart : undefined,
  };
  const headers = readHeaders(message.payload);
  const subject = headers.get("subject")?.trim() || "(no subject)";
  return {
    gmailMessageId: message.id,
    gmailThreadId: message.threadId,
    sender: headers.get("from")?.trim() || "(unknown sender)",
    recipients: [...parseAddressList(headers.get("to")), ...parseAddressList(headers.get("cc"))],
    subject,
    receivedAt: parseReceivedAt(message, headers),
    excerpt: message.snippet?.trim() || subject,
    gmailLabels: [...(message.labelIds ?? [])],
    attachments: collectAttachments(message.payload, message.id),
  };
}

export function defaultGmailSyncQuery(): string {
  return process.env.WITNESSOPS_GMAIL_SYNC_QUERY?.trim() || DEFAULT_QUERY;
}

export function gmailSyncAccount(): string {
  return process.env.WITNESSOPS_GMAIL_ACCOUNT?.trim() || PUBLIC_CONTACT_EMAIL;
}

export function gmailSyncMaxResults(): number {
  const value = Number(process.env.WITNESSOPS_GMAIL_SYNC_MAX_RESULTS);
  return Number.isInteger(value) && value > 0 && value <= 500 ? value : DEFAULT_MAX_RESULTS;
}

export function gmailSyncPageLimit(): number {
  const value = Number(process.env.WITNESSOPS_GMAIL_SYNC_PAGE_LIMIT);
  return Number.isInteger(value) && value > 0 && value <= 100 ? value : DEFAULT_PAGE_LIMIT;
}

export interface FetchedGmailCandidates {
  messages: GmailInboxImport[];
  inspectedMessageIds: string[];
  inspectedThreadIds: string[];
  labelRecords: GmailLabelRecord[];
  labelFetchError: string | null;
  messageFailures: Array<{ messageId: string; error: string; retryable: boolean }>;
}

export async function fetchGmailCandidates(
  runner: GmailCliRunner,
  options: { account?: string; query?: string; maxResults?: number; pageLimit?: number } = {},
): Promise<FetchedGmailCandidates> {
  const account = options.account || gmailSyncAccount();
  const query = options.query || defaultGmailSyncQuery();
  const maxResults = options.maxResults ?? gmailSyncMaxResults();
  const pageLimit = options.pageLimit ?? gmailSyncPageLimit();
  const listRaw = await runner.run([
    "gmail", "users", "messages", "list",
    "--params", JSON.stringify({ userId: account, q: query, maxResults }),
    "--format", "json",
    "--page-all", "--page-limit", String(pageLimit),
  ]);
  const entries = parseGmailMessageList(listRaw);
  const inspectedMessageIds = entries.map((entry) => entry.id);
  const inspectedThreadIds = [...new Set(entries.map((entry) => entry.threadId))];
  const messages: GmailInboxImport[] = [];
  const messageFailures: Array<{ messageId: string; error: string; retryable: boolean }> = [];
  for (const entry of entries) {
    try {
      const raw = await runner.run([
        "gmail", "users", "messages", "get",
        "--params", JSON.stringify({
          userId: account,
          id: entry.id,
          format: "metadata",
          metadataHeaders: ["From", "To", "Cc", "Subject", "Date"],
        }),
        "--format", "json",
      ]);
      messages.push(parseGmailMessageMetadata(raw));
    } catch (error) {
      messageFailures.push({ messageId: entry.id, error: safeErrorText(error), retryable: true });
    }
  }

  try {
    const labelsRaw = await runner.run([
      "gmail", "users", "labels", "list",
      "--params", JSON.stringify({ userId: account }),
      "--format", "json",
    ]);
    return { messages, inspectedMessageIds, inspectedThreadIds, labelRecords: parseGmailLabels(labelsRaw), labelFetchError: null, messageFailures };
  } catch (error) {
    return {
      messages,
      inspectedMessageIds,
      inspectedThreadIds,
      labelRecords: [],
      labelFetchError: safeErrorText(error),
      messageFailures,
    };
  }
}

export interface GmailLifecycleLabelOperation {
  messageId: string;
  labelName: string;
  labelId: string | null;
  outcome: "applied" | "already_present" | "failed";
  idempotencyKey: string;
  error: string | null;
}

export interface GmailLifecycleLabelConfig {
  newLabel: string;
  reviewedLabel: string;
  linkedLabel: string;
  securityLabel: string;
}

export function gmailLifecycleLabelConfig(): GmailLifecycleLabelConfig {
  return {
    newLabel: process.env.WITNESSOPS_GMAIL_LABEL_NEW?.trim() || "witnessops/new",
    reviewedLabel: process.env.WITNESSOPS_GMAIL_LABEL_REVIEWED?.trim() || "witnessops/reviewed",
    linkedLabel: process.env.WITNESSOPS_GMAIL_LABEL_LINKED?.trim() || "witnessops/linked",
    securityLabel: process.env.WITNESSOPS_GMAIL_LABEL_SECURITY?.trim() || "witnessops/security-routed",
  };
}

export function isSecurityGmailMessage(input: Pick<GmailInboxImport, "sender" | "recipients">): boolean {
  return [input.sender, ...input.recipients].some((value) => value.toLowerCase().split(/[^a-z0-9@.+_-]+/).includes(SECURITY_DISCLOSURE_EMAIL));
}

export function desiredLifecycleLabel(
  message: GmailInboxImport,
  existing: InboxItemRecord | null,
  config = gmailLifecycleLabelConfig(),
): string {
  if (isSecurityGmailMessage(message)) return config.securityLabel;
  const state: InboxItemState = existing?.state ?? "new";
  if (state === "linked" || existing?.reviewRequestId) return config.linkedLabel;
  if (state === "reviewed") return config.reviewedLabel;
  return config.newLabel;
}

export async function applyGmailLifecycleLabels(
  runner: GmailCliRunner,
  messages: GmailInboxImport[],
  existingByMessageId: ReadonlyMap<string, InboxItemRecord>,
  labelRecords: GmailLabelRecord[],
  labelFetchError: string | null,
  config = gmailLifecycleLabelConfig(),
  account = gmailSyncAccount(),
): Promise<GmailLifecycleLabelOperation[]> {
  const labelIds = new Map(labelRecords.map((label) => [label.name, label.id]));
  const operations: GmailLifecycleLabelOperation[] = [];
  for (const message of messages) {
    const labelName = desiredLifecycleLabel(message, existingByMessageId.get(message.gmailMessageId) ?? null, config);
    const idempotencyKey = `gmail-label:${message.gmailMessageId}:${labelName}`;
    const labelId = labelIds.get(labelName) ?? null;
    if (labelFetchError) {
      operations.push({ messageId: message.gmailMessageId, labelName, labelId, outcome: "failed", idempotencyKey, error: labelFetchError });
      continue;
    }
    if (!labelId) {
      operations.push({ messageId: message.gmailMessageId, labelName, labelId: null, outcome: "failed", idempotencyKey, error: `Gmail label not found: ${labelName}` });
      continue;
    }
    if ((message.gmailLabels ?? []).includes(labelId)) {
      operations.push({ messageId: message.gmailMessageId, labelName, labelId, outcome: "already_present", idempotencyKey, error: null });
      continue;
    }
    try {
      await runner.run([
        "gmail", "users", "messages", "modify",
        "--params", JSON.stringify({ userId: account, id: message.gmailMessageId }),
        "--json", JSON.stringify({ addLabelIds: [labelId] }),
        "--format", "json",
      ]);
      operations.push({ messageId: message.gmailMessageId, labelName, labelId, outcome: "applied", idempotencyKey, error: null });
    } catch (error) {
      operations.push({ messageId: message.gmailMessageId, labelName, labelId, outcome: "failed", idempotencyKey, error: safeErrorText(error) });
    }
  }
  return operations;
}
