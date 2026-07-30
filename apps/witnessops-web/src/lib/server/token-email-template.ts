import type { ChannelName } from "@/lib/channel-policy";
import {
  getProofRunRequestLabel,
  isManualProofRunIntent,
} from "@/lib/access-change-proof-run";
import {
  EMAIL_THEME_LIGHT,
  emailBackgroundStyle,
  emailTextStyle,
} from "./email-theme-light";

export const TOKEN_EMAIL_TEMPLATE_VERSION = "tier1-code-v3-light" as const;

export interface VerificationEmailTemplateInput {
  channel: Exclude<ChannelName, "noreply">;
  email: string;
  intakeId: string;
  issuanceId: string;
  token: string;
  expiresAt: string;
  verifyUrl: string;
  intent?: string | null;
}

export interface VerificationEmailTemplateOutput {
  subject: string;
  text: string;
  html?: string;
  templateVersion: typeof TOKEN_EMAIL_TEMPLATE_VERSION;
}

const C = EMAIL_THEME_LIGHT;
const EMAIL_FONT_STACK = "Arial, Helvetica, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderProofRunVerificationHtml(
  input: VerificationEmailTemplateInput,
): string {
  const code = escapeHtml(input.token);
  const intakeId = escapeHtml(input.intakeId);
  const issuanceId = escapeHtml(input.issuanceId);
  const expiresAt = escapeHtml(input.expiresAt);
  const requestLabel = escapeHtml(getProofRunRequestLabel(input.intent));

  return [
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">',
    "Your WitnessOps request code is inside. Keep the request page open and type the code there.",
    "</div>",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.bg}" style="width:100%;border-collapse:collapse;${emailBackgroundStyle(C.bg)};font-family:${EMAIL_FONT_STACK};${emailTextStyle(C.text)}">`,
    "<tr>",
    '<td align="center" style="padding:24px 16px">',
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.surface}" style="width:100%;max-width:640px;border-collapse:collapse;${emailBackgroundStyle(C.surface)};border:1px solid ${C.borderStrong}">`,
    "<tr>",
    `<td style="padding:22px 24px 18px 24px;border-bottom:1px solid ${C.border}">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;${emailTextStyle(C.trust)}">WitnessOps verification</div>`,
    `<h1 style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:24px;line-height:30px;font-weight:700;${emailTextStyle(C.text)}">Confirm your ${requestLabel}</h1>`,
    `<p style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">Use this code on the WitnessOps request page that is already open in your browser.</p>`,
    "</td>",
    "</tr>",
    "<tr>",
    `<td style="padding:24px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.surfaceAlt}" style="width:100%;border-collapse:collapse;${emailBackgroundStyle(C.surfaceAlt)};border:1px solid ${C.borderStrong}">`,
    "<tr>",
    `<td style="padding:18px 20px;text-align:center">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;${emailTextStyle(C.textMuted)}">Verification code</div>`,
    `<div style="margin-top:10px;font-family:'Courier New',Courier,monospace;font-size:28px;line-height:34px;font-weight:700;letter-spacing:0.12em;${emailTextStyle(C.text)}">${code}</div>`,
    `<div style="margin-top:10px;font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:18px;${emailTextStyle(C.textMuted)}">No link is required. Do not forward or share this code.</div>`,
    "</td>",
    "</tr>",
    "</table>",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px">`,
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">1</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">Return to the request page.</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">2</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">Enter the code in the verification box.</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">3</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">Confirm the mailbox-only boundary before continuing.</td>`,
    "</tr>",
    "</table>",
    `<div style="margin-top:18px;padding:14px 16px;border:1px solid ${C.border};${emailBackgroundStyle(C.surfaceAlt)}">`,
    `<p style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;font-weight:700;${emailTextStyle(C.text)}">What this verification means</p>`,
    `<p style="margin:6px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${emailTextStyle(C.textSecondary)}">This confirms mailbox access only. It does not start a proof run. WitnessOps confirms fit, scope, payment, and evidence handling by email before any source materials are accepted.</p>`,
    "</div>",
    `<p style="margin:16px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${emailTextStyle(C.textMuted)}">Do not reply with secrets, source exports, logs, screenshots, credentials, private keys, MFA codes, or customer evidence.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px;border-top:1px solid ${C.border}">`,
    "<tr>",
    `<td style="padding-top:12px;font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:17px;${emailTextStyle(C.textMuted)}">Reference: Intake ${intakeId} / Issuance ${issuanceId}<br>Expires: ${expiresAt}</td>`,
    "</tr>",
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

/**
 * Deterministic and versioned email content.
 * The rendered template is an issuance input, not a proof artifact.
 */
export function renderVerificationEmail(
  input: VerificationEmailTemplateInput,
): VerificationEmailTemplateOutput {
  if (isManualProofRunIntent(input.intent)) {
    const requestLabel = getProofRunRequestLabel(input.intent);

    return {
      subject: "Your WitnessOps request code",
      text: [
        "WitnessOps verification",
        "",
        `Confirm your ${requestLabel}.`,
        "",
        `Verification Code: ${input.token}`,
        "",
        "Return to the WitnessOps request page that is already open in your browser.",
        "Enter the code in the verification box. No link is required.",
        "Confirm the mailbox-only boundary before continuing.",
        "",
        "This confirms mailbox access only.",
        "It does not start a proof run.",
        "WitnessOps confirms fit, scope, payment, and evidence handling by email before any source materials are accepted.",
        "",
        "Do not reply with secrets, source exports, logs, screenshots, credentials, private keys, MFA codes, or customer evidence.",
        "",
        "Reference",
        `Intake: ${input.intakeId}`,
        `Issuance: ${input.issuanceId}`,
        `Expires: ${input.expiresAt}`,
      ].join("\n"),
      html: renderProofRunVerificationHtml(input),
      templateVersion: TOKEN_EMAIL_TEMPLATE_VERSION,
    };
  }

  return {
    subject: `WitnessOps verification code for ${input.email}`,
    text: [
      "WITNESSOPS verification code",
      "",
      `Verification Code: ${input.token}`,
      "",
      "Enter this code on the WitnessOps verification page to confirm the mailbox for this request.",
      "Do not share this code. WitnessOps will never ask for it outside this verification step.",
      "",
      `Channel: ${input.channel}`,
      `Intake ID: ${input.intakeId}`,
      `Issuance ID: ${input.issuanceId}`,
      `Email: ${input.email}`,
      `Expires At: ${input.expiresAt}`,
      "",
      `Open Verification Page: ${input.verifyUrl}`,
    ].join("\n"),
    templateVersion: TOKEN_EMAIL_TEMPLATE_VERSION,
  };
}
