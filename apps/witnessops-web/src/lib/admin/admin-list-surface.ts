const NOUNS: ReadonlyArray<readonly [string, string]> = [
  ["/admin/receipts", "receipts"],
  ["/admin/deliveries", "deliveries"],
  ["/admin/proof-runs", "proof runs"],
  ["/admin/customers", "customers"],
  ["/admin/inbox", "inbox messages"],
  ["/admin/review-requests", "review requests"],
];

export function errorTitleForPath(pathname: string): string {
  const noun = NOUNS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "this page";
  return `Could not load ${noun}`;
}
