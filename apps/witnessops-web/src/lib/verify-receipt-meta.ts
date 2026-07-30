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

    const subject =
      root.subject && typeof root.subject === "object"
        ? asString((root.subject as { id?: unknown }).id) ??
          asString((root.subject as { name?: unknown }).name)
        : asString(root.subject);

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
      receiptId: asString(root.receipt_id) ?? asString(root.id),
      issuer,
      createdAt: asString(root.created_at) ?? asString(root.issued_at),
      subject,
    };
  } catch {
    return {};
  }
}
