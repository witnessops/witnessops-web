import { RESEND_EMAILS_URL } from "./constants";
import { liveBookingFetch } from "./egress";
import type { OutboundMail } from "./mail-copy";

export type MailSendResult = { kind: "accepted"; id: string | null } | { kind: "rejected" } | { kind: "unknown" };

export type MailTransport = {
  send(message: OutboundMail): Promise<MailSendResult>;
};

export function createResendMailTransport(options: {
  apiKey: string;
  from: string;
  replyTo: string;
  fetchImpl?: typeof fetch;
}): MailTransport {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  return {
    async send(message) {
      if (!/^booking-[a-z0-9/_-]{8,180}$/.test(message.idempotencyKey)) return { kind: "rejected" };
      const payload: Record<string, unknown> = {
        from: options.from,
        to: [message.to],
        reply_to: options.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
        tags: [{ name: "witnessops_booking_role", value: message.role }],
      };
      if (message.ics) {
        payload.attachments = [{
          filename: message.ics.filename,
          content: Buffer.from(message.ics.content, "utf8").toString("base64"),
          content_type: `text/calendar; method=${message.ics.method}; charset=UTF-8`,
        }];
      }
      try {
        const response = await liveBookingFetch(RESEND_EMAILS_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
            "idempotency-key": message.idempotencyKey,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8_000),
        }, fetchImpl);
        if (response.status === 409 || response.status === 429 || response.status >= 500) {
          await response.body?.cancel().catch(() => undefined);
          return { kind: "unknown" };
        }
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          return { kind: "rejected" };
        }
        const body = await response.json().catch(() => ({})) as { id?: unknown };
        return { kind: "accepted", id: typeof body.id === "string" ? body.id : null };
      } catch {
        return { kind: "unknown" };
      }
    },
  };
}
