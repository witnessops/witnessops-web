import type { ChannelName } from "@/lib/channel-policy";

export const TOKEN_EMAIL_TEMPLATE_VERSION = "tier1-code-v1" as const;

export interface VerificationEmailTemplateInput {
  channel: Exclude<ChannelName, "noreply">;
  email: string;
  intakeId: string;
  issuanceId: string;
  token: string;
  expiresAt: string;
  verifyUrl: string;
}

export interface VerificationEmailTemplateOutput {
  subject: string;
  text: string;
  templateVersion: typeof TOKEN_EMAIL_TEMPLATE_VERSION;
}

/**
 * Deterministic and versioned email content.
 * The rendered template is an issuance input, not a proof artifact.
 */
export function renderVerificationEmail(
  input: VerificationEmailTemplateInput,
): VerificationEmailTemplateOutput {
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
