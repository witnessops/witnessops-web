import { getMailboxConfig, type MailboxConfig } from "./mailboxes";

export const channelNames = ["engage", "support", "noreply"] as const;

export type ChannelName = (typeof channelNames)[number];

export interface ChannelPolicy {
  channel: ChannelName;
  mailboxKey: keyof Pick<MailboxConfig, "engage" | "support" | "noreply">;
  verificationMailboxKey: keyof Pick<
    MailboxConfig,
    "engage" | "support" | "noreply"
  >;
  inboundAllowed: boolean;
  requiresVerifiedMailbox: boolean;
  requiresBusinessEmail: boolean;
  autoAssessment: boolean;
  replyRedirectKey: keyof Pick<MailboxConfig, "engage" | "support"> | null;
}

const CHANNEL_POLICIES: Record<ChannelName, ChannelPolicy> = {
  engage: {
    channel: "engage",
    mailboxKey: "engage",
    verificationMailboxKey: "noreply",
    inboundAllowed: true,
    requiresVerifiedMailbox: true,
    requiresBusinessEmail: true,
    autoAssessment: true,
    replyRedirectKey: null,
  },
  support: {
    channel: "support",
    mailboxKey: "support",
    verificationMailboxKey: "support",
    inboundAllowed: true,
    requiresVerifiedMailbox: true,
    requiresBusinessEmail: false,
    autoAssessment: false,
    replyRedirectKey: null,
  },
  noreply: {
    channel: "noreply",
    mailboxKey: "noreply",
    verificationMailboxKey: "noreply",
    inboundAllowed: false,
    requiresVerifiedMailbox: false,
    requiresBusinessEmail: false,
    autoAssessment: false,
    replyRedirectKey: "support",
  },
};

export function getChannelPolicy(channel: ChannelName): ChannelPolicy {
  return CHANNEL_POLICIES[channel];
}

export function getChannelMailbox(
  channel: ChannelName,
  mailboxes: MailboxConfig = getMailboxConfig(),
): string {
  return mailboxes[getChannelPolicy(channel).mailboxKey];
}

export function getChannelVerificationMailbox(
  channel: ChannelName,
  mailboxes: MailboxConfig = getMailboxConfig(),
): string {
  return mailboxes[getChannelPolicy(channel).verificationMailboxKey];
}

export function getChannelReplyRedirectMailbox(
  channel: ChannelName,
  mailboxes: MailboxConfig = getMailboxConfig(),
): string | null {
  const replyRedirectKey = getChannelPolicy(channel).replyRedirectKey;
  return replyRedirectKey ? mailboxes[replyRedirectKey] : null;
}

export function assertInboundAllowed(channel: ChannelName): void {
  if (!getChannelPolicy(channel).inboundAllowed) {
    throw new Error(`${channel} is outbound-only.`);
  }
}
