/** Canonical JSON: object keys sorted by UTF-16 code unit, arrays in recorded
 * order, JSON string/number encoding, no whitespace. Reject non-JSON values.
 * This is a source correspondence digest, not a signature or tamper-proof store. */
export function canonicalSource(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonicalSource).join(",")}]`;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalSource((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error("Source must contain only JSON values");
}
