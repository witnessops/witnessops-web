import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  applyHtmlSignature,
  applyTextSignature,
  getHtmlSignature,
  getTextSignature,
  textToEmailHtml,
  type EmailSignatureProfile,
} from "./email-signatures";
import {
  resolveSignatureProfile,
  type EmailMessageClass,
} from "./email-signature-policy";
import { sendMail } from "./send-verification-email";

const originalFetch = global.fetch;

const envKeys = [
  "WITNESSOPS_MAIL_PROVIDER",
  "WITNESSOPS_MAIL_OUTPUT_DIR",
  "WITNESSOPS_TOKEN_FROM_EMAIL",
  "WITNESSOPS_MAILBOX_NOREPLY",
  "WITNESSOPS_MAILBOX_OUTREACH",
  "WITNESSOPS_MAILBOX_SECURITY",
  "WITNESSOPS_RESEND_API_KEY",
  "WITNESSOPS_M365_TENANT_ID",
  "WITNESSOPS_M365_CLIENT_ID",
  "WITNESSOPS_M365_CLIENT_SECRET",
  "WITNESSOPS_M365_SENDER_USER_ID",
] as const;

afterEach(() => {
  global.fetch = originalFetch;
  for (const key of envKeys) {
    delete process.env[key];
  }
});

test("applyTextSignature appends the selected plain-text signature", () => {
  const signed = applyTextSignature("Hello\n", "ops_minimal");

  assert.equal(
    signed,
    `Hello\n\n${getTextSignature("ops_minimal")}`,
  );
  assert.equal(applyTextSignature("Hello\n", "none"), "Hello\n");
});

test("applyHtmlSignature renders safe HTML body and selected signature", () => {
  assert.equal(
    textToEmailHtml("Hello <operator>\nVisit https://witnessops.com"),
    '<p style="margin:0 0 12px 0">Hello &lt;operator&gt;<br>Visit <a href="https://witnessops.com" style="color:#2563eb;text-decoration:none">https://witnessops.com</a></p>',
  );

  const signed = applyHtmlSignature("Hello\n", "founder_default");

  assert.match(
    signed,
    /data-witnessops-signature-profile="founder_default"/,
  );
  assert.match(signed, /<table data-witnessops-signature-profile="founder_default"/);
  assert.match(signed, /role="presentation"/);
  assert.match(signed, /background:#0f766e/);
  assert.match(signed, /border-top:1px solid #d7dde8/);
  assert.match(signed, /Agents act\. WitnessOps proves\./);
  assert.match(signed, /href="mailto:ks@witnessops.com"/);
  assert.equal(applyHtmlSignature("Hello\n", "none"), textToEmailHtml("Hello\n"));
});

test("resolveSignatureProfile applies explicit class and deterministic routing rules", () => {
  assert.equal(
    resolveSignatureProfile({
      from: "security@witnessops.com",
      to: "ciso@example.com",
      messageClass: "personal_admin",
    }),
    "personal_admin",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "witnessopsno-reply@witnessops.com",
      to: "operator@example.com",
    }),
    "ops_minimal",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "outreach@witnessops.com",
      to: "partner@example.com",
    }),
    "founder_default",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "security@witnessops.com",
      to: "buyer@example.com",
    }),
    "security_buyer",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "ks@witnessops.com",
      to: "letting.agent@daft.ie",
    }),
    "personal_admin",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "ks@witnessops.com",
      to: "ciso@example.com",
    }),
    "security_buyer",
  );
  assert.equal(
    resolveSignatureProfile({
      from: "ks@witnessops.com",
      to: "founder@example.com",
    }),
    "founder_default",
  );
});

test("file provider emits signature evidence headers and expected text for every message class", async () => {
  const cases: Array<{
    messageClass: EmailMessageClass;
    profile: EmailSignatureProfile;
  }> = [
    { messageClass: "internal_notification", profile: "none" },
    { messageClass: "transactional", profile: "ops_minimal" },
    { messageClass: "personal_admin", profile: "personal_admin" },
    { messageClass: "founder_outreach", profile: "founder_default" },
    { messageClass: "security_buyer_outreach", profile: "security_buyer" },
    { messageClass: "support", profile: "ops_minimal" },
  ];

  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-signatures-"));
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");

  for (const entry of cases) {
    const result = await sendMail({
      to: "recipient@example.com",
      from: "ks@witnessops.com",
      subject: `Class ${entry.messageClass}`,
      text: `Body for ${entry.messageClass}\n`,
      messageClass: entry.messageClass,
    });

    assert.equal(result.provider, "file");
    assert.ok(result.providerMessageId);

    const raw = await readFile(
      path.join(
        process.env.WITNESSOPS_MAIL_OUTPUT_DIR!,
        `${result.providerMessageId}.eml`,
      ),
      "utf8",
    );

    assert.match(
      raw,
      new RegExp(`^X-WitnessOps-Message-Class: ${entry.messageClass}$`, "m"),
    );
    assert.match(
      raw,
      new RegExp(`^X-WitnessOps-Signature-Profile: ${entry.profile}$`, "m"),
    );
    assert.match(raw, /^Content-Type: multipart\/alternative;/m);
    assert.match(raw, /^Content-Type: text\/plain; charset="utf-8"$/m);
    assert.match(raw, /^Content-Type: text\/html; charset="utf-8"$/m);
    assert.match(raw, new RegExp(`^Body for ${entry.messageClass}$`, "m"));

    const signature = getTextSignature(entry.profile);
    if (signature) {
      assert.match(raw, new RegExp(escapeRegExp(signature)));
      assert.match(raw, new RegExp(escapeRegExp(getHtmlSignature(entry.profile))));
    } else {
      assert.doesNotMatch(raw, /Karol Stefanski/);
    }
  }
});

test("explicit signatureProfile overrides the resolved message class profile", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-signature-override-"));
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");

  const result = await sendMail({
    to: "buyer@example.com",
    from: "outreach@witnessops.com",
    subject: "Override",
    text: "No signature here.",
    messageClass: "founder_outreach",
    signatureProfile: "none",
  });

  assert.ok(result.providerMessageId);
  const raw = await readFile(
    path.join(
      process.env.WITNESSOPS_MAIL_OUTPUT_DIR!,
      `${result.providerMessageId}.eml`,
    ),
    "utf8",
  );

  assert.match(raw, /^X-WitnessOps-Message-Class: founder_outreach$/m);
  assert.match(raw, /^X-WitnessOps-Signature-Profile: none$/m);
  assert.doesNotMatch(raw, /Karol Stefanski/);
});

test("resend provider sends signed text and signature policy tags", async () => {
  process.env.WITNESSOPS_MAIL_PROVIDER = "resend";
  process.env.WITNESSOPS_RESEND_API_KEY = "resend-test-key";

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, init });
    return new Response(JSON.stringify({ id: "resend-msg-123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const result = await sendMail({
    to: "ciso@example.com",
    from: "security@witnessops.com",
    subject: "Security workflow",
    text: "Receipt attached.",
    deliveryAttemptId: "rsp_resend_policy",
    messageClass: "security_buyer_outreach",
  });

  assert.equal(result.provider, "resend");
  assert.equal(result.providerMessageId, "resend-msg-123");
  assert.equal(calls.length, 1);

  const body = JSON.parse(String(calls[0].init?.body)) as {
    text: string;
    html: string;
    tags: Array<{ name: string; value: string }>;
  };
  assert.match(body.text, /Signed receipts for consequential AI-agent/);
  assert.match(body.html, /data-witnessops-signature-profile="security_buyer"/);
  assert.match(body.html, /Signed receipts for consequential AI-agent/);
  assert.deepEqual(body.tags, [
    {
      name: "witnessops_delivery_attempt_id",
      value: "rsp_resend_policy",
    },
    {
      name: "witnessops_signature_profile",
      value: "security_buyer",
    },
    {
      name: "witnessops_message_class",
      value: "security_buyer_outreach",
    },
  ]);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
