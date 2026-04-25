import { getMailboxConfig } from "@/lib/mailboxes";

import type { EmailSignatureProfile } from "./email-signatures";

export type EmailMessageClass =
  | "internal_notification"
  | "transactional"
  | "personal_admin"
  | "founder_outreach"
  | "security_buyer_outreach"
  | "support";

export interface SignaturePolicyInput {
  from: string;
  to: string;
  messageClass?: EmailMessageClass;
}

export const PERSONAL_ADMIN_DOMAINS = [
  "daft.ie",
  "myhome.ie",
  "bohanhyland.ie",
  "revenue.ie",
  "cro.ie",
  "aib.ie",
  "boi.com",
  "ptsb.ie",
] as const;

export const SECURITY_BUYER_KEYWORDS = [
  "ciso",
  "security",
  "grc",
  "audit",
  "risk",
  "platform",
  "ai",
  "agent",
  "compliance",
] as const;

const MESSAGE_CLASS_SIGNATURES: Record<EmailMessageClass, EmailSignatureProfile> = {
  internal_notification: "none",
  transactional: "ops_minimal",
  personal_admin: "personal_admin",
  founder_outreach: "founder_default",
  security_buyer_outreach: "security_buyer",
  support: "ops_minimal",
};

function normalizeEmailAddress(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const bracketed = trimmed.match(/<([^>]+)>/);
  return bracketed ? bracketed[1].trim().toLowerCase() : trimmed;
}

function emailDomain(email: string): string {
  const normalized = normalizeEmailAddress(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(atIndex + 1) : "";
}

function emailLocalPart(email: string): string {
  const normalized = normalizeEmailAddress(email);
  const atIndex = normalized.lastIndexOf("@");
  return atIndex >= 0 ? normalized.slice(0, atIndex) : normalized;
}

function isConfiguredMailbox(email: string, mailbox: string): boolean {
  return normalizeEmailAddress(email) === normalizeEmailAddress(mailbox);
}

function isNoreplyAddress(email: string): boolean {
  const localPart = emailLocalPart(email);
  return localPart === "noreply" || localPart === "no-reply" || localPart.endsWith("no-reply");
}

export function isSecurityBuyerAddress(email: string): boolean {
  const normalized = normalizeEmailAddress(email);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  return SECURITY_BUYER_KEYWORDS.some((keyword) =>
    keyword.length <= 2 ? tokens.includes(keyword) : normalized.includes(keyword),
  );
}

export function resolveSignatureProfile(
  input: SignaturePolicyInput,
): EmailSignatureProfile {
  if (input.messageClass) {
    return MESSAGE_CLASS_SIGNATURES[input.messageClass];
  }

  const from = normalizeEmailAddress(input.from);
  const toDomain = emailDomain(input.to);
  const mailboxes = getMailboxConfig();

  if (isConfiguredMailbox(from, mailboxes.noreply) || isNoreplyAddress(from)) {
    return "ops_minimal";
  }

  if (isConfiguredMailbox(from, mailboxes.outreach) || emailLocalPart(from) === "outreach") {
    return "founder_default";
  }

  if (isConfiguredMailbox(from, mailboxes.security) || emailLocalPart(from) === "security") {
    return "security_buyer";
  }

  if (PERSONAL_ADMIN_DOMAINS.includes(toDomain as (typeof PERSONAL_ADMIN_DOMAINS)[number])) {
    return "personal_admin";
  }

  if (isSecurityBuyerAddress(input.to)) {
    return "security_buyer";
  }

  if (from === "ks@witnessops.com") {
    return "founder_default";
  }

  return "none";
}
