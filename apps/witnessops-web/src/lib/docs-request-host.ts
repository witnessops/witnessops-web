import { headers } from "next/headers";
import { getSurface } from "@witnessops/config";

import { normalizeHost, toPublicDocsHref } from "@/lib/docs-host-routing";

export async function getDocsRequestHost(): Promise<string> {
  const headerStore = await headers();
  return normalizeHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
}

/** @deprecated Legacy subdomain name; retained for redirect middleware only. */
export async function getDocsHostName(): Promise<string> {
  return getSurface("witnessops")?.docsHost ?? "docs.witnessops.com";
}

/** Map internal /docs hrefs for public use (apex keeps /docs prefix). */
export async function publicDocsHref(href: string): Promise<string> {
  const host = await getDocsRequestHost();
  return toPublicDocsHref(href, host);
}

export async function mapDocsHrefs<T extends { href: string }>(
  items: T[],
): Promise<T[]> {
  const host = await getDocsRequestHost();
  return items.map((item) => ({
    ...item,
    href: toPublicDocsHref(item.href, host),
  }));
}
