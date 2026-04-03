const FREEMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "yandex.com",
  "live.com",
] as const;

export { FREEMAIL_DOMAINS };

export function getEmailDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  return domain.length > 0 ? domain : null;
}

export function isFreemailDomain(domainOrEmail: string): boolean {
  const candidate = domainOrEmail.includes("@")
    ? getEmailDomain(domainOrEmail)
    : domainOrEmail.toLowerCase().trim();

  return candidate !== null && FREEMAIL_DOMAINS.includes(candidate as (typeof FREEMAIL_DOMAINS)[number]);
}

export function isBusinessEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  return domain !== null && !isFreemailDomain(domain);
}
