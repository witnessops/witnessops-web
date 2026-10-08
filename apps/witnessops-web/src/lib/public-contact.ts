/**
 * Operational mailbox default. Gmail sync, mailbox routing, intake
 * notifications and reply-to delivery keep this address; it is not the
 * buyer-facing display contact.
 */
export const PUBLIC_CONTACT_EMAIL = "engage@mail.witnessops.com";
/**
 * Buyer-facing sales and review-engagement contact shown on the homepage,
 * review enquiry and "Discuss a review" surfaces. Displayed addresses and
 * their mailto: links must match. Display approval does not by itself
 * verify the mailbox or change operational routing.
 */
export const PUBLIC_SALES_CONTACT_EMAIL = "karol.stefanski@mail.witnessops.com";
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

export function publicSalesContactMailto(subject: string): string {
  return `mailto:${PUBLIC_SALES_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
