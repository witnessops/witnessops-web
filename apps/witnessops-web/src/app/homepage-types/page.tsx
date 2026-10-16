import type { Metadata } from "next";
import { SimpleHomepage, type HomepageType } from "@/components/marketing/simple-homepage";

export const metadata: Metadata = {
  title: "Homepage types",
  robots: { index: false, follow: false },
};

function homepageType(value: string | undefined): HomepageType {
  if (value === "b" || value === "c") return value;
  return "a";
}

export default async function HomepageTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>;
}) {
  const { home } = await searchParams;
  return <SimpleHomepage type={homepageType(home)} showTypeSwitch />;
}
