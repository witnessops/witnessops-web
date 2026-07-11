import type { Metadata } from "next";
import Link from "next/link";
import { searchCoreRecords } from "@/lib/server/admin-core-spine";
import { CorePage, CoreTable } from "../../../../components/admin/admin-core-view";

export const metadata: Metadata = { title: "Admin — Search", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
interface PageProps { searchParams: Promise<{ q?: string }> }

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const results = await searchCoreRecords(q);
  return <CorePage title="Search" eyebrow={q ? `Exact and bounded search · ${q}` : "Exact and bounded search"}><CoreTable headers={["Type", "Record", "Matched field"]} rows={results.map((result) => [result.type, <Link href={result.href} key={result.id}>{result.label}</Link>, result.matchedField])} /></CorePage>;
}
