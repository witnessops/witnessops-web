import {
  formatWarsawClock,
  formatWarsawDateTime,
  formatWarsawDayMonth,
  isSameWarsawDay,
  recordedInstant,
} from "./admin-warsaw-time";

/**
 * Header and sidebar chips count the core console path only:
 * Gmail inbox sync, plus the receipt verifier and receipt archive records.
 * Drive, mail delivery, and the public mailbox cards keep their own Settings cards.
 */
export const CHIP_COUNTED_INTEGRATION_IDS = ["gmail", "receiptVerifier", "receiptArchive"] as const;

/** Health cards live on Settings. Open Health and the header chip use this route. */
export const ADMIN_HEALTH_SETTINGS_HREF = "/admin/settings";

export type HealthDisplayKind =
  | "connected"
  | "configured"
  | "not_checked"
  | "not_set_up"
  | "failing";

export type HealthPayloadState = "connected" | "degraded" | "disconnected" | "unknown";

export interface HealthPayloadItem {
  state: HealthPayloadState;
  lastSuccessfulCheck: string | null;
  lastError: string | null;
  detail: string;
}

export interface SyncReceiptSnapshot {
  status: "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string;
  failures: ReadonlyArray<{ error: string }>;
}

export interface HealthCardView {
  key: string;
  title: string;
  kind: HealthDisplayKind;
  label: string;
  evidence: string;
  detail: string;
  lastError: string | null;
  checkAt: string | null;
}

export interface HealthChipModel {
  text: string;
  kind: HealthDisplayKind;
  tone: "rose" | "neutral";
}

export interface HealthSummaryModel {
  integrationsLabel: string;
  badges: Array<{ kind: HealthDisplayKind; label: string }>;
  connectedText: string;
}

const TITLES: Record<string, string> = {
  gmail: "Gmail",
  drive: "Google Drive",
  mailDelivery: "Mail delivery",
  receiptVerifier: "Receipt verifier",
  receiptArchive: "Receipt archive",
  publicContactRoute: "Public contact route",
  publicFallbackMailbox: "Public fallback mailbox",
  securityDisclosureMailbox: "Security disclosure mailbox",
};

/**
 * UI-side constants. The health payload has no configured flag.
 * connectedIsRule: the spine hard-codes "connected" and stamps the current time.
 * That stamp is not a recorded check.
 * unknownMeansConfigured: the spine returns "unknown" when the adapter is set
 * and "disconnected" when it is not.
 */
const CARD_CONSTANTS: Record<string, { gmail?: boolean; connectedIsRule?: boolean; unknownMeansConfigured?: boolean }> = {
  gmail: { gmail: true },
  drive: { unknownMeansConfigured: true },
  mailDelivery: { unknownMeansConfigured: true },
  receiptVerifier: { connectedIsRule: true },
  receiptArchive: { connectedIsRule: true },
  publicContactRoute: { connectedIsRule: true },
  publicFallbackMailbox: { connectedIsRule: true },
  securityDisclosureMailbox: { connectedIsRule: true },
};

const KIND_ORDER: Record<HealthDisplayKind, number> = {
  failing: 0,
  not_set_up: 1,
  not_checked: 2,
  configured: 3,
  connected: 4,
};

export function displayKindForPayload(input: {
  state: HealthPayloadState;
  realCheckAt: string | null;
  configuredWhenUnknown: boolean;
}): HealthDisplayKind {
  switch (input.state) {
    case "disconnected":
      return "not_set_up";
    case "degraded":
      return "failing";
    case "connected":
      return recordedInstant(input.realCheckAt) ? "connected" : "configured";
    case "unknown":
      return input.configuredWhenUnknown ? "configured" : "not_checked";
    default: {
      const unreachable: never = input.state;
      return unreachable;
    }
  }
}

export function connectedLabel(iso: string, now = new Date()): string {
  const clock = formatWarsawClock(iso);
  if (!clock) return "Configured · not checked";
  if (isSameWarsawDay(iso, now)) return `Connected · checked ${clock}`;
  const day = formatWarsawDayMonth(iso);
  return day ? `Connected · checked ${day}, ${clock}` : `Connected · checked ${clock}`;
}

function receiptTime(receipt: SyncReceiptSnapshot): string | null {
  return recordedInstant(receipt.completedAt) ?? recordedInstant(receipt.startedAt);
}

export function deriveGmailHealth(receiptsNewestFirst: readonly SyncReceiptSnapshot[], now = new Date()): {
  kind: HealthDisplayKind;
  label: string;
  evidence: string;
  checkAt: string | null;
} {
  const windowReceipts = receiptsNewestFirst.slice(0, 5);
  const total = windowReceipts.length;
  const newest = windowReceipts[0];
  if (total === 0 || !newest) {
    return {
      kind: "configured",
      label: "Configured · not checked",
      evidence: "Decided by: sync receipts (none recorded).",
      checkAt: null,
    };
  }
  const failed = windowReceipts.filter((receipt) => receipt.status === "failed").length;
  const time = receiptTime(newest);
  switch (newest.status) {
    case "failed": {
      const shown = time ? formatWarsawDateTime(time) : "not recorded";
      return {
        kind: "failing",
        label: `Failing · ${failed} of last ${total} syncs failed`,
        evidence: `Decided by: sync receipts (${failed} of ${total} failed). Last check time: ${shown}.`,
        checkAt: time,
      };
    }
    case "completed":
      if (time) {
        return {
          kind: "connected",
          label: connectedLabel(time, now),
          evidence: `Decided by: sync receipts (newest succeeded). Last check time: ${formatWarsawDateTime(time)}.`,
          checkAt: time,
        };
      }
      return {
        kind: "configured",
        label: "Configured · not checked",
        evidence: "Decided by: sync receipts (newest succeeded, time not recorded).",
        checkAt: null,
      };
    case "partial":
      return {
        kind: "configured",
        label: "Configured · not checked",
        evidence: "Decided by: sync receipts (newest sync partial).",
        checkAt: null,
      };
    default: {
      const unreachable: never = newest.status;
      return unreachable;
    }
  }
}

function payloadEvidence(kind: HealthDisplayKind, state: HealthPayloadState, realCheckAt: string | null): string {
  switch (kind) {
    case "not_set_up":
      return "Decided by: payload status disconnected.";
    case "failing":
      return "Decided by: payload status degraded.";
    case "connected":
      return `Decided by: payload check time ${formatWarsawDateTime(realCheckAt ?? "") ?? "not recorded"}.`;
    case "configured":
      return state === "connected"
        ? "Decided by: payload reports connected but records no check time, so it is treated as configured."
        : "Decided by: payload status unknown; configured in the console.";
    case "not_checked":
      return "Decided by: payload status unknown.";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function payloadLabel(kind: HealthDisplayKind, realCheckAt: string | null, now: Date): string {
  switch (kind) {
    case "connected":
      return realCheckAt ? connectedLabel(realCheckAt, now) : "Configured · not checked";
    case "configured":
      return "Configured · not checked";
    case "not_checked":
      return "Not checked";
    case "not_set_up":
      return "Not set up";
    case "failing":
      return "Failing";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function buildHealthCards(
  health: Record<string, HealthPayloadItem>,
  receiptsNewestFirst: readonly SyncReceiptSnapshot[] = [],
  now = new Date(),
): HealthCardView[] {
  const cards = Object.entries(health).map(([key, item], index) => {
    const constant = CARD_CONSTANTS[key] ?? {};
    const title = TITLES[key] ?? key;
    if (constant.gmail) {
      const gmail = deriveGmailHealth(receiptsNewestFirst, now);
      return { key, title, index, detail: item.detail, lastError: item.lastError, ...gmail };
    }
    const realCheckAt = constant.connectedIsRule ? null : recordedInstant(item.lastSuccessfulCheck);
    const kind = displayKindForPayload({
      state: item.state,
      realCheckAt,
      configuredWhenUnknown: Boolean(constant.unknownMeansConfigured),
    });
    return {
      key,
      title,
      index,
      kind,
      label: payloadLabel(kind, realCheckAt, now),
      evidence: payloadEvidence(kind, item.state, realCheckAt),
      detail: item.detail,
      lastError: item.lastError,
      checkAt: kind === "connected" ? realCheckAt : null,
    };
  });
  return cards
    .sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind] || left.index - right.index)
    .map(({ index: _index, ...card }) => card);
}

export function healthSummary(cards: readonly HealthCardView[]): HealthSummaryModel {
  const count = (kind: HealthDisplayKind) => cards.filter((card) => card.kind === kind).length;
  const badges: HealthSummaryModel["badges"] = [];
  const failing = count("failing");
  const notSetUp = count("not_set_up");
  const notChecked = count("not_checked");
  const configured = count("configured");
  if (failing > 0) badges.push({ kind: "failing", label: `${failing} failing` });
  if (notSetUp > 0) badges.push({ kind: "not_set_up", label: `${notSetUp} not set up` });
  if (notChecked > 0) badges.push({ kind: "not_checked", label: `${notChecked} not checked` });
  if (configured > 0) badges.push({ kind: "configured", label: `${configured} configured, not checked` });
  return {
    integrationsLabel: `${cards.length} integrations:`,
    badges,
    connectedText: `${count("connected")} connected with a check time. Problems first.`,
  };
}

export function healthChip(
  cards: readonly Pick<HealthCardView, "key" | "kind" | "checkAt">[],
): HealthChipModel {
  const counted = new Set<string>(CHIP_COUNTED_INTEGRATION_IDS);
  const included = cards.filter((card) => counted.has(card.key));
  const count = (kind: HealthDisplayKind) => included.filter((card) => card.kind === kind).length;
  const failing = count("failing");
  const notSetUp = count("not_set_up");
  const notChecked = count("not_checked");
  if (failing > 0) {
    const parts = [`${failing} failing`];
    if (notSetUp > 0) parts.push(`${notSetUp} not set up`);
    if (notChecked > 0) parts.push(`${notChecked} not checked`);
    return { text: `Health: ${parts.join(", ")}`, kind: "failing", tone: "rose" };
  }
  if (notSetUp > 0) {
    return { text: `Health: ${notSetUp} not set up`, kind: "not_set_up", tone: "rose" };
  }
  const connected = included.filter((card) => card.kind === "connected");
  if (included.length > 0 && connected.length === included.length) {
    const latest = connected
      .map((card) => card.checkAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const clock = latest ? formatWarsawClock(latest) : null;
    return { text: clock ? `Health: all checked ${clock}` : "Health: all checked", kind: "connected", tone: "neutral" };
  }
  return { text: "Health: not fully checked", kind: "not_checked", tone: "neutral" };
}

export const HEALTH_CHIP_UNAVAILABLE: HealthChipModel = {
  text: "Health: unavailable",
  kind: "failing",
  tone: "rose",
};
