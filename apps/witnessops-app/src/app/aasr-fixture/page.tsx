import { notFound } from "next/navigation";
import { aasrFixtureEnabled } from "../../lib/aasr-fixture/guard";

export const dynamic = "force-dynamic";
export default async function AasrFixturePage() {
  if (!aasrFixtureEnabled()) notFound();
  const { AasrFixtureApp } = await import("../../components/aasr-fixture");
  return <AasrFixtureApp />;
}
