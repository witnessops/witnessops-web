import type { ChannelName } from "@/lib/channel-policy";
import {
  getCommercialRequestLabel,
  isOperatorHandledCommercialRequestIntent,
} from "@/lib/commercial-request-intents";
import {
  EMAIL_THEME_LIGHT,
  emailBackgroundStyle,
  emailTextStyle,
} from "./email-theme-light";

export const TOKEN_EMAIL_TEMPLATE_VERSION = "tier1-code-v4-light" as const;

export interface VerificationEmailTemplateInput {
  channel: Exclude<ChannelName, "noreply">;
  email: string;
  intakeId: string;
  issuanceId: string;
  token: string;
  expiresAt: string;
  verifyUrl: string;
  intent?: string | null;
  locale?: "en" | "pl" | null;
}

export interface VerificationEmailTemplateOutput {
  subject: string;
  text: string;
  html?: string;
  templateVersion: typeof TOKEN_EMAIL_TEMPLATE_VERSION;
}

const C = EMAIL_THEME_LIGHT;
const EMAIL_FONT_STACK = "Arial, Helvetica, sans-serif";

interface ManualCommercialVerificationCopy {
  subject: string;
  preview: string;
  eyebrow: string;
  heading: string;
  introduction: string;
  codeLabel: string;
  codeBoundary: string;
  steps: readonly [string, string, string];
  textInstructions: readonly [string, string, string];
  verificationPageLabel: string;
  reopenLead: string;
  reopenLink: string;
  reopenTail: string;
  meaningTitle: string;
  meaningLines: readonly string[];
  doNotReply: string;
  referenceLabel: string;
  intakeLabel: string;
  issuanceLabel: string;
  expiresLabel: string;
}

function manualCommercialVerificationCopy(
  input: VerificationEmailTemplateInput,
): ManualCommercialVerificationCopy {
  const locale = input.locale === "pl" ? "pl" : "en";
  const requestLabel = getCommercialRequestLabel(input.intent, locale);

  if (locale === "pl") {
    return {
      subject: "Twój kod do zgłoszenia WitnessOps",
      preview:
        "Kod do zgłoszenia WitnessOps znajduje się w tej wiadomości. Pozostaw stronę zgłoszenia otwartą i wpisz kod.",
      eyebrow: "Weryfikacja WitnessOps",
      heading: `Potwierdź: ${requestLabel}`,
      introduction:
        "Użyj tego kodu na stronie zgłoszenia WitnessOps, która jest już otwarta w przeglądarce.",
      codeLabel: "Kod weryfikacyjny",
      codeBoundary:
        "Link nie jest wymagany. Nie przekazuj ani nie udostępniaj tego kodu.",
      steps: [
        "Wróć do strony zgłoszenia.",
        "Wpisz kod w polu weryfikacyjnym.",
        "Potwierdź, że weryfikacja dotyczy wyłącznie dostępu do skrzynki.",
      ],
      textInstructions: [
        "Wróć do strony zgłoszenia WitnessOps, która jest już otwarta w przeglądarce.",
        "Wpisz kod w polu weryfikacyjnym. Link nie jest wymagany.",
        "Potwierdź, że weryfikacja dotyczy wyłącznie dostępu do skrzynki.",
      ],
      verificationPageLabel: "Otwórz stronę weryfikacji",
      reopenLead: "Strona zgłoszenia nie jest już otwarta?",
      reopenLink: "Otwórz bezpieczną stronę weryfikacji",
      reopenTail: "i wpisz tam kod.",
      meaningTitle: "Co oznacza ta weryfikacja",
      meaningLines: [
        "Ta weryfikacja potwierdza wyłącznie dostęp do skrzynki.",
        "Nie rozpoczyna przeglądu ani pracy.",
        "WitnessOps potwierdzi e-mailem dopasowanie, zakres, płatność i sposób obsługi materiałów przed przyjęciem jakichkolwiek materiałów źródłowych.",
      ],
      doNotReply:
        "Nie odpowiadaj, przesyłając sekrety, eksporty źródłowe, logi, zrzuty ekranu, dane uwierzytelniające, klucze prywatne, kody MFA ani materiały klienta.",
      referenceLabel: "Referencja",
      intakeLabel: "Zgłoszenie",
      issuanceLabel: "Wydanie kodu",
      expiresLabel: "Wygasa",
    };
  }

  return {
    subject: "Your WitnessOps request code",
    preview:
      "Your WitnessOps request code is inside. Keep the request page open and type the code there.",
    eyebrow: "WitnessOps verification",
    heading: `Confirm your ${requestLabel}`,
    introduction:
      "Use this code on the WitnessOps request page that is already open in your browser.",
    codeLabel: "Verification Code",
    codeBoundary: "No link is required. Do not forward or share this code.",
    steps: [
      "Return to the request page.",
      "Enter the code in the verification box.",
      "Confirm the mailbox-only boundary before continuing.",
    ],
    textInstructions: [
      "Return to the WitnessOps request page that is already open in your browser.",
      "Enter the code in the verification box. No link is required.",
      "Confirm the mailbox-only boundary before continuing.",
    ],
    verificationPageLabel: "Open Verification Page",
    reopenLead: "Request page no longer open?",
    reopenLink: "Open the secure verification page",
    reopenTail: "and enter the code there.",
    meaningTitle: "What this verification means",
    meaningLines: [
      "This confirms mailbox access only.",
      "It does not start a proof run.",
      "WitnessOps confirms fit, scope, payment, and evidence handling by email before any source materials are accepted.",
    ],
    doNotReply:
      "Do not reply with secrets, source exports, logs, screenshots, credentials, private keys, MFA codes, or customer evidence.",
    referenceLabel: "Reference",
    intakeLabel: "Intake",
    issuanceLabel: "Issuance",
    expiresLabel: "Expires",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function renderManualCommercialVerificationHtml(
  input: VerificationEmailTemplateInput,
): string {
  const code = escapeHtml(input.token);
  const intakeId = escapeHtml(input.intakeId);
  const issuanceId = escapeHtml(input.issuanceId);
  const expiresAt = escapeHtml(input.expiresAt);
  const verifyUrl = escapeHtml(input.verifyUrl);
  const copy = manualCommercialVerificationCopy(input);

  return [
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">',
    escapeHtml(copy.preview),
    "</div>",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.bg}" style="width:100%;border-collapse:collapse;${emailBackgroundStyle(C.bg)};font-family:${EMAIL_FONT_STACK};${emailTextStyle(C.text)}">`,
    "<tr>",
    '<td align="center" style="padding:24px 16px">',
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.surface}" style="width:100%;max-width:640px;border-collapse:collapse;${emailBackgroundStyle(C.surface)};border:1px solid ${C.borderStrong}">`,
    "<tr>",
    `<td style="padding:22px 24px 18px 24px;border-bottom:1px solid ${C.border}">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;${emailTextStyle(C.trust)}">${escapeHtml(copy.eyebrow)}</div>`,
    `<h1 style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:24px;line-height:30px;font-weight:700;${emailTextStyle(C.text)}">${escapeHtml(copy.heading)}</h1>`,
    `<p style="margin:10px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.introduction)}</p>`,
    "</td>",
    "</tr>",
    "<tr>",
    `<td style="padding:24px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C.surfaceAlt}" style="width:100%;border-collapse:collapse;${emailBackgroundStyle(C.surfaceAlt)};border:1px solid ${C.borderStrong}">`,
    "<tr>",
    `<td style="padding:18px 20px;text-align:center">`,
    `<div style="font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:14px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;${emailTextStyle(C.textMuted)}">${escapeHtml(copy.codeLabel)}</div>`,
    `<div style="margin-top:10px;font-family:'Courier New',Courier,monospace;font-size:28px;line-height:34px;font-weight:700;letter-spacing:0.12em;${emailTextStyle(C.text)}">${code}</div>`,
    `<div style="margin-top:10px;font-family:${EMAIL_FONT_STACK};font-size:12px;line-height:18px;${emailTextStyle(C.textMuted)}">${escapeHtml(copy.codeBoundary)}</div>`,
    "</td>",
    "</tr>",
    "</table>",
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px">`,
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">1</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.steps[0])}</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">2</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.steps[1])}</td>`,
    "</tr>",
    "<tr>",
    `<td width="24" valign="top" style="font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:22px;font-weight:700;${emailTextStyle(C.accent)}">3</td>`,
    `<td style="font-family:${EMAIL_FONT_STACK};font-size:14px;line-height:22px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.steps[2])}</td>`,
    "</tr>",
    "</table>",
    `<p style="margin:16px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.reopenLead)} <a href="${verifyUrl}" style="font-weight:700;${emailTextStyle(C.accent)}">${escapeHtml(copy.reopenLink)}</a> ${escapeHtml(copy.reopenTail)}</p>`,
    `<div style="margin-top:18px;padding:14px 16px;border:1px solid ${C.border};${emailBackgroundStyle(C.surfaceAlt)}">`,
    `<p style="margin:0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;font-weight:700;${emailTextStyle(C.text)}">${escapeHtml(copy.meaningTitle)}</p>`,
    `<p style="margin:6px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${emailTextStyle(C.textSecondary)}">${escapeHtml(copy.meaningLines.join(" "))}</p>`,
    "</div>",
    `<p style="margin:16px 0 0 0;font-family:${EMAIL_FONT_STACK};font-size:13px;line-height:20px;${emailTextStyle(C.textMuted)}">${escapeHtml(copy.doNotReply)}</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;margin-top:18px;border-top:1px solid ${C.border}">`,
    "<tr>",
    `<td style="padding-top:12px;font-family:${EMAIL_FONT_STACK};font-size:11px;line-height:17px;${emailTextStyle(C.textMuted)}">${escapeHtml(copy.referenceLabel)}: ${escapeHtml(copy.intakeLabel)} ${intakeId} / ${escapeHtml(copy.issuanceLabel)} ${issuanceId}<br>${escapeHtml(copy.expiresLabel)}: ${expiresAt}</td>`,
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
  if (
    input.channel === "engage" &&
    isOperatorHandledCommercialRequestIntent(input.intent)
  ) {
    const copy = manualCommercialVerificationCopy(input);

    return {
      subject: copy.subject,
      text: [
        copy.eyebrow,
        "",
        `${copy.heading}.`,
        "",
        `${copy.codeLabel}: ${input.token}`,
        "",
        ...copy.textInstructions,
        `${copy.verificationPageLabel}: ${input.verifyUrl}`,
        "",
        ...copy.meaningLines,
        "",
        copy.doNotReply,
        "",
        copy.referenceLabel,
        `${copy.intakeLabel}: ${input.intakeId}`,
        `${copy.issuanceLabel}: ${input.issuanceId}`,
        `${copy.expiresLabel}: ${input.expiresAt}`,
      ].join("\n"),
      html: renderManualCommercialVerificationHtml(input),
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
