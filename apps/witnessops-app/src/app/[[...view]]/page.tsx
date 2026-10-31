import { ProductApp } from "../../components/product-app";
import { isAasrStagingBuild } from "../../lib/aasr-staging/config";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (isAasrStagingBuild()) {
    const { AasrStagingEntry } = await import("../../components/aasr-staging-entry");
    return <AasrStagingEntry />;
  }
  return <ProductApp />;
}
