import type { AskWitnessOpsCommercialFit } from "./ask-witnessops-response";

export function buildAskAiContactScope(
  note: string,
  commercialFit?: AskWitnessOpsCommercialFit,
): string {
  return [
    "Contact path: Ask AI panel handoff",
    ...(commercialFit?.offer_id
      ? [
          `Offer: ${commercialFit.offer_id}`,
          `Commercial fit signal: ${commercialFit.result}`,
          `Commercial intent: ${commercialFit.intent}`,
          `Source: ${commercialFit.source}`,
        ]
      : []),
    `Visitor note: ${note.trim() || "not provided"}`,
    "First-message boundary: no files, secrets, logs, screenshots, credentials, private keys, MFA codes, customer records, or production evidence requested.",
    "Next step: mailbox verification, followed by asynchronous fit and scope review. No review starts from this contact handoff.",
  ].join("\n");
}

export function buildAskAiContactRequest(
  email: string,
  note: string,
  commercialFit?: AskWitnessOpsCommercialFit,
) {
  return {
    email,
    intent: "ask-ai-contact",
    locale: "en",
    scope: buildAskAiContactScope(note, commercialFit),
  } as const;
}
