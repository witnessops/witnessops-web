import type { ChannelName } from "@/lib/channel-policy";
import {
  getProofRunRequestLabel,
  isManualProofRunIntent,
} from "@/lib/access-change-proof-run";

export const TOKEN_EMAIL_TEMPLATE_VERSION = "tier1-code-v2" as const;

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

const EMAIL_COLORS = {
  bg: "#000000",
  surface: "#141419",
  surfaceAlt: "#060608",
  border: "#2e2e36",
  borderStrong: "#4a4a55",
  text: "#faf7f2",
  textSecondary: "#d0ccc4",
  textMuted: "#8a8680",
  accent: "#f27a3d",
  trust: "#64a8ac",
} as const;

const EMAIL_FONT_STACK = "Arial, Helvetica, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function textStyle(color: string): string {
  return `color:${color};-webkit-text-fill-color:${color}`;
}

function backgroundStyle(color: string): string {
  return `background-color:${color};background:${color};background-image:linear-gradient(${color},${color})`;
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
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${EMAIL_COLORS.bg}" style="width:100%;border-collapse:collapse;${backgroundStyle(EMAIL_COLORS.bg)};font-family:${EMAIL_FONT_STACK};${textStyle(EMAIL_COLORS.text)}">`,
    "<tr>",
    '<td align="center" style="padding:24px 16px">',
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${EMAIL_COLORS.surfaceAlt}" style="width:100%;max-width:640px;border-collapse:collapse;${backgroundStyle(EMAIL_COLORS.surfaceAlt)};border:1px solid ${EMAIL_COLORS.borderStrong}">`,
    "<tr>",
    `<td style="padding:22px 24px 18px 24px;border-bottom:1px solid ${EMAIL_COLORS.border}">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;${textStyle(EMAIL_COLORS.trust)}">WitnessOps verification</div>`,
    `<h1 style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:24px;line-height:30px;font-weight:700;${textStyle(EMAIL_COLORS.text)}">Confirm your ${requestLabel}</h1>`,
    `<p style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${textStyle(EMAIL_COLORS.textSecondary)}">Use this code on the WitnessOps request page that is already open in your browser.</p>`,
    "</td>",
    "</tr>",
    "<tr>",
    `<td style="padding:24px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${EMAIL_COLORS.surface}" style="width:100%;border-collapse:collapse;${backgroundStyle(EMAIL_COLORS.surface)};border:1px solid ${EMAIL_COLORS.borderStrong}">`,
    "<tr>",
    `<td style="padding:18px 20px;text-align:center">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;${textStyle(EMAIL_COLORS.textMuted)}">Verification code</div>`,
    `<div style="margin-top:10px;font-family:'Courier New',Courier,monospace;font-size:28px;line-height:34px;font-weight:700;letter-spacing:0.12em;${textStyle(EMAIL_COLORS.text)}">${code}</div>`,
    `<div style="margin-top:10px;font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:18px;${textStyle(EMAIL_COLORS.textMuted)}">No link is required. Do not forward or share this code.</div>`,
    "</td>",
    "</tr>",
    "</table>",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px">`,
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${textStyle(EMAIL_COLORS.accent)}">1</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${textStyle(EMAIL_COLORS.textSecondary)}">Return to the request page.</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${textStyle(EMAIL_COLORS.accent)}">2</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${textStyle(EMAIL_COLORS.textSecondary)}">Enter the code in the verification box.</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${textStyle(EMAIL_COLORS.accent)}">3</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${textStyle(EMAIL_COLORS.textSecondary)}">Confirm the mailbox-only boundary before continuing.</td>`,
    "</tr>",
    "</table>",
    `<div style="margin-top:18px;padding:14px 16px;border:1px solid ${EMAIL_COLORS.border};${backgroundStyle(EMAIL_COLORS.bg)}">`,
    `<p style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;font-weight:700;${textStyle(EMAIL_COLORS.text)}">What this verification means</p>`,
    `<p style="margin:6px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${textStyle(EMAIL_COLORS.textSecondary)}">This confirms mailbox access only. It does not start a proof run. WitnessOps confirms fit, scope, payment, and evidence handling by email before any source materials are accepted.</p>`,
    "</div>",
    `<p style="margin:16px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${textStyle(EMAIL_COLORS.textMuted)}">Do not reply with secrets, source exports, logs, screenshots, credentials, private keys, MFA codes, or customer evidence.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px;border-top:1px solid ${EMAIL_COLORS.border}">`,
    "<tr>",
    `<td style="padding-top:12px;font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:17px;${textStyle(EMAIL_COLORS.textMuted)}">Reference: Intake ${intakeId} / Issuance ${issuanceId}<br>Expires: ${expiresAt}</td>`,
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
