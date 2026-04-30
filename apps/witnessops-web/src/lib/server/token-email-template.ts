import type { ChannelName } from "@/lib/channel-policy";
import { isAccessChangeProofRunIntent } from "@/lib/access-change-proof-run";

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
  templateVersion: typeof TOKEN_EMAIL_TEMPLATE_VERSION;
}

/**
 * Deterministic and versioned email content.
 * The rendered template is an issuance input, not a proof artifact.
 */
export function renderVerificationEmail(
  input: VerificationEmailTemplateInput,
): VerificationEmailTemplateOutput {
  if (isAccessChangeProofRunIntent(input.intent)) {
    return {
      subject: "Verify your WitnessOps access-change proof run request",
      text: [
        "WitnessOps access-change proof run verification",
        "",
        "Your WitnessOps access-change proof run request needs mailbox verification.",
        "",
        `Verification Code: ${input.token}`,
        "",
        "Return to the WitnessOps request page and type the code shown above.",
        "Keep the request page open until verification is complete.",
        "Do not share this code. WitnessOps will never ask for it outside this verification step.",
        "",
        "Do not reply with secrets, source exports, logs, screenshots, credentials, or customer evidence.",
        "A proof run has not started. WitnessOps will confirm fit, scope, payment, and evidence handling by email first.",
        "",
        `Intake ID: ${input.intakeId}`,
        `Issuance ID: ${input.issuanceId}`,
        `Email: ${input.email}`,
        `Expires At: ${input.expiresAt}`,
      ].join("\n"),
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
