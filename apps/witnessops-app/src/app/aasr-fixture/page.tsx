import { notFound } from "next/navigation";
import { aasrFixtureEnabled } from "../../lib/aasr-fixture/guard";
import { isAasrStagingBuild } from "../../lib/aasr-staging/config";

export const dynamic = "force-dynamic";
export default async function AasrFixturePage() {
  if (!aasrFixtureEnabled()) notFound();
  if (isAasrStagingBuild()) {
    const { AasrStagingEntry } = await import("../../components/aasr-staging-entry");
    return <AasrStagingEntry openFixture />;
  }
  const { AasrFixtureApp } = await import("../../components/aasr-fixture");
  return <AasrFixtureApp />;
}
