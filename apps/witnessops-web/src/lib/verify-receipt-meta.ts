export type ReceiptMeta = {
  receiptId?: string;
  issuer?: string;
  createdAt?: string;
  subject?: string;
};

/** Best-effort display fields from pasted receipt JSON (not a security boundary). */
export function extractReceiptMeta(input: string): ReceiptMeta {
  try {
    const parsed = JSON.parse(input) as unknown;
    const root =
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      "receipt" in parsed &&
      (parsed as { receipt: unknown }).receipt &&
      typeof (parsed as { receipt: unknown }).receipt === "object"
        ? (parsed as { receipt: Record<string, unknown> }).receipt
        : (parsed as Record<string, unknown>);

    if (!root || typeof root !== "object") {
      return {};
    }

    const asString = (value: unknown) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined;

    const verificationContext =
      root.verification_context &&
      typeof root.verification_context === "object" &&
      !Array.isArray(root.verification_context)
        ? (root.verification_context as Record<string, unknown>)
        : undefined;
    const contextSubject =
      verificationContext?.subject &&
      typeof verificationContext.subject === "object" &&
      !Array.isArray(verificationContext.subject)
        ? (verificationContext.subject as Record<string, unknown>)
        : undefined;
    const contextTimestamps =
      verificationContext?.timestamps &&
      typeof verificationContext.timestamps === "object" &&
      !Array.isArray(verificationContext.timestamps)
        ? (verificationContext.timestamps as Record<string, unknown>)
        : undefined;

    const subject =
      root.subject && typeof root.subject === "object"
        ? asString((root.subject as { id?: unknown }).id) ??
          asString((root.subject as { name?: unknown }).name)
        : asString(root.subject) ??
          asString(contextSubject?.display_name) ??
          asString(contextSubject?.reference);

    let issuer =
      root.issuer && typeof root.issuer === "object"
        ? asString((root.issuer as { id?: unknown }).id) ??
          asString((root.issuer as { name?: unknown }).name)
        : asString(root.issuer);

    if (!issuer && root.attestation && typeof root.attestation === "object") {
      const att = root.attestation as Record<string, unknown>;
      issuer =
        asString(att.signer_id) ??
        asString(att.issuer) ??
        (att.signer && typeof att.signer === "object"
          ? asString((att.signer as { id?: unknown }).id)
          : undefined);
    }

    return {
      receiptId:
        asString(root.receipt_id) ??
        asString(root.id) ??
        asString(root.proof_run_id),
      issuer,
      createdAt:
        asString(root.created_at) ??
        asString(root.issued_at) ??
        asString(contextTimestamps?.issued_at),
      subject,
    };
  } catch {
    return {};
  }
}
