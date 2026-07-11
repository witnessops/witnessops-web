import { PUBLIC_CONTACT_EMAIL } from "./public-contact";

export interface MailboxConfig {
  alerts: string;
  engage: string;
  security: string;
  hello: string;
  noreply: string;
  outreach: string;
  support: string;
}

function readMailbox(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export function getMailboxConfig(): MailboxConfig {
  return {
    alerts: readMailbox("WITNESSOPS_MAILBOX_ALERTS", "alerts@witnessops.com"),
    engage: readMailbox("WITNESSOPS_MAILBOX_ENGAGE", PUBLIC_CONTACT_EMAIL),
    security: readMailbox("WITNESSOPS_MAILBOX_SECURITY", "security@witnessops.com"),
    hello: readMailbox("WITNESSOPS_MAILBOX_HELLO", PUBLIC_CONTACT_EMAIL),
    noreply: readMailbox(
      "WITNESSOPS_MAILBOX_NOREPLY",
      "witnessopsno-reply@witnessops.com",
    ),
    outreach: readMailbox("WITNESSOPS_MAILBOX_OUTREACH", "outreach@witnessops.com"),
    support: readMailbox("WITNESSOPS_MAILBOX_SUPPORT", PUBLIC_CONTACT_EMAIL),
  };
}
