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

export function getTextSignature(profile: EmailSignatureProfile): string {
  return TEXT_SIGNATURES[profile];
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
