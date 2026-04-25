export type EmailSignatureProfile =
  | "none"
  | "ops_minimal"
  | "personal_admin"
  | "founder_default"
  | "security_buyer";

const TEXT_SIGNATURES: Record<EmailSignatureProfile, string> = {
  none: "",
  ops_minimal: [
    "Karol Stefanski",
    "WitnessOps",
    "ks@witnessops.com",
    "witnessops.com",
  ].join("\n"),
  personal_admin: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "Dublin, Ireland",
    "Email: ks@witnessops.com",
    "Web: witnessops.com",
    "Phone: +353 83 040 1096",
  ].join("\n"),
  founder_default: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "Agents act. WitnessOps proves.",
    "Proof layer for consequential AI-agent actions.",
    "Email: ks@witnessops.com",
    "Web: witnessops.com",
    "Phone: +353 83 040 1096",
    "Dublin, Ireland",
  ].join("\n"),
  security_buyer: [
    "Karol Stefanski",
    "Founder · WitnessOps",
    "Signed receipts for consequential AI-agent and security workflows.",
    "Evidence manifests · offline verification · challenge paths",
    "ks@witnessops.com",
    "witnessops.com",
    "+353 83 040 1096",
    "Dublin, Ireland",
  ].join("\n"),
};

type HtmlSignatureLine = {
  text: string;
  href?: string;
};

type HtmlSignatureConfig = {
  name: string;
  role: string;
  brand: string;
  proofLine?: string;
  detailLine?: string;
  contact: HtmlSignatureLine[];
  location?: string;
  accentColor: string;
  proofColor?: string;
};

const WO_EMAIL_COLORS = {
  bg: "#000000",
  surface: "#141419",
  surfaceHover: "#1d1d24",
  text: "#faf7f2",
  textSecondary: "#d0ccc4",
  textMuted: "#8a8680",
  accent: "#f27a3d",
  trust: "#64a8ac",
  border: "#2e2e36",
  borderStrong: "#4a4a55",
  success: "#6bc498",
  warning: "#e3b060",
  danger: "#e07570",
} as const;

const HTML_SIGNATURES: Record<
  Exclude<EmailSignatureProfile, "none">,
  HtmlSignatureConfig
> = {
  ops_minimal: {
    name: "Karol Stefanski",
    role: "WitnessOps",
    brand: "WitnessOps",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
    ],
    accentColor: WO_EMAIL_COLORS.trust,
  },
  personal_admin: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
      { text: "+353 83 040 1096", href: "tel:+353830401096" },
    ],
    location: "Dublin, Ireland",
    accentColor: WO_EMAIL_COLORS.textMuted,
  },
  founder_default: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    proofLine: "Agents act. WitnessOps proves.",
    detailLine: "Proof layer for consequential AI-agent actions.",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
      { text: "+353 83 040 1096", href: "tel:+353830401096" },
    ],
    location: "Dublin, Ireland",
    accentColor: WO_EMAIL_COLORS.accent,
  },
  security_buyer: {
    name: "Karol Stefanski",
    role: "Founder",
    brand: "WitnessOps",
    proofLine: "Signed receipts for consequential AI-agent and security workflows.",
    detailLine: "Evidence manifests · offline verification · challenge paths",
    contact: [
      { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
      { text: "witnessops.com", href: "https://witnessops.com" },
      { text: "+353 83 040 1096", href: "tel:+353830401096" },
    ],
    location: "Dublin, Ireland",
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
const SIGNATURE_DARK_COLOR_SCHEME =
  "color-scheme:dark;supported-color-schemes:dark;forced-color-adjust:none";

function textColorStyle(color: string): string {
  return `color:${color};-webkit-text-fill-color:${color}`;
}

function solidBackgroundStyle(color: string): string {
  return `background-color:${color};background:${color};background-image:linear-gradient(${color},${color})`;
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
    `<table data-witnessops-signature-profile="${profile}" role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${WO_EMAIL_COLORS.bg}" style="margin-top:20px;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;font-family:${SIGNATURE_FONT_STACK};${textColorStyle(SIGNATURE_TEXT_COLOR)};${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${SIGNATURE_DARK_COLOR_SCHEME};width:100%;max-width:560px">`,
    "<tr>",
    `<td width="5" bgcolor="${config.accentColor}" style="width:5px;${solidBackgroundStyle(config.accentColor)};border-top:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-bottom:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-left:1px solid ${SIGNATURE_STRONG_RULE_COLOR};font-size:1px;line-height:1px">&nbsp;</td>`,
    `<td bgcolor="${WO_EMAIL_COLORS.surface}" style="${solidBackgroundStyle(WO_EMAIL_COLORS.surface)};${SIGNATURE_DARK_COLOR_SCHEME};border-top:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-right:1px solid ${SIGNATURE_STRONG_RULE_COLOR};border-bottom:1px solid ${SIGNATURE_STRONG_RULE_COLOR};padding:13px 15px 14px 14px">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${WO_EMAIL_COLORS.surface}" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;${solidBackgroundStyle(WO_EMAIL_COLORS.surface)};${SIGNATURE_DARK_COLOR_SCHEME}">`,
    "<tr>",
    `<td style="font-family:${SIGNATURE_FONT_STACK};font-size:15px;line-height:20px;font-weight:700;${textColorStyle(SIGNATURE_TEXT_COLOR)};padding:0">${escapeHtml(config.name)}</td>`,
    "</tr>",
    "<tr>",
    `<td style="font-family:${SIGNATURE_FONT_STACK};font-size:12px;line-height:18px;${textColorStyle(SIGNATURE_SECONDARY_COLOR)};padding:1px 0 0 0">${escapeHtml(config.role)} <span style="${textColorStyle(SIGNATURE_RULE_COLOR)}">·</span> <span style="${textColorStyle(SIGNATURE_TEXT_COLOR)};font-weight:600">${escapeHtml(config.brand)}</span></td>`,
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
    '<meta name="color-scheme" content="dark">',
    '<meta name="supported-color-schemes" content="dark">',
    "<style>",
    `:root{color-scheme:dark;supported-color-schemes:dark;}`,
    `body{margin:0;padding:0;${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${textColorStyle(SIGNATURE_TEXT_COLOR)};}`,
    `a{${textColorStyle(SIGNATURE_LINK_COLOR)};}`,
    "</style>",
    "</head>",
    `<body bgcolor="${WO_EMAIL_COLORS.bg}" style="margin:0;padding:0;${solidBackgroundStyle(WO_EMAIL_COLORS.bg)};${textColorStyle(SIGNATURE_TEXT_COLOR)};${SIGNATURE_DARK_COLOR_SCHEME}">`,
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
