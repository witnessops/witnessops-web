export function formatVerificationCode(value: string): string {
  const compact = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  const groups = compact.match(/.{1,4}/g);
  return groups ? groups.join("-") : "";
}

export function formatInitialVerificationCode(value: string): string {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length === 12) {
    return formatVerificationCode(value);
  }
  return value.trim();
}
