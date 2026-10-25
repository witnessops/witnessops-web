export const PUBLIC_CONTACT_EMAIL = "engage@mail.witnessops.com";

/** Buyer-visible sales and review address. Same public mailbox as PUBLIC_CONTACT_EMAIL. */
export const PUBLIC_SALES_REVIEW_EMAIL = PUBLIC_CONTACT_EMAIL;

export const PUBLIC_CONTACT_GENERAL_HREF = "/review/request";
export const PUBLIC_CONTACT_PRIMARY_HREF = PUBLIC_CONTACT_GENERAL_HREF;
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

export function salesReviewMailto(subject?: string): string {
  const href = `mailto:${PUBLIC_SALES_REVIEW_EMAIL}`;
  return subject ? `${href}?subject=${encodeURIComponent(subject)}` : href;
}
