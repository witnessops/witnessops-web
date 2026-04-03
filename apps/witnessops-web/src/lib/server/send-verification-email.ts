import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID, sign } from "node:crypto";
import { getMailboxConfig } from "../mailboxes";

export interface VerificationEmailPayload {
  to: string;
  from?: string;
  subject: string;
  text: string;
  /** Stable correlation ID generated before send. Embedded in provider-specific metadata for downstream matching. */
  deliveryAttemptId?: string;
}

export interface VerificationEmailDeliveryResult {
  provider: string;
  providerMessageId: string | null;
  deliveredAt: string;
}

export type TextEmailPayload = VerificationEmailPayload;
export type TextEmailDeliveryResult = VerificationEmailDeliveryResult;

function readMailProvider(): "file" | "resend" | "m365" {
  const provider = process.env.WITNESSOPS_MAIL_PROVIDER?.toLowerCase();
  if (!provider) {
    throw new Error("WITNESSOPS_MAIL_PROVIDER is required");
  }
  if (provider === "file" || provider === "resend" || provider === "m365") {
    return provider;
  }

  throw new Error(`Unsupported WITNESSOPS_MAIL_PROVIDER: ${provider}`);
}

function resolveFromEmail(payload: VerificationEmailPayload): string {
  return (
    payload.from?.trim() ||
    process.env.WITNESSOPS_TOKEN_FROM_EMAIL?.trim() ||
    getMailboxConfig().engage
  );
}

async function sendWithFileProvider(
  payload: VerificationEmailPayload,
): Promise<VerificationEmailDeliveryResult> {
  const outputDir =
    process.env.WITNESSOPS_MAIL_OUTPUT_DIR ??
    path.join(process.cwd(), ".witnessops-token-store", "mail-out");
  await mkdir(outputDir, { recursive: true });

  const providerMessageId = `msg_${randomUUID().replace(/-/g, "")}`;
  const deliveredAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const from = resolveFromEmail(payload);
  const eml = [
    `From: ${from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    `Date: ${deliveredAt}`,
    `Message-ID: <${providerMessageId}@witnessops.local>`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    payload.text,
    "",
  ].join("\n");

  await writeFile(
    path.join(outputDir, `${providerMessageId}.eml`),
    eml,
    "utf8",
  );

  return {
    provider: "file",
    providerMessageId,
    deliveredAt,
  };
}

async function sendWithResendProvider(
  payload: VerificationEmailPayload,
): Promise<VerificationEmailDeliveryResult> {
  const apiKey = process.env.WITNESSOPS_RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WITNESSOPS_RESEND_API_KEY is required when WITNESSOPS_MAIL_PROVIDER=resend",
    );
  }

  const deliveredAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const sendBody: Record<string, unknown> = {
    from: resolveFromEmail(payload),
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
  };

  if (payload.deliveryAttemptId) {
    sendBody.tags = [
      { name: "witnessops_delivery_attempt_id", value: payload.deliveryAttemptId },
    ];
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendBody),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${detail}`);
  }

  const body = (await response.json()) as { id?: string };
  return {
    provider: "resend",
    providerMessageId: body.id ?? null,
    deliveredAt,
  };
}

function readM365Config(defaultSenderUserId: string): {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  certPath?: string;
  keyPath?: string;
  senderUserId: string;
} {
  const tenantId = process.env.WITNESSOPS_M365_TENANT_ID?.trim();
  const clientId = process.env.WITNESSOPS_M365_CLIENT_ID?.trim();
  const clientSecret = process.env.WITNESSOPS_M365_CLIENT_SECRET?.trim();
  const certPath = process.env.WITNESSOPS_M365_CERT_PATH?.trim();
  const keyPath = process.env.WITNESSOPS_M365_KEY_PATH?.trim();
  const senderUserId =
    process.env.WITNESSOPS_M365_SENDER_USER_ID?.trim() || defaultSenderUserId;

  if (!tenantId) {
    throw new Error(
      "WITNESSOPS_M365_TENANT_ID is required when WITNESSOPS_MAIL_PROVIDER=m365",
    );
  }
  if (!clientId) {
    throw new Error(
      "WITNESSOPS_M365_CLIENT_ID is required when WITNESSOPS_MAIL_PROVIDER=m365",
    );
  }
  if (!clientSecret && !(certPath && keyPath)) {
    throw new Error(
      "WITNESSOPS_M365_CLIENT_SECRET or WITNESSOPS_M365_CERT_PATH plus WITNESSOPS_M365_KEY_PATH is required when WITNESSOPS_MAIL_PROVIDER=m365",
    );
  }

  return { tenantId, clientId, clientSecret, certPath, keyPath, senderUserId };
}

async function readResponseDetail(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.stringify(await response.json());
    } catch {
      return "(invalid JSON body)";
    }
  }

  try {
    return await response.text();
  } catch {
    return "(unreadable response body)";
  }
}

async function requestM365AccessToken(config: {
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  certPath?: string;
  keyPath?: string;
}): Promise<string> {
  const tokenAudience = `https://login.microsoftonline.com/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: config.clientId,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  if (config.clientSecret) {
    form.set("client_secret", config.clientSecret);
  } else if (config.certPath && config.keyPath) {
    const [certPem, keyPem] = await Promise.all([
      readFile(config.certPath, "utf8"),
      readFile(config.keyPath, "utf8"),
    ]);
    const certDer = Buffer.from(
      certPem
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\s+/g, ""),
      "base64",
    );
    const thumbprint = createHash("sha1").update(certDer).digest("base64url");
    const now = Math.floor(Date.now() / 1000);
    const encodedHeader = Buffer.from(
      JSON.stringify({
        alg: "RS256",
        typ: "JWT",
        x5t: thumbprint,
      }),
    ).toString("base64url");
    const encodedPayload = Buffer.from(
      JSON.stringify({
        aud: tokenAudience,
        iss: config.clientId,
        sub: config.clientId,
        jti: randomUUID(),
        nbf: now - 60,
        iat: now,
        exp: now + 600,
      }),
    ).toString("base64url");
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(signingInput),
      keyPem,
    ).toString("base64url");
    form.set(
      "client_assertion_type",
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    );
    form.set("client_assertion", `${signingInput}.${signature}`);
  }

  const tokenResponse = await fetch(tokenAudience, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!tokenResponse.ok) {
    const detail = await readResponseDetail(tokenResponse);
    throw new Error(
      `Microsoft 365 token request failed: ${tokenResponse.status} ${detail}`,
    );
  }

  const body = (await tokenResponse.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(
      "Microsoft 365 token request succeeded without an access token",
    );
  }

  return body.access_token;
}

function buildM365InternetMessageId(deliveryAttemptId: string): string {
  return `<${deliveryAttemptId}@witnessops.m365>`;
}

async function sendWithM365Provider(
  payload: VerificationEmailPayload,
): Promise<VerificationEmailDeliveryResult> {
  const config = readM365Config(resolveFromEmail(payload));
  const accessToken = await requestM365AccessToken(config);
  const deliveredAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const internetMessageHeaders: Array<{ name: string; value: string }> = [];
  let providerMessageId: string | null = null;

  if (payload.deliveryAttemptId) {
    internetMessageHeaders.push({
      name: "X-WitnessOps-Delivery-Attempt-Id",
      value: payload.deliveryAttemptId,
    });

    providerMessageId = buildM365InternetMessageId(payload.deliveryAttemptId);
    internetMessageHeaders.push({
      name: "X-WitnessOps-Internet-Message-Id",
      value: providerMessageId,
    });
  }

  const message: Record<string, unknown> = {
    subject: payload.subject,
    body: {
      contentType: "Text",
      content: payload.text,
    },
    toRecipients: [
      {
        emailAddress: {
          address: payload.to,
        },
      },
    ],
  };

  if (internetMessageHeaders.length > 0) {
    message.internetMessageHeaders = internetMessageHeaders;
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.senderUserId)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        saveToSentItems: true,
      }),
    },
  );

  if (!response.ok) {
    const detail = await readResponseDetail(response);
    throw new Error(
      `Microsoft 365 delivery failed: ${response.status} ${detail}`,
    );
  }

  return {
    provider: "m365",
    providerMessageId:
      providerMessageId ??
      response.headers.get("request-id") ??
      response.headers.get("client-request-id") ??
      null,
    deliveredAt,
  };
}

export { buildM365InternetMessageId };

export async function sendMail(
  payload: TextEmailPayload,
): Promise<TextEmailDeliveryResult> {
  switch (readMailProvider()) {
    case "file":
      return sendWithFileProvider(payload);
    case "resend":
      return sendWithResendProvider(payload);
    case "m365":
      return sendWithM365Provider(payload);
    default:
      throw new Error("Unreachable mail provider");
  }
}

export async function sendVerificationEmail(
  payload: VerificationEmailPayload,
): Promise<VerificationEmailDeliveryResult> {
  return sendMail(payload);
}
