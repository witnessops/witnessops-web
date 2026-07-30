import type { AskWitnessOpsUiAnswer } from "./ask-witnessops-response";

interface Props {
  answer: AskWitnessOpsUiAnswer;
  compact?: boolean;
}

export function AskWitnessOpsReceiptMeta({ answer, compact = false }: Props) {
  if (!answer.receipt_id || answer.receipt_status !== "durable") {
    return null;
  }

  return (
    <p
      className={`text-text-muted ${compact ? "mt-2 text-[10px]" : "mt-3 text-[11px]"}`}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      Receipt recorded: {answer.receipt_id}
    </p>
  );
}