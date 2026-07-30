export const PUBLIC_CONTACT_EMAIL = "engage@mail.witnessops.com";
export const PUBLIC_CONTACT_PRIMARY_HREF = "/review/request";
export const PUBLIC_NO_SECRETS_NOTE =
  "Do not send passwords, private keys, API keys, recovery codes, session tokens or other secrets.";

export const PUBLIC_CONTACT_SUBJECTS = {
  general: "WitnessOps request",
  fitCheck: "WitnessOps fit check",
} as const;

export function productContactSubject(productName: string): string {
  return `WitnessOps request — ${productName.trim()}`;
}

export function publicContactMailto(subject: string): string {
  return `mailto:${PUBLIC_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
