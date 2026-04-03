import type { ChannelName } from "@/lib/channel-policy";

export const TOKEN_EMAIL_TEMPLATE_VERSION = "tier1-token-v2" as const;

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
    subject: `WitnessOps ${input.channel} verification token for ${input.email}`,
    text: [
      "WITNESSOPS mailbox verification",
      "",
      `Channel: ${input.channel}`,
      `Intake ID: ${input.intakeId}`,
      `Issuance ID: ${input.issuanceId}`,
      `Email: ${input.email}`,
      `Token: ${input.token}`,
      `Expires At: ${input.expiresAt}`,
      "",
      `Verify Link: ${input.verifyUrl}`,
    ].join("\n"),
    templateVersion: TOKEN_EMAIL_TEMPLATE_VERSION,
  };
}
