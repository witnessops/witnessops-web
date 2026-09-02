import {
  EMAIL_LIGHT_COLOR_SCHEME,
  EMAIL_THEME_LIGHT,
  emailBackgroundStyle,
  emailTextStyle,
} from "./email-theme-light";

export type EmailSignatureProfile =
  | "none"
  | "ops_minimal"
  | "personal_admin"
  | "founder_default"
  | "security_buyer";

const TEXT_SIGNATURES: Record<EmailSignatureProfile, string> = {
  none: "",
  ops_minimal: [
    "WitnessOps",
    "Security and operational reviews",
    "engage@mail.witnessops.com",
    "https://witnessops.com",
    "Proof beats memory.",
    "Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.",
  ].join("\n"),
  personal_admin: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "ks@witnessops.com",
    "https://witnessops.com",
    "Proof beats memory.",
  ].join("\n"),
  founder_default: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "Security and operational reviews",
    "Proof beats memory.",
    "ks@witnessops.com",
    "https://witnessops.com",
  ].join("\n"),
  security_buyer: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "Bounded security and operational reviews with evidence references and clear limits.",
    "Proof beats memory.",
    "ks@witnessops.com",
    "https://witnessops.com",
  ].join("\n"),
};

type HtmlSignatureLine = {
  text: string;
  href?: string;
};

type HtmlSignatureConfig = {
  name: string;
  role: string;
  brand?: string;
  proofLine?: string;
  detailLine?: string;
  contact: HtmlSignatureLine[];
  location?: string;
  accentColor: string;
  proofColor?: string;
};

/** HTML email chrome uses the shared light paper theme. */
const WO_EMAIL_COLORS = {
  bg: EMAIL_THEME_LIGHT.bg,
  surface: EMAIL_THEME_LIGHT.surface,
  surfaceHover: EMAIL_THEME_LIGHT.surfaceHover,
  text: EMAIL_THEME_LIGHT.text,
  textSecondary: EMAIL_THEME_LIGHT.textSecondary,
  textMuted: EMAIL_THEME_LIGHT.textMuted,
  accent: EMAIL_THEME_LIGHT.accent,
  trust: EMAIL_THEME_LIGHT.trust,
  border: EMAIL_THEME_LIGHT.border,
  borderStrong: EMAIL_THEME_LIGHT.borderStrong,
  success: EMAIL_THEME_LIGHT.success,
  warning: EMAIL_THEME_LIGHT.warning,
  danger: EMAIL_THEME_LIGHT.danger,
} as const;

const HTML_SIGNATURES: Record<
  Exclude<EmailSignatureProfile, "none">,
  HtmlSignatureConfig
> = {
  ops_minimal: {
    name: "WitnessOps",
    role: "Security and operational reviews",
    brand: undefined,
    proofLine: "Proof beats memory.",
    detailLine:
      "Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.",
    contact: [
      { text: "engage@mail.witnessops.com", href: "mailto:engage@mail.witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
      { text: "Start a review", href: "https://witnessops.com/review/request" },
    ],
    accentColor: WO_EMAIL_COLORS.trust,
  },
  personal_admin: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    proofLine: "Proof beats memory.",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
    ],
    accentColor: WO_EMAIL_COLORS.textMuted,
  },
  founder_default: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    proofLine: "Proof beats memory.",
    detailLine: "Security and operational reviews with evidence references and clear limits.",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
    ],
    accentColor: WO_EMAIL_COLORS.accent,
  },
  security_buyer: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    proofLine: "Proof beats memory.",
    detailLine:
      "Bounded security and operational reviews with evidence references and named limits.",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
    ],
    accentColor: WO_EMAIL_COLORS.trust,
    proofColor: WO_EMAIL_COLORS.trust,
  },
};

const SIGNATURE_FONT_STACK = "Arial, Helvetica, sans-serif";
const SIGNATURE_TEXT_COLOR = WO_EMAIL_COLORS.text;
const SIGNATURE_SECONDARY_COLOR = WO_EMAIL_COLORS.textSecondary;
const SIGNATURE_MUTED_COLOR = WO_EMAIL_COLORS.textMuted;
const SIGNATURE_LINK_COLOR = WO_EMAIL_COLORS.trust;
const SIGNATURE_RULE_COLOR = WO_EMAIL_COLORS.border;
const SIGNATURE_STRONG_RULE_COLOR = WO_EMAIL_COLORS.borderStrong;
const SIGNATURE_LIGHT_COLOR_SCHEME = EMAIL_LIGHT_COLOR_SCHEME;

function textColorStyle(color: string): string {
  return emailTextStyle(color);
}

function solidBackgroundStyle(color: string): string {
  return emailBackgroundStyle(color);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineText(value: string): string {
  const tokenPattern = /(https?:\/\/[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let rendered = "";
  let lastIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    rendered += escapeHtml(value.slice(lastIndex, index));
    const href = token.includes("@") && !token.startsWith("http")
      ? `mailto:${token}`
      : token;
    rendered += `<a href="${escapeHtml(href)}" style="${textColorStyle(SIGNATURE_LINK_COLOR)};text-decoration:none">${escapeHtml(token)}</a>`;
    lastIndex = index + token.length;
  }

  return rendered + escapeHtml(value.slice(lastIndex));
}

function renderContactLink(
  line: HtmlSignatureLine,
): string {
  const text = escapeHtml(line.text);
  if (!line.href) {
    return `<span style="${textColorStyle(SIGNATURE_MUTED_COLOR)};font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px">${text}</span>`;
  }

  return `<a href="${escapeHtml(line.href)}" style="${textColorStyle(SIGNATURE_LINK_COLOR)};font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;text-decoration:none">${text}</a>`;
}

function renderContactRow(config: HtmlSignatureConfig): string {
  const separator = `<span style="${textColorStyle(SIGNATURE_RULE_COLOR)};font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px">&nbsp;|&nbsp;</span>`;
  return config.contact
    .map((line) => renderContactLink(line))
    .join(separator);
}

function renderOptionalTextCell(value: string | undefined, style: string): string {
  if (!value) {
    return "";
  }

  return [
    '<tr>',
    `<td style="${style}">${escapeHtml(value)}</td>`,
    "</tr>",
  ].join("");
}

export function getTextSignature(profile: EmailSignatureProfile): string {
  return TEXT_SIGNATURES[profile];
}

export function getHtmlSignature(profile: EmailSignatureProfile): string {
  if (profile === "none") {
    return "";
  }

  const config = HTML_SIGNATURES[profile];
  const proofColor = config.proofColor ?? WO_EMAIL_COLORS.accent;
  return [
    `<table data-witnessops-signature-profile="${profile}" role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${WO_EMAIL_COLORS.bg}" style="margin-top:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;font-family:${SIGNATURE_FONT_STACK};${textColorStyle(SIGNATURE_TEXT_COLOR)};${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${SIGNATURE_LIGHT_COLOR_SCHEME};width:100%;max-width:560px">`,
    "<tr>",
    `<td width="5" bgcolor="${config.accentColor}" style="width:5px;${solidBackgroundStyle(config.accentColor)};border-top:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-bottom:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-left:1px solid ${SIGNATURE_STRONG_RULE_COLOR};font-size:1px;line-height:1px">&nbsp;</td>`,
    `<td bgcolor="${WO_EMAIL_COLORS.surface}" style="${solidBackgroundStyle(WO_EMAIL_COLORS.surface)};${SIGNATURE_LIGHT_COLOR_SCHEME};border-top:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-right:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-bottom:1px solid ${SIGNATURE_STRONG_RULE_COLOR};padding:13px 15px 14px 14px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${WO_EMAIL_COLORS.surface}" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;${solidBackgroundStyle(WO_EMAIL_COLORS.surface)};${SIGNATURE_LIGHT_COLOR_SCHEME}">`,
    "<tr>",
    `<td style="font-family:${SIGNATURE_FONT_STACK};font-size:15px;line-height:20px;font-weight:700;${textColorStyle(SIGNATURE_TEXT_COLOR)};padding:0">${escapeHtml(config.name)}</td>`,
    "</tr>",
    "<tr>",
    `<td style="font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;${textColorStyle(SIGNATURE_SECONDARY_COLOR)};padding:1px 0 0 0">${escapeHtml(config.role)}${config.brand ? ` <span style="${textColorStyle(SIGNATURE_RULE_COLOR)}">·</span> <span style="${textColorStyle(SIGNATURE_TEXT_COLOR)};font-weight:600">${escapeHtml(config.brand)}</span>` : ""}</td>`,
    "</tr>",
    renderOptionalTextCell(
      config.proofLine,
      `font-family:${SIGNATURE_FONT_STACK};font-size:13px;line-height:18px;font-weight:700;${textColorStyle(proofColor)};padding:9px 0 0 0`,
    ),
    renderOptionalTextCell(
      config.detailLine,
      `font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;${textColorStyle(SIGNATURE_SECONDARY_COLOR)};padding:1px 0 0 0`,
    ),
    "<tr>",
    `<td style="border-top:1px solid ${SIGNATURE_RULE_COLOR};font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;${textColorStyle(SIGNATURE_MUTED_COLOR)};padding:8px 0 0 0">${renderContactRow(config)}</td>`,
    "</tr>",
    renderOptionalTextCell(
      config.location,
      `font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;${textColorStyle(SIGNATURE_MUTED_COLOR)};padding:2px 0 0 0`,
    ),
    "</table>",
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

export function textToEmailHtml(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").map(renderInlineText).join("<br>");
      return `<p style="margin:0 0 12px 0">${lines}</p>`;
    })
    .join("\n");
}

export function wrapEmailHtmlDocument(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return "";
  }

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    "<style>",
    `:root{color-scheme:light;supported-color-schemes:light;}`,
    `body{margin:0;padding:0;${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${textColorStyle(SIGNATURE_TEXT_COLOR)};}`,
    `a{${textColorStyle(SIGNATURE_LINK_COLOR)};}`,
    "</style>",
    "</head>",
    `<body bgcolor="${WO_EMAIL_COLORS.bg}" style="margin:0;padding:0;${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${textColorStyle(SIGNATURE_TEXT_COLOR)};${SIGNATURE_LIGHT_COLOR_SCHEME}">`,
    trimmed,
    "</body>",
    "</html>",
  ].join("");
}

export function applyTextSignature(
  text: string,
  profile: EmailSignatureProfile,
): string {
  const signature = getTextSignature(profile);
  if (!signature) {
    return text;
  }

  return `${text.trimEnd()}\n\n${signature}`;
}

export function applyHtmlSignature(
  text: string,
  profile: EmailSignatureProfile,
): string {
  const bodyHtml = textToEmailHtml(text);
  const signature = getHtmlSignature(profile);
  if (!signature) {
    return bodyHtml;
  }

  return bodyHtml ? `${bodyHtml}\n${signature}` : signature;
}
