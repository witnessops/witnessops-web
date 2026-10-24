export type ListLoad<T> =
  | { ok: true; rows: readonly T[] }
  | { ok: false; noun: string };

export type ListSurface<T> =
  | { surface: "rows"; rows: readonly T[] }
  | { surface: "empty" }
  | { surface: "error"; title: string; text: string };

const ERROR_TEXT = "The request failed, so this list may not be empty. Nothing was changed.";

const NOUNS: ReadonlyArray<readonly [string, string]> = [
  ["/admin/receipts", "receipts"],
  ["/admin/deliveries", "deliveries"],
  ["/admin/proof-runs", "proof runs"],
  ["/admin/customers", "customers"],
  ["/admin/inbox", "inbox messages"],
  ["/admin/review-requests", "review requests"],
];

export function listSurface<T>(load: ListLoad<T>): ListSurface<T> {
  if (!load.ok) {
    return { surface: "error", title: `Could not load ${load.noun}`, text: ERROR_TEXT };
  }
  if (load.rows.length === 0) return { surface: "empty" };
  return { surface: "rows", rows: load.rows };
}

export function errorTitleForPath(pathname: string): string {
  const noun = NOUNS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "this page";
  return `Could not load ${noun}`;
}
