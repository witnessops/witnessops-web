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
  strong?: boolean;
};

const HTML_SIGNATURE_LINES: Record<EmailSignatureProfile, HtmlSignatureLine[]> = {
  none: [],
  ops_minimal: [
    { text: "Karol Stefanski", strong: true },
    { text: "WitnessOps" },
    { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
    { text: "witnessops.com", href: "https://witnessops.com" },
  ],
  personal_admin: [
    { text: "Karol Stefanski", strong: true },
    { text: "Founder · WitnessOps" },
    { text: "Dublin, Ireland" },
    { text: "Email: ks@witnessops.com", href: "mailto:ks@witnessops.com" },
    { text: "Web: witnessops.com", href: "https://witnessops.com" },
    { text: "Phone: +353 83 040 1096", href: "tel:+353830401096" },
  ],
  founder_default: [
    { text: "Karol Stefanski", strong: true },
    { text: "Founder · WitnessOps" },
    { text: "Agents act. WitnessOps proves.", strong: true },
    { text: "Proof layer for consequential AI-agent actions." },
    { text: "Email: ks@witnessops.com", href: "mailto:ks@witnessops.com" },
    { text: "Web: witnessops.com", href: "https://witnessops.com" },
    { text: "Phone: +353 83 040 1096", href: "tel:+353830401096" },
    { text: "Dublin, Ireland" },
  ],
  security_buyer: [
    { text: "Karol Stefanski", strong: true },
    { text: "Founder · WitnessOps" },
    {
      text: "Signed receipts for consequential AI-agent and security workflows.",
      strong: true,
    },
    { text: "Evidence manifests · offline verification · challenge paths" },
    { text: "ks@witnessops.com", href: "mailto:ks@witnessops.com" },
    { text: "witnessops.com", href: "https://witnessops.com" },
    { text: "+353 83 040 1096", href: "tel:+353830401096" },
    { text: "Dublin, Ireland" },
  ],
};

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
    rendered += `<a href="${escapeHtml(href)}" style="color:#2563eb;text-decoration:none">${escapeHtml(token)}</a>`;
    lastIndex = index + token.length;
  }

  return rendered + escapeHtml(value.slice(lastIndex));
}

function renderHtmlSignatureLine(line: HtmlSignatureLine): string {
  const text = escapeHtml(line.text);
  const content = line.href
    ? `<a href="${escapeHtml(line.href)}" style="color:#2563eb;text-decoration:none">${text}</a>`
    : line.strong
      ? `<strong>${text}</strong>`
      : text;

  return `<div>${content}</div>`;
}

export function getTextSignature(profile: EmailSignatureProfile): string {
  return TEXT_SIGNATURES[profile];
}

export function getHtmlSignature(profile: EmailSignatureProfile): string {
  const lines = HTML_SIGNATURE_LINES[profile];
  if (lines.length === 0) {
    return "";
  }

  return [
    `<div data-witnessops-signature-profile="${profile}" style="margin-top:16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;color:#111827">`,
    ...lines.map(renderHtmlSignatureLine),
    "</div>",
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
