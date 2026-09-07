import type { AskWitnessOpsCommercialFit } from "./ask-witnessops-response";
import { BUYER_SERVICES, type BuyerService } from "@/lib/buyer-services";

export const ASK_CONTACT_NOTE_MAX_LENGTH = 1_000;
export const ASK_CONTACT_QUESTION_MAX_LENGTH = 2_000;

export type AskAiContactOptions = {
  includeQuestion?: boolean;
  question?: string;
  serviceId?: BuyerService["id"];
};

export function buildAskAiContactScope(
  note: string,
  commercialFit?: AskWitnessOpsCommercialFit,
  options: AskAiContactOptions = {},
): string {
  const question = options.question?.trim().slice(0, ASK_CONTACT_QUESTION_MAX_LENGTH);
  const service = BUYER_SERVICES.find(
    (candidate) => candidate.id === (options.serviceId ?? commercialFit?.offer_id),
  );
  return [
    "Contact path: Ask AI panel handoff",
    "Source: ask",
    "Follow-up requested: reply by email about this request. No mailing list signup.",
    ...(service
      ? [
          `Offer: ${service.id}`,
          `Offer name: ${service.name.en}`,
        ]
      : []),
    ...(commercialFit && service?.id === commercialFit.offer_id
      ? [
          `Commercial fit signal: ${commercialFit.result}`,
          `Commercial intent: ${commercialFit.intent}`,
        ]
      : []),
    `Visitor note: ${note.trim().slice(0, ASK_CONTACT_NOTE_MAX_LENGTH) || "not provided"}`,
    `Question sharing: ${options.includeQuestion ? "visitor opted in" : "not requested"}`,
    ...(options.includeQuestion && question
      ? [`Visitor-approved question: ${question}`]
      : []),
    "First-message boundary: no files, secrets, logs, screenshots, credentials, private keys, MFA codes, customer records, or production evidence requested.",
    "Next step: mailbox verification, followed by asynchronous fit and scope review. No review starts from this contact handoff.",
  ].join("\n");
}

export function buildAskAiContactRequest(
  email: string,
  note: string,
  commercialFit?: AskWitnessOpsCommercialFit,
  options: AskAiContactOptions = {},
) {
  return {
    email,
    intent: "ask-ai-contact",
    locale: "en",
    scope: buildAskAiContactScope(note, commercialFit, options),
  } as const;
}
